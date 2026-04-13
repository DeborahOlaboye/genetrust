;; attestations.clar
;; Medical lab attestations for genetic data - verify data properties without revealing raw data

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-HASH (err u403))
(define-constant ERR-INVALID-METADATA (err u404))
(define-constant ERR-INVALID-PROOF-TYPE (err u405))
(define-constant ERR-INVALID-STRING-LENGTH (err u407))
(define-constant ERR-INVALID-BUFFER-SIZE (err u408))
(define-constant ERR-INVALID-PARAMETERS (err u409))

;; Errors - Authorization (410-414)
(define-constant ERR-NOT-AUTHORIZED (err u410))
(define-constant ERR-NOT-OWNER (err u411))
(define-constant ERR-NOT-CONTRACT-OWNER (err u413))
(define-constant ERR-NOT-VERIFIER (err u414))

;; Errors - Not Found (430-439)
(define-constant ERR-NOT-FOUND (err u430))
(define-constant ERR-PROOF-NOT-FOUND (err u433))
(define-constant ERR-VERIFIER-NOT-FOUND (err u434))

;; Errors - Conflict (440-449)
(define-constant ERR-ALREADY-EXISTS (err u440))
(define-constant ERR-DUPLICATE-ACCESS-GRANT (err u444))

;; Errors - Service Unavailable (503-511)
(define-constant ERR-VERIFIER-INACTIVE (err u503))
(define-constant ERR-CONTRACT-PAUSED (err u511))

;; Proof type constants
(define-constant PROOF-GENE-PRESENCE u1)
(define-constant PROOF-GENE-ABSENCE u2)
(define-constant PROOF-GENE-VARIANT u3)
(define-constant PROOF-AGGREGATE u4)

;; Admin
(define-data-var contract-owner principal tx-sender)

;; Counters
(define-data-var next-verifier-id uint u1)
(define-data-var next-proof-id uint u1)

;; Registered trusted verifiers (e.g. medical labs)
(define-map verifiers
    { verifier-id: uint }
    {
        address: principal,
        name: (string-utf8 64),
        active: bool,
        added-at: uint
    }
)

;; Proof registry - one entry per proof
(define-map proofs
    { proof-id: uint }
    {
        data-id: uint,
        proof-type: uint,
        proof-hash: (buff 32),
        parameters: (buff 256),
        creator: principal,
        verified: bool,
        verifier-id: (optional uint),
        created-at: uint,
        metadata: (string-utf8 200)
    }
)

;; Register a trusted verifier (contract owner only)
(define-public (register-verifier (name (string-utf8 64)) (verifier-address principal))
    (let ((verifier-id (var-get next-verifier-id)))
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)
        (asserts! (not (is-eq verifier-address (as-contract tx-sender))) ERR-INVALID-INPUT)
        (map-set verifiers { verifier-id: verifier-id }
            {
                address: verifier-address,
                name: name,
                active: true,
                added-at: stacks-block-height
            }
        )
        (var-set next-verifier-id (+ verifier-id u1))
        (ok verifier-id)
    )
)

;; Deactivate a verifier (contract owner only)
(define-public (deactivate-verifier (verifier-id uint))
    (let ((v (unwrap! (map-get? verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (asserts! (> verifier-id u0) ERR-INVALID-INPUT)
        (map-set verifiers { verifier-id: verifier-id } (merge v { active: false }))
        (ok true)
    )
)

;; Submit an attestation proof for a dataset
(define-public (register-proof
    (data-id uint)
    (proof-type uint)
    (proof-hash (buff 32))
    (parameters (buff 256))
    (metadata (string-utf8 200)))
    (let ((proof-id (var-get next-proof-id)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (> (len proof-hash) u0) ERR-INVALID-INPUT)
        (asserts! (> (len parameters) u0) ERR-INVALID-INPUT)
        (asserts! (<= (len metadata) u200) ERR-INVALID-INPUT)
        (asserts!
            (or (is-eq proof-type PROOF-GENE-PRESENCE)
                (is-eq proof-type PROOF-GENE-ABSENCE)
                (is-eq proof-type PROOF-GENE-VARIANT)
                (is-eq proof-type PROOF-AGGREGATE))
            ERR-INVALID-INPUT)
        (map-set proofs { proof-id: proof-id }
            {
                data-id: data-id,
                proof-type: proof-type,
                proof-hash: proof-hash,
                parameters: parameters,
                creator: tx-sender,
                verified: false,
                verifier-id: none,
                created-at: stacks-block-height,
                metadata: metadata
            }
        )
        (var-set next-proof-id (+ proof-id u1))
        (ok proof-id)
    )
)

;; Verify a proof (verifier must be the tx-sender and active)
(define-public (verify-proof (proof-id uint) (verifier-id uint))
    (let (
        (proof (unwrap! (map-get? proofs { proof-id: proof-id }) ERR-NOT-FOUND))
        (v (unwrap! (map-get? verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND))
    )
        (asserts! (> proof-id u0) ERR-INVALID-INPUT)
        (asserts! (> verifier-id u0) ERR-INVALID-INPUT)
        (asserts! (get active v) ERR-VERIFIER-INACTIVE)
        (asserts! (is-eq tx-sender (get address v)) ERR-NOT-AUTHORIZED)
        (map-set proofs { proof-id: proof-id }
            (merge proof { verified: true, verifier-id: (some verifier-id) })
        )
        (ok true)
    )
)

;; Transfer contract ownership
(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (asserts! (not (is-eq new-owner (as-contract tx-sender))) ERR-INVALID-INPUT)
        (ok (var-set contract-owner new-owner))
    )
)

;; Read: get proof details
(define-read-only (get-proof (proof-id uint))
    (map-get? proofs { proof-id: proof-id })
)

;; Read: get verifier details
(define-read-only (get-verifier (verifier-id uint))
    (map-get? verifiers { verifier-id: verifier-id })
)

;; Read: check if a proof is verified
(define-read-only (is-verified (proof-id uint))
    (match (map-get? proofs { proof-id: proof-id })
        proof (ok (get verified proof))
        (ok false)
    )
)

;; Read: get next proof-id (useful for frontend)
(define-read-only (get-next-proof-id)
    (ok (var-get next-proof-id))
)
