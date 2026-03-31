;; attestations.clar
;; version: 2.0.0
;; summary: Handles medical lab attestations for genetic data

;; Clarity 4 Helpers
(define-constant MAX_STRING_LENGTH u500)
(define-constant MAX_BUFFER_LENGTH u1024)

;; Error codes mapped to HTTP status
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INVALID-PROOF (err u422))
(define-constant ERR-VERIFICATION-FAILED (err u422))
(define-constant ERR-PROOF-NOT-FOUND (err u404))
(define-constant ERR-INVALID-DATA (err u400))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-VERIFIER-INACTIVE (err u503))
(define-constant ERR-INVALID-PROOF-TYPE (err u400))

;; Error context tracking
(define-map error-context 
    { error-id: uint }
    {
        error-code: uint,
        message: (string-utf8 256),
        context-data: (string-utf8 512),
        timestamp: uint,
        proof-id: uint
    }
)
(define-data-var error-counter uint u0)

;; Error context helper
(define-private (record-error (error-code uint) (message (string-utf8 256)) (context (string-utf8 512)) (proof-id uint))
    (let ((error-id (var-get error-counter)))
        (begin
            (var-set error-counter (+ error-id u1))
            (map-set error-context
                { error-id: error-id }
                {
                    error-code: error-code,
                    message: message,
                    context-data: context,
                    timestamp: stacks-block-height,
                    proof-id: proof-id
                }
            )
            error-id
        )
    )
)

;; Constants for proof types
(define-constant PROOF-TYPE-GENE-PRESENCE u1)
(define-constant PROOF-TYPE-GENE-ABSENCE u2)
(define-constant PROOF-TYPE-GENE-VARIANT u3)
(define-constant PROOF-TYPE-AGGREGATE u4)

;; Data structures
(define-map proof-verifiers
    { verifier-id: uint }
    {
        address: principal,
        name: (string-utf8 64),
        active: bool,
        verification-count: uint,
        added-at: uint
    }
)

(define-map proof-registry
    { proof-id: uint }
    {
        data-id: uint,
        proof-type: uint,
        proof-hash: (buff 32),
        parameters: (buff 1024),
        creator: principal,
        verified: bool,
        verifier: (optional uint),
        created-at: uint,
        metadata: (string-utf8 500),
        verification-attempts: uint,
        last-verified: (optional uint),
        updated-at: uint
    }
)

(define-map verification-results
    { proof-id: uint }
    {
        result: bool,
        verifier: uint,
        verified-at: uint,
        verification-tx: (buff 32)
    }
)

(define-map data-proofs
    { data-id: uint, proof-type: uint }
    { proof-ids: (list 10 uint) }
)

;; Counters
(define-data-var next-verifier-id uint u1)
(define-data-var next-proof-id uint u1)
(define-data-var contract-owner principal tx-sender)

