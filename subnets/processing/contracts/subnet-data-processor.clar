;; subnet-data-processor.clar  (Processing Subnet)
;; Coordinates genetic data analysis jobs running inside the processing subnet.
;; Jobs are submitted by authorised researchers, executed off-chain, and
;; results are committed here before being bridged back to the main chain.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u600))
(define-constant ERR-JOB-NOT-FOUND (err u601))
(define-constant ERR-JOB-ALREADY-EXISTS (err u602))
(define-constant ERR-JOB-NOT-PENDING (err u603))
(define-constant ERR-INVALID-ANALYSIS-TYPE (err u604))
(define-constant ERR-INVALID-PARAMETERS (err u605))
(define-constant ERR-JOB-EXPIRED (err u606))
(define-constant ERR-MAX-CONCURRENT-JOBS (err u607))

;; Analysis type constants
(define-constant ANALYSIS-SNP u1)           ;; Single nucleotide polymorphism analysis
(define-constant ANALYSIS-GWAS u2)          ;; Genome-wide association study
(define-constant ANALYSIS-ANCESTRY u3)      ;; Ancestry composition
(define-constant ANALYSIS-PHARMACOGENOMICS u4) ;; Drug response prediction
(define-constant ANALYSIS-RISK-SCORE u5)    ;; Polygenic risk score

;; Job status constants
(define-constant JOB-STATUS-QUEUED u0)
(define-constant JOB-STATUS-RUNNING u1)
(define-constant JOB-STATUS-COMPLETED u2)
(define-constant JOB-STATUS-FAILED u3)
(define-constant JOB-STATUS-CANCELLED u4)

;; Limits
(define-constant MAX-CONCURRENT-JOBS u100)
(define-constant JOB-EXPIRY-BLOCKS u2880)   ;; ~20 days

;; Admin / counters
(define-data-var processor-admin principal tx-sender)
(define-data-var next-job-id uint u1)
(define-data-var active-job-count uint u0)

;; Analysis jobs
(define-map analysis-jobs
    { job-id: uint }
    {
        data-id: uint,
        requester: principal,
        analysis-type: uint,
        parameters: (buff 512),       ;; Encoded analysis parameters
        priority: uint,               ;; 1 (low) – 3 (high)
        status: uint,
        result-hash: (buff 32),       ;; Hash of result (set on completion)
        result-cid: (string-utf8 128),;; IPFS CID of full result
        error-code: uint,             ;; Non-zero on failure
        submitted-at: uint,
        started-at: uint,
        completed-at: uint,
        worker: principal             ;; Which compute node handled the job
    }
)

;; Jobs indexed by data-id
(define-map jobs-by-data-id
    { data-id: uint }
    { job-ids: (list 100 uint) }
)

;; Authorised compute workers
(define-map compute-workers
    { worker: principal }
    { active: bool, jobs-completed: uint, added-at: uint }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-job (job-id uint))
    (map-get? analysis-jobs { job-id: job-id })
)

(define-read-only (get-jobs-for-dataset (data-id uint))
    (map-get? jobs-by-data-id { data-id: data-id })
)

(define-read-only (is-worker-active (worker principal))
    (match (map-get? compute-workers { worker: worker })
        w (get active w)
        false
    )
)

(define-read-only (get-active-job-count)
    (var-get active-job-count)
)

;; ─── Worker management ───────────────────────────────────────────────────────

(define-public (register-worker (worker principal))
    (begin
        (asserts! (is-eq tx-sender (var-get processor-admin)) ERR-NOT-AUTHORIZED)
        (map-set compute-workers { worker: worker }
            { active: true, jobs-completed: u0, added-at: stacks-block-height })
        (ok true)
    )
)

(define-public (deactivate-worker (worker principal))
    (begin
        (asserts! (is-eq tx-sender (var-get processor-admin)) ERR-NOT-AUTHORIZED)
        (match (map-get? compute-workers { worker: worker })
            w (map-set compute-workers { worker: worker } (merge w { active: false }))
            false
        )
        (ok true)
    )
)

;; ─── Job lifecycle ───────────────────────────────────────────────────────────

