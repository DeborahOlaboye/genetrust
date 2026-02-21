;; batch-processor.clar  (Processing Subnet)
;; Aggregates many analysis jobs into a single batch for gas-efficient
;; processing and a single Merkle root commitment to the main chain.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u800))
(define-constant ERR-BATCH-NOT-FOUND (err u801))
(define-constant ERR-BATCH-CLOSED (err u802))
(define-constant ERR-BATCH-FULL (err u803))
(define-constant ERR-INVALID-STATUS (err u804))
(define-constant ERR-JOB-ALREADY-IN-BATCH (err u805))
(define-constant ERR-EMPTY-BATCH (err u806))

;; Batch status
(define-constant BATCH-STATUS-OPEN u0)
(define-constant BATCH-STATUS-PROCESSING u1)
(define-constant BATCH-STATUS-COMPLETED u2)
(define-constant BATCH-STATUS-SETTLED u3)
(define-constant BATCH-STATUS-FAILED u4)

;; Limits
(define-constant MAX-JOBS-PER-BATCH u50)

;; State
(define-data-var batch-admin principal tx-sender)
(define-data-var next-batch-id uint u1)
(define-data-var current-open-batch uint u0)  ;; 0 = none open

;; Batch records
(define-map batches
    { batch-id: uint }
    {
        job-ids: (list 50 uint),
        job-count: uint,
        status: uint,
        merkle-root: (buff 32),       ;; Root of all job result hashes
        batch-result-hash: (buff 32), ;; Hash of aggregated results
        settlement-id: uint,          ;; Main-chain settlement-id once settled
        created-at: uint,
        processing-started-at: uint,
        completed-at: uint,
        processor: principal
    }
)

;; Prevent duplicate job entries across batches
(define-map job-to-batch
    { job-id: uint }
    { batch-id: uint }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-batch (batch-id uint))
    (map-get? batches { batch-id: batch-id })
)

(define-read-only (get-batch-for-job (job-id uint))
    (map-get? job-to-batch { job-id: job-id })
)

(define-read-only (get-current-open-batch)
    (var-get current-open-batch)
)

;; ─── Batch lifecycle ─────────────────────────────────────────────────────────

;; Create a new open batch
(define-public (create-batch)
    (begin
        (asserts! (is-eq tx-sender (var-get batch-admin)) ERR-NOT-AUTHORIZED)

        (let ((batch-id (var-get next-batch-id)))
            (map-set batches { batch-id: batch-id }
                {
                    job-ids: (list),
                    job-count: u0,
                    status: BATCH-STATUS-OPEN,
                    merkle-root: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    batch-result-hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    settlement-id: u0,
                    created-at: stacks-block-height,
                    processing-started-at: u0,
                    completed-at: u0,
                    processor: tx-sender
                }
            )
            (var-set next-batch-id (+ batch-id u1))
            (var-set current-open-batch batch-id)
            (ok batch-id)
        )
    )
)

;; Add a job to the current open batch
(define-public (add-job-to-batch (batch-id uint) (job-id uint))
    (let ((batch (unwrap! (map-get? batches { batch-id: batch-id }) ERR-BATCH-NOT-FOUND)))
        (asserts! (is-eq (get status batch) BATCH-STATUS-OPEN) ERR-BATCH-CLOSED)
        (asserts! (< (get job-count batch) MAX-JOBS-PER-BATCH) ERR-BATCH-FULL)
        (asserts! (is-none (map-get? job-to-batch { job-id: job-id })) ERR-JOB-ALREADY-IN-BATCH)

        (let ((new-job-ids (unwrap-panic
                (as-max-len? (append (get job-ids batch) job-id) u50))))
            (map-set batches { batch-id: batch-id }
                (merge batch {
                    job-ids: new-job-ids,
                    job-count: (+ (get job-count batch) u1)
                })
            )
        )
        (map-set job-to-batch { job-id: job-id } { batch-id: batch-id })
        (ok true)
    )
)

;; Close and begin processing a batch
(define-public (start-batch-processing (batch-id uint))
    (let ((batch (unwrap! (map-get? batches { batch-id: batch-id }) ERR-BATCH-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get batch-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status batch) BATCH-STATUS-OPEN) ERR-INVALID-STATUS)
        (asserts! (> (get job-count batch) u0) ERR-EMPTY-BATCH)

        (map-set batches { batch-id: batch-id }
            (merge batch {
                status: BATCH-STATUS-PROCESSING,
                processing-started-at: stacks-block-height,
                processor: tx-sender
            })
        )
        ;; Clear the open batch slot if this was the current one
        (if (is-eq (var-get current-open-batch) batch-id)
            (var-set current-open-batch u0)
            false
        )
        (ok true)
    )
)

;; Complete a batch with aggregated Merkle root and result hash
(define-public (complete-batch
    (batch-id uint)
    (merkle-root (buff 32))
    (batch-result-hash (buff 32)))

    (let ((batch (unwrap! (map-get? batches { batch-id: batch-id }) ERR-BATCH-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get processor batch)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status batch) BATCH-STATUS-PROCESSING) ERR-INVALID-STATUS)

        (map-set batches { batch-id: batch-id }
            (merge batch {
                status: BATCH-STATUS-COMPLETED,
                merkle-root: merkle-root,
                batch-result-hash: batch-result-hash,
                completed-at: stacks-block-height
            })
        )
        (ok true)
    )
)

;; Record the main-chain settlement-id once the batch is settled
(define-public (record-settlement (batch-id uint) (settlement-id uint))
    (let ((batch (unwrap! (map-get? batches { batch-id: batch-id }) ERR-BATCH-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get batch-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status batch) BATCH-STATUS-COMPLETED) ERR-INVALID-STATUS)

        (map-set batches { batch-id: batch-id }
            (merge batch { status: BATCH-STATUS-SETTLED, settlement-id: settlement-id }))
        (ok true)
    )
)

;; Admin
(define-public (set-batch-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get batch-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set batch-admin new-admin))
    )
)
