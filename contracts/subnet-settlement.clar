;; subnet-settlement.clar
;; Handles final settlements from subnets onto the main chain.
;; When a subnet completes a batch of operations (analysis jobs, storage
;; updates) the results are settled here, updating authoritative state.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u500))
(define-constant ERR-SETTLEMENT-NOT-FOUND (err u501))
(define-constant ERR-SETTLEMENT-ALREADY-FINALIZED (err u502))
(define-constant ERR-PROOF-NOT-VERIFIED (err u503))
(define-constant ERR-INVALID-SETTLEMENT-TYPE (err u504))
(define-constant ERR-INSUFFICIENT-STAKE (err u505))
(define-constant ERR-CHALLENGE-PERIOD-ACTIVE (err u506))
(define-constant ERR-CHALLENGE-PERIOD-EXPIRED (err u507))

;; Settlement type constants
(define-constant SETTLEMENT-TYPE-PROCESSING u1)   ;; Analysis results from processing subnet
(define-constant SETTLEMENT-TYPE-STORAGE u2)      ;; Storage confirmations from storage subnet

;; Settlement status constants
(define-constant STATUS-PENDING u0)
(define-constant STATUS-CHALLENGE-PERIOD u1)
(define-constant STATUS-FINALIZED u2)
(define-constant STATUS-CHALLENGED u3)
(define-constant STATUS-REJECTED u4)

;; Challenge period in blocks (~1 day)
(define-constant CHALLENGE-PERIOD-BLOCKS u144)

;; Admin / state
(define-data-var settlement-admin principal tx-sender)
(define-data-var next-settlement-id uint u1)

;; Pending and finalised settlements
(define-map settlements
    { settlement-id: uint }
    {
        subnet-id: uint,
        settlement-type: uint,
        data-id: uint,
        proof-id: uint,              ;; Verified proof backing this settlement
        result-hash: (buff 32),      ;; Hash of the result data
        result-summary: (buff 256),  ;; Summary / metadata of the result
        submitter: principal,
        status: uint,
        submitted-at: uint,
        challenge-deadline: uint,
        finalized-at: uint
    }
)

;; Challenges against settlements
(define-map challenges
    { settlement-id: uint, challenger: principal }
    {
        reason: (string-utf8 256),
        evidence-hash: (buff 32),
        challenged-at: uint,
        resolved: bool
    }
)

;; Settled results written back to dataset records
(define-map settlement-results
    { data-id: uint }
    {
        latest-settlement-id: uint,
        analysis-result-hash: (buff 32),
        storage-cid: (buff 64),
        last-updated: uint
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-settlement (settlement-id uint))
    (map-get? settlements { settlement-id: settlement-id })
)

(define-read-only (get-settlement-result (data-id uint))
    (map-get? settlement-results { data-id: data-id })
)

(define-read-only (get-challenge (settlement-id uint) (challenger principal))
    (map-get? challenges { settlement-id: settlement-id, challenger: challenger })
)

;; ─── Settlement submission ───────────────────────────────────────────────────

(define-public (submit-settlement
    (subnet-id uint)
    (settlement-type uint)
    (data-id uint)
    (proof-id uint)
    (result-hash (buff 32))
    (result-summary (buff 256)))

    (begin
        (asserts! (and (>= settlement-type u1) (<= settlement-type u2)) ERR-INVALID-SETTLEMENT-TYPE)
        ;; Submitter must be an authorised relayer for the subnet
        (asserts!
            (contract-call? .subnet-registry is-authorized-relayer subnet-id tx-sender)
            ERR-NOT-AUTHORIZED)

        ;; Backing proof must already be verified
        (asserts! (contract-call? .cross-chain-proof-verifier is-proof-verified proof-id) ERR-PROOF-NOT-VERIFIED)

        (let ((settlement-id (var-get next-settlement-id)))
            (map-set settlements
                { settlement-id: settlement-id }
                {
                    subnet-id: subnet-id,
                    settlement-type: settlement-type,
                    data-id: data-id,
                    proof-id: proof-id,
                    result-hash: result-hash,
                    result-summary: result-summary,
                    submitter: tx-sender,
                    status: STATUS-CHALLENGE-PERIOD,
                    submitted-at: stacks-block-height,
                    challenge-deadline: (+ stacks-block-height CHALLENGE-PERIOD-BLOCKS),
                    finalized-at: u0
                }
            )
            (var-set next-settlement-id (+ settlement-id u1))
            (ok settlement-id)
        )
    )
)

;; ─── Challenge mechanism ─────────────────────────────────────────────────────

(define-public (challenge-settlement
    (settlement-id uint)
    (reason (string-utf8 256))
    (evidence-hash (buff 32)))

    (let ((s (unwrap! (map-get? settlements { settlement-id: settlement-id }) ERR-SETTLEMENT-NOT-FOUND)))
        (asserts! (is-eq (get status s) STATUS-CHALLENGE-PERIOD) ERR-SETTLEMENT-ALREADY-FINALIZED)
        (asserts! (< stacks-block-height (get challenge-deadline s)) ERR-CHALLENGE-PERIOD-EXPIRED)

        (map-set challenges
            { settlement-id: settlement-id, challenger: tx-sender }
            {
                reason: reason,
                evidence-hash: evidence-hash,
                challenged-at: stacks-block-height,
                resolved: false
            }
        )

        (map-set settlements { settlement-id: settlement-id }
            (merge s { status: STATUS-CHALLENGED }))
        (ok true)
    )
)

;; ─── Finalization ────────────────────────────────────────────────────────────

;; Finalize a settlement after challenge period expires with no challenges
(define-public (finalize-settlement (settlement-id uint))
    (let ((s (unwrap! (map-get? settlements { settlement-id: settlement-id }) ERR-SETTLEMENT-NOT-FOUND)))
        (asserts! (is-eq (get status s) STATUS-CHALLENGE-PERIOD) ERR-SETTLEMENT-ALREADY-FINALIZED)
        (asserts! (>= stacks-block-height (get challenge-deadline s)) ERR-CHALLENGE-PERIOD-ACTIVE)

        (map-set settlements { settlement-id: settlement-id }
            (merge s {
                status: STATUS-FINALIZED,
                finalized-at: stacks-block-height
            })
        )

        ;; Write result to settlement-results
        (map-set settlement-results
            { data-id: (get data-id s) }
            {
                latest-settlement-id: settlement-id,
                analysis-result-hash: (get result-hash s),
                storage-cid: 0x,
                last-updated: stacks-block-height
            }
        )

        (ok true)
    )
)

;; Admin resolves a challenged settlement
(define-public (resolve-challenge
    (settlement-id uint)
    (accept bool))  ;; true = accept settlement despite challenge, false = reject

    (let ((s (unwrap! (map-get? settlements { settlement-id: settlement-id }) ERR-SETTLEMENT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get settlement-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status s) STATUS-CHALLENGED) ERR-SETTLEMENT-NOT-FOUND)

        (if accept
            (begin
                (map-set settlements { settlement-id: settlement-id }
                    (merge s { status: STATUS-FINALIZED, finalized-at: stacks-block-height }))
                (map-set settlement-results
                    { data-id: (get data-id s) }
                    {
                        latest-settlement-id: settlement-id,
                        analysis-result-hash: (get result-hash s),
                        storage-cid: 0x,
                        last-updated: stacks-block-height
                    }
                )
            )
            (map-set settlements { settlement-id: settlement-id }
                (merge s { status: STATUS-REJECTED }))
        )
        (ok true)
    )
)

(define-public (set-settlement-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get settlement-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set settlement-admin new-admin))
    )
)
