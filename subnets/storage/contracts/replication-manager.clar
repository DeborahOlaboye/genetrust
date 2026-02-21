;; replication-manager.clar  (Storage Subnet)
;; Ensures stored genetic data meets replication factor targets across
;; multiple IPFS nodes.  Tracks per-CID replicas, issues replication
;; tasks, and removes excess replicas when needed.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-CID-NOT-FOUND (err u1001))
(define-constant ERR-TASK-NOT-FOUND (err u1002))
(define-constant ERR-TASK-CLOSED (err u1003))
(define-constant ERR-ALREADY-REPLICA (err u1004))
(define-constant ERR-TARGET-MET (err u1005))
(define-constant ERR-INVALID-TARGET (err u1006))

;; Task type constants
(define-constant TASK-REPLICATE u1)    ;; Add a new replica
(define-constant TASK-REMOVE u2)       ;; Remove an excess replica

;; Task status constants
(define-constant TASK-STATUS-OPEN u0)
(define-constant TASK-STATUS-ASSIGNED u1)
(define-constant TASK-STATUS-DONE u2)
(define-constant TASK-STATUS-FAILED u3)

;; Limits
(define-constant MIN-REPLICATION u2)
(define-constant MAX-REPLICATION u10)

;; State
(define-data-var replication-admin principal tx-sender)
(define-data-var next-task-id uint u1)

;; Per-CID replication state
(define-map replication-state
    { cid: (buff 64) }
    {
        target-replicas: uint,
        current-replicas: uint,
        replicas: (list 10 principal),   ;; Nodes that hold a replica
        last-audit-at: uint
    }
)

;; Replication tasks
(define-map replication-tasks
    { task-id: uint }
    {
        cid: (buff 64),
        task-type: uint,
        target-node: principal,
        status: uint,
        created-at: uint,
        assigned-at: uint,
        completed-at: uint
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-replication-state (cid (buff 64)))
    (map-get? replication-state { cid: cid })
)

(define-read-only (get-task (task-id uint))
    (map-get? replication-tasks { task-id: task-id })
)

(define-read-only (needs-replication (cid (buff 64)))
    (match (map-get? replication-state { cid: cid })
        s (< (get current-replicas s) (get target-replicas s))
        false
    )
)

;; ─── Replication state management ───────────────────────────────────────────

;; Initialize replication tracking for a new CID
(define-public (init-replication (cid (buff 64)) (target-replicas uint))
    (begin
        (asserts!
            (or (is-eq tx-sender (var-get replication-admin))
                (contract-call? .ipfs-coordinator is-ipfs-node tx-sender))
            ERR-NOT-AUTHORIZED)
        (asserts! (and (>= target-replicas MIN-REPLICATION) (<= target-replicas MAX-REPLICATION))
            ERR-INVALID-TARGET)
        (asserts! (is-none (map-get? replication-state { cid: cid })) ERR-ALREADY-REPLICA)

        (map-set replication-state { cid: cid }
            {
                target-replicas: target-replicas,
                current-replicas: u0,
                replicas: (list),
                last-audit-at: stacks-block-height
            }
        )
        (ok true)
    )
)

;; Record a new replica being added
(define-public (record-replica-added (cid (buff 64)) (node principal))
    (let ((s (unwrap! (map-get? replication-state { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get replication-admin)) ERR-NOT-AUTHORIZED)

        (let ((new-replicas (unwrap-panic
                (as-max-len? (append (get replicas s) node) u10))))
            (map-set replication-state { cid: cid }
                (merge s {
                    replicas: new-replicas,
                    current-replicas: (+ (get current-replicas s) u1),
                    last-audit-at: stacks-block-height
                })
            )
        )
        (ok true)
    )
)

;; Record a replica being removed
(define-public (record-replica-removed (cid (buff 64)) (node principal))
    (let ((s (unwrap! (map-get? replication-state { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get replication-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (> (get current-replicas s) u0) ERR-CID-NOT-FOUND)

        (map-set replication-state { cid: cid }
            (merge s {
                current-replicas: (- (get current-replicas s) u1),
                last-audit-at: stacks-block-height
            })
        )
        (ok true)
    )
)

;; Update target replication factor
(define-public (update-target (cid (buff 64)) (new-target uint))
    (let ((s (unwrap! (map-get? replication-state { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get replication-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (and (>= new-target MIN-REPLICATION) (<= new-target MAX-REPLICATION)) ERR-INVALID-TARGET)
        (map-set replication-state { cid: cid }
            (merge s { target-replicas: new-target }))
        (ok true)
    )
)

;; ─── Task management ─────────────────────────────────────────────────────────

;; Issue a new replication or removal task
(define-public (create-task
    (cid (buff 64))
    (task-type uint)
    (target-node principal))

    (begin
        (asserts! (is-eq tx-sender (var-get replication-admin)) ERR-NOT-AUTHORIZED)

        (let ((task-id (var-get next-task-id)))
            (map-set replication-tasks { task-id: task-id }
                {
                    cid: cid,
                    task-type: task-type,
                    target-node: target-node,
                    status: TASK-STATUS-OPEN,
                    created-at: stacks-block-height,
                    assigned-at: u0,
                    completed-at: u0
                }
            )
            (var-set next-task-id (+ task-id u1))
            (ok task-id)
        )
    )
)

;; Node accepts a task
(define-public (accept-task (task-id uint))
    (let ((t (unwrap! (map-get? replication-tasks { task-id: task-id }) ERR-TASK-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get target-node t)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status t) TASK-STATUS-OPEN) ERR-TASK-CLOSED)
        (map-set replication-tasks { task-id: task-id }
            (merge t { status: TASK-STATUS-ASSIGNED, assigned-at: stacks-block-height }))
        (ok true)
    )
)

;; Node reports task completion
(define-public (complete-task (task-id uint))
    (let ((t (unwrap! (map-get? replication-tasks { task-id: task-id }) ERR-TASK-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get target-node t)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status t) TASK-STATUS-ASSIGNED) ERR-TASK-CLOSED)
        (map-set replication-tasks { task-id: task-id }
            (merge t { status: TASK-STATUS-DONE, completed-at: stacks-block-height }))
        (ok true)
    )
)

;; Update last audit timestamp
(define-public (record-audit (cid (buff 64)))
    (let ((s (unwrap! (map-get? replication-state { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get replication-admin)) ERR-NOT-AUTHORIZED)
        (map-set replication-state { cid: cid }
            (merge s { last-audit-at: stacks-block-height }))
        (ok true)
    )
)

;; Admin
(define-public (set-replication-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get replication-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set replication-admin new-admin))
    )
)
