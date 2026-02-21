;; cross-chain-proof-verifier.clar
;; Verifies ZK proofs and computation proofs submitted from subnets.
;; Proofs are anchored to state roots held by the cross-subnet-bridge contract.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u400))
(define-constant ERR-PROOF-NOT-FOUND (err u401))
(define-constant ERR-PROOF-ALREADY-VERIFIED (err u402))
(define-constant ERR-INVALID-PROOF (err u403))
(define-constant ERR-SUBNET-NOT-FOUND (err u404))
(define-constant ERR-INVALID-PROOF-TYPE (err u405))
(define-constant ERR-EXPIRED-PROOF (err u406))

;; Proof type constants
(define-constant PROOF-TYPE-ZK u1)           ;; Zero-knowledge proof
(define-constant PROOF-TYPE-COMPUTATION u2)  ;; General computation proof
(define-constant PROOF-TYPE-STORAGE u3)      ;; Storage inclusion proof

;; Proof status constants
(define-constant PROOF-STATUS-PENDING u0)
(define-constant PROOF-STATUS-VERIFIED u1)
(define-constant PROOF-STATUS-REJECTED u2)

;; Proof expiry (blocks)
(define-constant PROOF-EXPIRY-BLOCKS u1440)  ;; ~10 days

;; Admin
(define-data-var verifier-admin principal tx-sender)
(define-data-var next-proof-id uint u1)

;; Submitted proofs awaiting or having undergone verification
(define-map proofs
    { proof-id: uint }
    {
        subnet-id: uint,
        proof-type: uint,
        data-id: uint,               ;; Associated genetic dataset
        proof-hash: (buff 32),       ;; Hash of the raw proof bytes
        proof-data: (buff 1024),     ;; Compressed proof bytes
        public-inputs: (buff 256),   ;; Public inputs for ZK proof
        state-root: (buff 32),       ;; State root at time of submission
        submitter: principal,
        status: uint,
        submitted-at: uint,
        verified-at: uint,
        verifier: principal
    }
)

;; Index by data-id for fast lookup
(define-map proofs-by-data-id
    { data-id: uint }
    { proof-ids: (list 50 uint) }
)

;; Index verified proofs per dataset
(define-map verified-proofs-by-data-id
    { data-id: uint }
    { proof-ids: (list 50 uint) }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-proof (proof-id uint))
    (map-get? proofs { proof-id: proof-id })
)

(define-read-only (get-proofs-for-dataset (data-id uint))
    (map-get? proofs-by-data-id { data-id: data-id })
)

(define-read-only (get-verified-proofs-for-dataset (data-id uint))
    (map-get? verified-proofs-by-data-id { data-id: data-id })
)

(define-read-only (is-proof-verified (proof-id uint))
    (match (map-get? proofs { proof-id: proof-id })
        p (is-eq (get status p) PROOF-STATUS-VERIFIED)
        false
    )
)

;; Check if a dataset has at least one verified proof of a given type
(define-read-only (has-verified-proof-of-type (data-id uint) (proof-type uint))
    (match (map-get? verified-proofs-by-data-id { data-id: data-id })
        idx (> (len (get proof-ids idx)) u0)
        false
    )
)

;; ─── Proof submission ────────────────────────────────────────────────────────

(define-public (submit-proof
    (subnet-id uint)
    (proof-type uint)
    (data-id uint)
    (proof-hash (buff 32))
    (proof-data (buff 1024))
    (public-inputs (buff 256))
    (state-root (buff 32)))

    (begin
        (asserts! (and (>= proof-type u1) (<= proof-type u3)) ERR-INVALID-PROOF-TYPE)
        ;; Subnet must be active
        (asserts! (contract-call? .subnet-registry is-subnet-active subnet-id) ERR-SUBNET-NOT-FOUND)

        (let ((proof-id (var-get next-proof-id)))
            (map-set proofs
                { proof-id: proof-id }
                {
                    subnet-id: subnet-id,
                    proof-type: proof-type,
                    data-id: data-id,
                    proof-hash: proof-hash,
                    proof-data: proof-data,
                    public-inputs: public-inputs,
                    state-root: state-root,
                    submitter: tx-sender,
                    status: PROOF-STATUS-PENDING,
                    submitted-at: stacks-block-height,
                    verified-at: u0,
                    verifier: tx-sender
                }
            )

            ;; Update data-id index
            (let ((existing (default-to { proof-ids: (list) }
                    (map-get? proofs-by-data-id { data-id: data-id }))))
                (map-set proofs-by-data-id { data-id: data-id }
                    { proof-ids: (unwrap-panic (as-max-len? (append (get proof-ids existing) proof-id) u50)) })
            )

            (var-set next-proof-id (+ proof-id u1))
            (ok proof-id)
        )
    )
)

;; ─── Proof verification ──────────────────────────────────────────────────────

;; Verify a submitted proof (called by authorised verifiers / admin)
(define-public (verify-proof (proof-id uint))
    (let ((p (unwrap! (map-get? proofs { proof-id: proof-id }) ERR-PROOF-NOT-FOUND)))
        ;; Only admin or authorised relayers may verify
        (asserts!
            (or
                (is-eq tx-sender (var-get verifier-admin))
                (contract-call? .subnet-registry is-authorized-relayer (get subnet-id p) tx-sender))
            ERR-NOT-AUTHORIZED)

        (asserts! (is-eq (get status p) PROOF-STATUS-PENDING) ERR-PROOF-ALREADY-VERIFIED)

        ;; Check expiry
        (asserts!
            (< stacks-block-height (+ (get submitted-at p) PROOF-EXPIRY-BLOCKS))
            ERR-EXPIRED-PROOF)

        ;; Verify state root matches what the bridge has
        (let ((bridge-root-result (contract-call? .cross-subnet-bridge get-subnet-state-root (get subnet-id p))))
            (asserts! (is-ok bridge-root-result) ERR-INVALID-PROOF)
            (asserts!
                (is-eq (get state-root p) (unwrap-panic bridge-root-result))
                ERR-INVALID-PROOF)
        )

        ;; Mark verified
        (map-set proofs { proof-id: proof-id }
            (merge p {
                status: PROOF-STATUS-VERIFIED,
                verified-at: stacks-block-height,
                verifier: tx-sender
            })
        )

        ;; Update verified index
        (let ((existing (default-to { proof-ids: (list) }
                (map-get? verified-proofs-by-data-id { data-id: (get data-id p) }))))
            (map-set verified-proofs-by-data-id { data-id: (get data-id p) }
                { proof-ids: (unwrap-panic (as-max-len? (append (get proof-ids existing) proof-id) u50)) })
        )

        (ok true)
    )
)

;; Reject a proof (e.g. invalid, expired)
(define-public (reject-proof (proof-id uint))
    (let ((p (unwrap! (map-get? proofs { proof-id: proof-id }) ERR-PROOF-NOT-FOUND)))
        (asserts!
            (or
                (is-eq tx-sender (var-get verifier-admin))
                (contract-call? .subnet-registry is-authorized-relayer (get subnet-id p) tx-sender))
            ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status p) PROOF-STATUS-PENDING) ERR-PROOF-ALREADY-VERIFIED)

        (map-set proofs { proof-id: proof-id }
            (merge p { status: PROOF-STATUS-REJECTED }))
        (ok true)
    )
)

;; Admin
(define-public (set-verifier-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get verifier-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set verifier-admin new-admin))
    )
)
