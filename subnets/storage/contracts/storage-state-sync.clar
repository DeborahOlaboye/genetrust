;; storage-state-sync.clar  (Storage Subnet)
;; Aggregates storage state changes (pin events, replication updates)
;; and commits Merkle roots to the main chain bridge.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u1300))
(define-constant ERR-SNAPSHOT-NOT-FOUND (err u1301))
(define-constant ERR-SNAPSHOT-SEALED (err u1302))
(define-constant ERR-EMPTY-SNAPSHOT (err u1303))

;; Snapshot status
(define-constant STATUS-OPEN u0)
(define-constant STATUS-SEALED u1)
(define-constant STATUS-BRIDGED u2)

;; State
(define-data-var storage-sync-admin principal tx-sender)
(define-data-var next-snapshot-id uint u1)

;; Storage state snapshots
(define-map snapshots
    { snapshot-id: uint }
    {
        cids-included: (list 50 (buff 64)),
        cid-count: uint,
        state-root: (buff 32),
        status: uint,
        created-at: uint,
        sealed-at: uint,
        bridged-at: uint,
        bridge-message-id: uint
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-snapshot (snapshot-id uint))
    (map-get? snapshots { snapshot-id: snapshot-id })
)

;; ─── Snapshot lifecycle ──────────────────────────────────────────────────────

(define-public (create-snapshot)
    (begin
        (asserts! (is-eq tx-sender (var-get storage-sync-admin)) ERR-NOT-AUTHORIZED)
        (let ((snapshot-id (var-get next-snapshot-id)))
            (map-set snapshots { snapshot-id: snapshot-id }
                {
                    cids-included: (list),
                    cid-count: u0,
                    state-root: 0x0000000000000000000000000000000000000000000000000000000000000000,
                    status: STATUS-OPEN,
                    created-at: stacks-block-height,
                    sealed-at: u0,
                    bridged-at: u0,
                    bridge-message-id: u0
                }
            )
            (var-set next-snapshot-id (+ snapshot-id u1))
            (ok snapshot-id)
        )
    )
)

(define-public (add-cid-to-snapshot (snapshot-id uint) (cid (buff 64)))
    (let ((s (unwrap! (map-get? snapshots { snapshot-id: snapshot-id }) ERR-SNAPSHOT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get storage-sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status s) STATUS-OPEN) ERR-SNAPSHOT-SEALED)

        (let ((new-cids (unwrap-panic (as-max-len? (append (get cids-included s) cid) u50))))
            (map-set snapshots { snapshot-id: snapshot-id }
                (merge s {
                    cids-included: new-cids,
                    cid-count: (+ (get cid-count s) u1)
                })
            )
        )
        (ok true)
    )
)

(define-public (seal-snapshot (snapshot-id uint) (state-root (buff 32)))
    (let ((s (unwrap! (map-get? snapshots { snapshot-id: snapshot-id }) ERR-SNAPSHOT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get storage-sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status s) STATUS-OPEN) ERR-SNAPSHOT-SEALED)
        (asserts! (> (get cid-count s) u0) ERR-EMPTY-SNAPSHOT)

        (map-set snapshots { snapshot-id: snapshot-id }
            (merge s {
                state-root: state-root,
                status: STATUS-SEALED,
                sealed-at: stacks-block-height
            })
        )
        (ok true)
    )
)

(define-public (mark-bridged (snapshot-id uint) (bridge-message-id uint))
    (let ((s (unwrap! (map-get? snapshots { snapshot-id: snapshot-id }) ERR-SNAPSHOT-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get storage-sync-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status s) STATUS-SEALED) ERR-SNAPSHOT-SEALED)
        (map-set snapshots { snapshot-id: snapshot-id }
            (merge s {
                status: STATUS-BRIDGED,
                bridged-at: stacks-block-height,
                bridge-message-id: bridge-message-id
            })
        )
        (ok true)
    )
)

(define-public (set-storage-sync-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get storage-sync-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set storage-sync-admin new-admin))
    )
)