(define-public (submit-job
    (data-id uint)
    (analysis-type uint)
    (parameters (buff 512))
    (priority uint))

    (begin
        (asserts! (and (>= analysis-type u1) (<= analysis-type u5)) ERR-INVALID-ANALYSIS-TYPE)
        (asserts! (and (>= priority u1) (<= priority u3)) ERR-INVALID-PARAMETERS)
        (asserts! (< (var-get active-job-count) MAX-CONCURRENT-JOBS) ERR-MAX-CONCURRENT-JOBS)

        (let ((job-id (var-get next-job-id)))
            (map-set analysis-jobs { job-id: job-id }
                {
                    data-id: data-id,
                    requester: tx-sender,
                    analysis-type: analysis-type,
                    parameters: parameters,
                    priority: priority,
                    status: JOB-STATUS-QUEUED,
                    result-hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    result-cid: u"",
                    error-code: u0,
                    submitted-at: stacks-block-height,
                    started-at: u0,
                    completed-at: u0,
                    worker: tx-sender
                }
            )

            ;; Update data-id index
            (let ((existing (default-to { job-ids: (list) }
                    (map-get? jobs-by-data-id { data-id: data-id }))))
                (map-set jobs-by-data-id { data-id: data-id }
                    { job-ids: (unwrap-panic (as-max-len? (append (get job-ids existing) job-id) u100)) })
            )

            (var-set next-job-id (+ job-id u1))
            (var-set active-job-count (+ (var-get active-job-count) u1))
            (ok job-id)
        )
    )
)

;; Worker picks up a job
(define-public (start-job (job-id uint))
    (let ((job (unwrap! (map-get? analysis-jobs { job-id: job-id }) ERR-JOB-NOT-FOUND)))
        (asserts! (is-worker-active tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status job) JOB-STATUS-QUEUED) ERR-JOB-NOT-PENDING)
        (asserts!
            (< stacks-block-height (+ (get submitted-at job) JOB-EXPIRY-BLOCKS))
            ERR-JOB-EXPIRED)

        (map-set analysis-jobs { job-id: job-id }
            (merge job {
                status: JOB-STATUS-RUNNING,
                started-at: stacks-block-height,
                worker: tx-sender
            })
        )
        (ok true)
    )
)

;; Worker completes a job
(define-public (complete-job
    (job-id uint)
    (result-hash (buff 32))
    (result-cid (string-utf8 128)))

    (let ((job (unwrap! (map-get? analysis-jobs { job-id: job-id }) ERR-JOB-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get worker job)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status job) JOB-STATUS-RUNNING) ERR-JOB-NOT-PENDING)

        (map-set analysis-jobs { job-id: job-id }
            (merge job {
                status: JOB-STATUS-COMPLETED,
                result-hash: result-hash,
                result-cid: result-cid,
                completed-at: stacks-block-height
            })
        )

        ;; Decrement active count and credit worker
        (var-set active-job-count (- (var-get active-job-count) u1))
        (match (map-get? compute-workers { worker: tx-sender })
            w (map-set compute-workers { worker: tx-sender }
                (merge w { jobs-completed: (+ (get jobs-completed w) u1) }))
            false
        )

        (ok true)
    )
)

;; Worker or admin marks a job as failed
(define-public (fail-job (job-id uint) (error-code uint))
    (let ((job (unwrap! (map-get? analysis-jobs { job-id: job-id }) ERR-JOB-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (get worker job)) (is-eq tx-sender (var-get processor-admin)))
            ERR-NOT-AUTHORIZED)
        (asserts!
            (or (is-eq (get status job) JOB-STATUS-RUNNING)
                (is-eq (get status job) JOB-STATUS-QUEUED))
            ERR-JOB-NOT-PENDING)

        (map-set analysis-jobs { job-id: job-id }
            (merge job { status: JOB-STATUS-FAILED, error-code: error-code }))
        (var-set active-job-count (- (var-get active-job-count) u1))
        (ok true)
    )
)

;; Admin
(define-public (set-processor-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get processor-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set processor-admin new-admin))
    )
)
