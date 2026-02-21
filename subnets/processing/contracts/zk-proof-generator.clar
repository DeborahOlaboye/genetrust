;; zk-proof-generator.clar  (Processing Subnet)
;; Manages zero-knowledge proof generation for privacy-preserving genetic
;; data analysis.  Workers commit proof requests here, attach the resulting
;; proof bytes, and the contract anchors them for main-chain verification.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u700))
(define-constant ERR-REQUEST-NOT-FOUND (err u701))
(define-constant ERR-REQUEST-EXISTS (err u702))
(define-constant ERR-INVALID-CIRCUIT (err u703))
(define-constant ERR-INVALID-STATUS (err u704))
(define-constant ERR-PROOF-TOO-LARGE (err u705))

;; Circuit type constants  (each maps to a specific ZK circuit)
(define-constant CIRCUIT-MEMBERSHIP u1)      ;; Prove membership in a set without revealing the element
(define-constant CIRCUIT-RANGE u2)           ;; Prove a value is within a range
(define-constant CIRCUIT-COMPUTATION u3)     ;; Prove correct execution of a computation
(define-constant CIRCUIT-PRIVACY-PRESERVING u4) ;; GWAS / analysis without revealing raw data

;; Request status
(define-constant STATUS-OPEN u0)
(define-constant STATUS-GENERATING u1)
(define-constant STATUS-READY u2)
(define-constant STATUS-BRIDGED u3)
(define-constant STATUS-FAILED u4)

;; Limits
(define-constant MAX-PROOF-SIZE u8192)   ;; bytes

;; State
(define-data-var zk-admin principal tx-sender)
(define-data-var next-request-id uint u1)

;; ZK proof requests
(define-map proof-requests
    { request-id: uint }
    {
        job-id: uint,                    ;; Linked analysis job
        data-id: uint,
        circuit-type: uint,
        public-inputs: (buff 256),       ;; Public inputs committed up-front
        private-inputs-hash: (buff 32),  ;; Hash of private inputs (never revealed)
        proof-bytes: (buff 4096),        ;; The generated proof (empty until ready)
        proof-hash: (buff 32),
        vk-hash: (buff 32),              ;; Hash of the verification key used
        status: uint,
        requester: principal,
        worker: principal,
        created-at: uint,
        completed-at: uint
    }
)

;; Index by job-id
(define-map requests-by-job
    { job-id: uint }
    { request-ids: (list 20 uint) }
)

;; Authorised ZK workers
(define-map zk-workers
    { worker: principal }
    { active: bool }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-proof-request (request-id uint))
    (map-get? proof-requests { request-id: request-id })
)

(define-read-only (get-requests-for-job (job-id uint))
    (map-get? requests-by-job { job-id: job-id })
)

(define-read-only (is-zk-worker (worker principal))
    (match (map-get? zk-workers { worker: worker })
        w (get active w)
        false
    )
)

;; ─── Worker management ───────────────────────────────────────────────────────

(define-public (add-zk-worker (worker principal))
    (begin
        (asserts! (is-eq tx-sender (var-get zk-admin)) ERR-NOT-AUTHORIZED)
        (map-set zk-workers { worker: worker } { active: true })
        (ok true)
    )
)

(define-public (remove-zk-worker (worker principal))
    (begin
        (asserts! (is-eq tx-sender (var-get zk-admin)) ERR-NOT-AUTHORIZED)
        (map-set zk-workers { worker: worker } { active: false })
        (ok true)
    )
)

;; ─── Proof lifecycle ─────────────────────────────────────────────────────────

(define-public (request-proof
    (job-id uint)
    (data-id uint)
    (circuit-type uint)
    (public-inputs (buff 256))
    (private-inputs-hash (buff 32)))

    (begin
        (asserts! (and (>= circuit-type u1) (<= circuit-type u4)) ERR-INVALID-CIRCUIT)

        (let ((request-id (var-get next-request-id)))
            (map-set proof-requests { request-id: request-id }
                {
                    job-id: job-id,
                    data-id: data-id,
                    circuit-type: circuit-type,
                    public-inputs: public-inputs,
                    private-inputs-hash: private-inputs-hash,
                    proof-bytes: 0x,
                    proof-hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    vk-hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    status: STATUS-OPEN,
                    requester: tx-sender,
                    worker: tx-sender,
                    created-at: stacks-block-height,
                    completed-at: u0
                }
            )

            (let ((existing (default-to { request-ids: (list) }
                    (map-get? requests-by-job { job-id: job-id }))))
                (map-set requests-by-job { job-id: job-id }
                    { request-ids: (unwrap-panic (as-max-len? (append (get request-ids existing) request-id) u20)) })
            )

            (var-set next-request-id (+ request-id u1))
            (ok request-id)
        )
    )
)

;; Worker claims a request and begins generating the proof
(define-public (start-proof-generation (request-id uint))
    (let ((r (unwrap! (map-get? proof-requests { request-id: request-id }) ERR-REQUEST-NOT-FOUND)))
        (asserts! (is-zk-worker tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status r) STATUS-OPEN) ERR-INVALID-STATUS)
        (map-set proof-requests { request-id: request-id }
            (merge r { status: STATUS-GENERATING, worker: tx-sender }))
        (ok true)
    )
)

;; Worker submits the completed proof
(define-public (submit-proof
    (request-id uint)
    (proof-bytes (buff 4096))
    (proof-hash (buff 32))
    (vk-hash (buff 32)))

    (let ((r (unwrap! (map-get? proof-requests { request-id: request-id }) ERR-REQUEST-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get worker r)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status r) STATUS-GENERATING) ERR-INVALID-STATUS)
        (asserts! (<= (len proof-bytes) MAX-PROOF-SIZE) ERR-PROOF-TOO-LARGE)

        (map-set proof-requests { request-id: request-id }
            (merge r {
                proof-bytes: proof-bytes,
                proof-hash: proof-hash,
                vk-hash: vk-hash,
                status: STATUS-READY,
                completed-at: stacks-block-height
            })
        )
        (ok true)
    )
)

;; Mark a proof as bridged (sent to main chain)
(define-public (mark-proof-bridged (request-id uint))
    (let ((r (unwrap! (map-get? proof-requests { request-id: request-id }) ERR-REQUEST-NOT-FOUND)))
        (asserts! (or (is-zk-worker tx-sender) (is-eq tx-sender (var-get zk-admin))) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status r) STATUS-READY) ERR-INVALID-STATUS)
        (map-set proof-requests { request-id: request-id }
            (merge r { status: STATUS-BRIDGED }))
        (ok true)
    )
)

;; Admin
(define-public (set-zk-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get zk-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set zk-admin new-admin))
    )
)
