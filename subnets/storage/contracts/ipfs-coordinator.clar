;; ipfs-coordinator.clar  (Storage Subnet)
;; Manages IPFS pinning operations for encrypted genetic data.
;; Tracks Content IDs (CIDs), pin status, and coordinates with the
;; replication manager to ensure data durability.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u900))
(define-constant ERR-CID-NOT-FOUND (err u901))
(define-constant ERR-CID-EXISTS (err u902))
(define-constant ERR-INVALID-CID (err u903))
(define-constant ERR-ALREADY-PINNED (err u904))
(define-constant ERR-NOT-PINNED (err u905))
(define-constant ERR-PIN-IN-PROGRESS (err u906))

;; Pin status constants
(define-constant PIN-STATUS-REQUESTED u0)
(define-constant PIN-STATUS-PINNING u1)
(define-constant PIN-STATUS-PINNED u2)
(define-constant PIN-STATUS-UNPINNING u3)
(define-constant PIN-STATUS-UNPINNED u4)
(define-constant PIN-STATUS-FAILED u5)

;; CID type constants
(define-constant CID-TYPE-DATASET u1)       ;; Raw encrypted dataset
(define-constant CID-TYPE-METADATA u2)      ;; Dataset metadata
(define-constant CID-TYPE-ANALYSIS u3)      ;; Analysis result
(define-constant CID-TYPE-PROOF u4)         ;; ZK proof file

;; State
(define-data-var coordinator-admin principal tx-sender)
(define-data-var next-pin-id uint u1)

;; CID records
(define-map cid-records
    { cid: (buff 64) }
    {
        cid-type: uint,
        data-id: uint,
        size-bytes: uint,
        pin-status: uint,
        pinned-by: principal,
        pin-id: uint,
        created-at: uint,
        pinned-at: uint,
        last-verified-at: uint,
        replication-factor: uint,   ;; How many nodes have it
        target-replication: uint    ;; Desired replication count
    }
)

;; Index CIDs by data-id
(define-map cids-by-data-id
    { data-id: uint }
    { cids: (list 20 (buff 64)) }
)

;; Authorised IPFS nodes
(define-map ipfs-nodes
    { node: principal }
    { active: bool, pins-count: uint, joined-at: uint }
)

;; Pin queue for pending operations
(define-map pin-queue
    { pin-id: uint }
    {
        cid: (buff 64),
        requested-by: principal,
        requested-at: uint,
        assigned-node: principal,
        completed: bool
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-cid-record (cid (buff 64)))
    (map-get? cid-records { cid: cid })
)

(define-read-only (get-cids-for-dataset (data-id uint))
    (map-get? cids-by-data-id { data-id: data-id })
)

(define-read-only (is-cid-pinned (cid (buff 64)))
    (match (map-get? cid-records { cid: cid })
        r (is-eq (get pin-status r) PIN-STATUS-PINNED)
        false
    )
)

(define-read-only (is-ipfs-node (node principal))
    (match (map-get? ipfs-nodes { node: node })
        n (get active n)
        false
    )
)

;; ─── Node management ─────────────────────────────────────────────────────────

(define-public (register-ipfs-node (node principal))
    (begin
        (asserts! (is-eq tx-sender (var-get coordinator-admin)) ERR-NOT-AUTHORIZED)
        (map-set ipfs-nodes { node: node }
            { active: true, pins-count: u0, joined-at: stacks-block-height })
        (ok true)
    )
)

(define-public (deregister-ipfs-node (node principal))
    (begin
        (asserts! (is-eq tx-sender (var-get coordinator-admin)) ERR-NOT-AUTHORIZED)
        (match (map-get? ipfs-nodes { node: node })
            n (map-set ipfs-nodes { node: node } (merge n { active: false }))
            false
        )
        (ok true)
    )
)

;; ─── Pinning lifecycle ───────────────────────────────────────────────────────

;; Request pinning a new CID
(define-public (request-pin
    (cid (buff 64))
    (cid-type uint)
    (data-id uint)
    (size-bytes uint)
    (target-replication uint))

    (begin
        (asserts! (is-none (map-get? cid-records { cid: cid })) ERR-CID-EXISTS)
        (asserts! (> (len cid) u0) ERR-INVALID-CID)

        (let ((pin-id (var-get next-pin-id)))
            (map-set cid-records { cid: cid }
                {
                    cid-type: cid-type,
                    data-id: data-id,
                    size-bytes: size-bytes,
                    pin-status: PIN-STATUS-REQUESTED,
                    pinned-by: tx-sender,
                    pin-id: pin-id,
                    created-at: stacks-block-height,
                    pinned-at: u0,
                    last-verified-at: u0,
                    replication-factor: u0,
                    target-replication: target-replication
                }
            )

            ;; Update data-id index
            (let ((existing (default-to { cids: (list) }
                    (map-get? cids-by-data-id { data-id: data-id }))))
                (map-set cids-by-data-id { data-id: data-id }
                    { cids: (unwrap-panic (as-max-len? (append (get cids existing) cid) u20)) })
            )

            ;; Add to pin queue
            (map-set pin-queue { pin-id: pin-id }
                {
                    cid: cid,
                    requested-by: tx-sender,
                    requested-at: stacks-block-height,
                    assigned-node: tx-sender,
                    completed: false
                }
            )

            (var-set next-pin-id (+ pin-id u1))
            (ok pin-id)
        )
    )
)

;; IPFS node confirms it started pinning
(define-public (start-pinning (cid (buff 64)))
    (let ((r (unwrap! (map-get? cid-records { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-ipfs-node tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get pin-status r) PIN-STATUS-REQUESTED) ERR-PIN-IN-PROGRESS)
        (map-set cid-records { cid: cid }
            (merge r { pin-status: PIN-STATUS-PINNING, pinned-by: tx-sender }))
        (ok true)
    )
)

;; IPFS node confirms pinning is complete
(define-public (confirm-pinned (cid (buff 64)))
    (let ((r (unwrap! (map-get? cid-records { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-ipfs-node tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get pin-status r) PIN-STATUS-PINNING) ERR-PIN-IN-PROGRESS)

        (map-set cid-records { cid: cid }
            (merge r {
                pin-status: PIN-STATUS-PINNED,
                pinned-at: stacks-block-height,
                last-verified-at: stacks-block-height,
                replication-factor: (+ (get replication-factor r) u1)
            })
        )

        ;; Increment node's pin count
        (match (map-get? ipfs-nodes { node: tx-sender })
            n (map-set ipfs-nodes { node: tx-sender }
                (merge n { pins-count: (+ (get pins-count n) u1) }))
            false
        )

        (ok true)
    )
)

;; Record a periodic availability verification
(define-public (record-verification (cid (buff 64)))
    (let ((r (unwrap! (map-get? cid-records { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts! (is-ipfs-node tx-sender) ERR-NOT-AUTHORIZED)
        (map-set cid-records { cid: cid }
            (merge r { last-verified-at: stacks-block-height }))
        (ok true)
    )
)

;; Request unpinning a CID
(define-public (request-unpin (cid (buff 64)))
    (let ((r (unwrap! (map-get? cid-records { cid: cid }) ERR-CID-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (var-get coordinator-admin))
                (is-eq tx-sender (get pinned-by r)))
            ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get pin-status r) PIN-STATUS-PINNED) ERR-NOT-PINNED)
        (map-set cid-records { cid: cid }
            (merge r { pin-status: PIN-STATUS-UNPINNING }))
        (ok true)
    )
)

;; Admin
(define-public (set-coordinator-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get coordinator-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set coordinator-admin new-admin))
    )
)