;; Administrative functions
(define-public (register-verifier (name (string-utf8 64)) (verifier-address principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (let ((verifier-id (var-get next-verifier-id)))
            (var-set next-verifier-id (+ verifier-id u1))
            (map-set proof-verifiers
                { verifier-id: verifier-id }
                {
                    address: verifier-address,
                    name: name,
                    active: true,
                    verification-count: u0,
                    added-at: stacks-block-height
                }
            )
            (ok verifier-id)
        )
    )
)

(define-public (deactivate-verifier (verifier-id uint))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (let ((verifier (unwrap! (map-get? proof-verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND)))
            (ok (map-set proof-verifiers
                { verifier-id: verifier-id }
                (merge verifier { active: false })
            ))
        )
    )
)

;; Register proof
(define-public (register-proof 
    (data-id uint) 
    (proof-type uint) 
    (proof-hash (buff 32)) 
    (parameters (buff 1024))
    (metadata (optional (string-utf8 500))))
    (let (
        (valid-type? (or 
            (is-eq proof-type PROOF-TYPE-GENE-PRESENCE)
            (is-eq proof-type PROOF-TYPE-GENE-ABSENCE)
            (is-eq proof-type PROOF-TYPE-GENE-VARIANT)
            (is-eq proof-type PROOF-TYPE-AGGREGATE)
        )))
        (asserts! valid-type? ERR-INVALID-PROOF-TYPE)
        (let (
            (pid (var-get next-proof-id))
            (safe-meta (default-to u"" metadata))
        )
            (var-set next-proof-id (+ pid u1))
            (if (map-insert proof-registry
                { proof-id: pid }
                {
                    data-id: data-id,
                    proof-type: proof-type,
                    proof-hash: proof-hash,
                    parameters: parameters,
                    creator: tx-sender,
                    verified: false,
                    verifier: none,
                    created-at: stacks-block-height,
                    metadata: safe-meta,
                    verification-attempts: u0,
                    last-verified: none,
                    updated-at: stacks-block-height
                }
            )
                (begin
                    (match (map-get? data-proofs { data-id: data-id, proof-type: proof-type })
                        existing (map-set data-proofs
                            { data-id: data-id, proof-type: proof-type }
                            { proof-ids: (unwrap! (as-max-len? (append (get proof-ids existing) pid) u10) ERR-INVALID-DATA) }
                        )
                        (map-set data-proofs
                            { data-id: data-id, proof-type: proof-type }
                            { proof-ids: (list pid) }
                        )
                    )
                    (ok (print { 
                        event: "proof-registered", 
                        proof-id: pid, 
                        data-id: data-id,
                        proof-type: proof-type,
                        by: tx-sender,
                        block: stacks-block-height,
                        metadata: safe-meta
                    }))
                )
                ERR-ALREADY-EXISTS
            )
        )
    )
)

;; Verify proof
(define-public (verify-proof (proof-id uint) (verifier-id uint) (verification-tx (buff 32)))
    (let (
        (proof (unwrap! (map-get? proof-registry { proof-id: proof-id }) ERR-PROOF-NOT-FOUND))
        (verifier (unwrap! (map-get? proof-verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND))
    )
        (asserts! (get active verifier) ERR-VERIFIER-INACTIVE)
        (asserts! (is-eq tx-sender (get address verifier)) ERR-NOT-AUTHORIZED)
        
        (map-set proof-verifiers
            { verifier-id: verifier-id }
            (merge verifier { verification-count: (+ (get verification-count verifier) u1) })
        )
        
        (map-set verification-results
            { proof-id: proof-id }
            {
                result: true,
                verifier: verifier-id,
                verified-at: stacks-block-height,
                verification-tx: verification-tx
            }
        )
        
        (ok (map-set proof-registry
            { proof-id: proof-id }
            (merge proof { 
                verified: true, 
                verifier: (some verifier-id),
                last-verified: (some stacks-block-height),
                verification-attempts: (+ (get verification-attempts proof) u1),
                updated-at: stacks-block-height
            })
        ))
    )
)

;; Report failure
(define-public (report-verification-failure (proof-id uint) (verifier-id uint) (verification-tx (buff 32)))
    (let (
        (proof (unwrap! (map-get? proof-registry { proof-id: proof-id }) ERR-PROOF-NOT-FOUND))
        (verifier (unwrap! (map-get? proof-verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND))
    )
        (asserts! (get active verifier) ERR-VERIFIER-INACTIVE)
        (asserts! (is-eq tx-sender (get address verifier)) ERR-NOT-AUTHORIZED)
        
        (map-set proof-verifiers
            { verifier-id: verifier-id }
            (merge verifier { verification-count: (+ (get verification-count verifier) u1) })
        )
        
        (map-set verification-results
            { proof-id: proof-id }
            {
                result: false,
                verifier: verifier-id,
                verified-at: stacks-block-height,
                verification-tx: verification-tx
            }
        )

        (ok (map-set proof-registry
            { proof-id: proof-id }
            (merge proof { 
                verification-attempts: (+ (get verification-attempts proof) u1),
                updated-at: stacks-block-height
            })
        ))
    )
)

;; Helper function to check if a proof is verified
(define-private (is-proof-verified (proof-id uint))
    (match (map-get? proof-registry { proof-id: proof-id })
        proof (get verified proof)
        false
    )
)

(define-public (check-verified-proof (data-id uint) (proof-type uint))
    (match (map-get? data-proofs { data-id: data-id, proof-type: proof-type })
        proof-list (ok (filter is-proof-verified (get proof-ids proof-list)))
        (ok (list))
    )
)

(define-read-only (get-proofs-by-data-id (data-id uint) (proof-type uint))
    (match (map-get? data-proofs { data-id: data-id, proof-type: proof-type })
        proof-list (ok (get proof-ids proof-list))
        (err ERR-NOT-FOUND)
    )
)

(define-read-only (get-verifier (verifier-id uint))
    (map-get? proof-verifiers { verifier-id: verifier-id })
)

(define-read-only (get-proof (proof-id uint))
    (map-get? proof-registry { proof-id: proof-id })
)

(define-read-only (get-verification-result (proof-id uint))
    (map-get? verification-results { proof-id: proof-id })
)

(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
