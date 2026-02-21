;; processing-state-sync.clar  (Processing Subnet)
;; Aggregates local state changes and commits a Merkle root to the
;; main chain via the cross-subnet bridge.  Relayers observe this
;; contract to know when new state roots are available to submit.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u1200))
(define-constant ERR-CHECKPOINT-NOT-FOUND (err u1201))
(define-constant ERR-CHECKPOINT-FINALIZED (err u1202))
(define-constant ERR-NO-PENDING-CHANGES (err u1203))
(define-constant ERR-INVALID-BATCH (err u1204))

;; Checkpoint status
(define-constant STATUS-BUILDING u0)
(define-constant STATUS-SEALED u1)
(define-constant STATUS-SUBMITTED u2)
(define-constant STATUS-CONFIRMED u3)

;; How many blocks between forced checkpoints
(define-constant CHECKPOINT-INTERVAL u72)  ;; ~12 hours

;; State
(define-data-var sync-admin principal tx-sender)
(define-data-var next-checkpoint-id uint u1)
(define-data-var last-checkpoint-block uint u0)

;; Checkpoints
(define-map checkpoints
    { checkpoint-id: uint }
    {
        batch-ids: (list 20 uint),       ;; Batches included in this checkpoint
        state-root: (buff 32),           ;; Merkle root of all included batch roots
        status: uint,
        created-at: uint,
        sealed-at: uint,
        submitted-at: uint,
        main-chain-block: uint,          ;; Block when confirmed on main chain
        main-chain-tx: (buff 32)         ;; Main chain tx hash
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-checkpoint (checkpoint-id uint))
    (map-get? checkpoints { checkpoint-id: checkpoint-id })
)

(define-read-only (is-checkpoint-due)
    (>= (- stacks-block-height (var-get last-checkpoint-block)) CHECKPOINT-INTERVAL)
)

;; ─── Checkpoint lifecycle ────────────────────────────────────────────────────

(define-public (create-checkpoint)
    (begin
        (asserts! (is-eq tx-sender (var-get sync-admin)) ERR-NOT-AUTHORIZED)

        (let ((checkpoint-id (var-get next-checkpoint-id)))
            (map-set checkpoints { checkpoint-id: checkpoint-id }
                {
                    batch-ids: (list),
                    state-root: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    status: STATUS-BUILDING,
                    created-at: stacks-block-height,
                    sealed-at: u0,
                    submitted-at: u0,
                    main-chain-block: u0,
                    main-chain-tx: 0x0000000000000000000000000000000000000000000000000000000000000000
                }
            )
            (var-set next-checkpoint-id (+ checkpoint-id u1))
            (ok checkpoint-id)
        )
    )
)

(define-public (add-batch-to-checkpoint (checkpoint-id uint) (batch-id uint))
    (let ((cp (unwrap! (map-get? checkpoints { checkpoint-id: checkpoint-id }) ERR-CHECKPOINT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status cp) STATUS-BUILDING) ERR-CHECKPOINT-FINALIZED)

        (let ((new-batches (unwrap-panic
                (as-max-len? (append (get batch-ids cp) batch-id) u20))))
            (map-set checkpoints { checkpoint-id: checkpoint-id }
                (merge cp { batch-ids: new-batches }))
        )
        (ok true)
    )
)

;; Seal a checkpoint: compute and commit the state root
(define-public (seal-checkpoint (checkpoint-id uint) (state-root (buff 32)))
    (let ((cp (unwrap! (map-get? checkpoints { checkpoint-id: checkpoint-id }) ERR-CHECKPOINT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status cp) STATUS-BUILDING) ERR-CHECKPOINT-FINALIZED)
        (asserts! (> (len (get batch-ids cp)) u0) ERR-NO-PENDING-CHANGES)

        (map-set checkpoints { checkpoint-id: checkpoint-id }
            (merge cp {
                state-root: state-root,
                status: STATUS-SEALED,
                sealed-at: stacks-block-height
            })
        )
        (var-set last-checkpoint-block stacks-block-height)
        (ok true)
    )
)

;; Mark a checkpoint as submitted to the main chain
(define-public (mark-submitted (checkpoint-id uint))
    (let ((cp (unwrap! (map-get? checkpoints { checkpoint-id: checkpoint-id }) ERR-CHECKPOINT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status cp) STATUS-SEALED) ERR-CHECKPOINT-FINALIZED)
        (map-set checkpoints { checkpoint-id: checkpoint-id }
            (merge cp { status: STATUS-SUBMITTED, submitted-at: stacks-block-height }))
        (ok true)
    )
)

;; Confirm a checkpoint was accepted by main chain
(define-public (confirm-checkpoint (checkpoint-id uint) (main-chain-block uint) (main-chain-tx (buff 32)))
    (let ((cp (unwrap! (map-get? checkpoints { checkpoint-id: checkpoint-id }) ERR-CHECKPOINT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status cp) STATUS-SUBMITTED) ERR-CHECKPOINT-FINALIZED)
        (map-set checkpoints { checkpoint-id: checkpoint-id }
            (merge cp {
                status: STATUS-CONFIRMED,
                main-chain-block: main-chain-block,
                main-chain-tx: main-chain-tx
            })
        )
        (ok true)
    )
)

;; Admin
(define-public (set-sync-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get sync-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set sync-admin new-admin))
    )
)
