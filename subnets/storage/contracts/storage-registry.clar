;; storage-registry.clar  (Storage Subnet)
;; Authoritative registry of all datasets stored on the storage subnet.
;; Maps data-ids to their storage metadata (CIDs, encryption keys hash,
;; size, access policies) and tracks storage quotas per owner.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u1100))
(define-constant ERR-RECORD-NOT-FOUND (err u1101))
(define-constant ERR-RECORD-EXISTS (err u1102))
(define-constant ERR-QUOTA-EXCEEDED (err u1103))
(define-constant ERR-INVALID-TIER (err u1104))
(define-constant ERR-RECORD-INACTIVE (err u1105))

;; Storage tier constants
(define-constant TIER-STANDARD u1)     ;; ~30 days retention
(define-constant TIER-EXTENDED u2)     ;; ~1 year retention
(define-constant TIER-PERMANENT u3)    ;; Indefinite retention

;; Default per-owner quota: 100 GB in bytes
(define-constant DEFAULT-QUOTA-BYTES u107374182400)

;; Admin / state
(define-data-var storage-admin principal tx-sender)
(define-data-var next-record-id uint u1)

;; Storage records
(define-map storage-records
    { data-id: uint }
    {
        owner: principal,
        primary-cid: (buff 64),          ;; Main IPFS CID
        metadata-cid: (buff 64),         ;; Metadata file CID
        encryption-key-hash: (buff 32),  ;; Hash of the encryption key
        size-bytes: uint,
        storage-tier: uint,
        is-active: bool,
        created-at: uint,
        last-accessed-at: uint,
        access-count: uint,
        retention-expires-at: uint       ;; Block height when retention expires
    }
)

;; Per-owner storage stats
(define-map owner-storage-stats
    { owner: principal }
    {
        total-bytes: uint,
        quota-bytes: uint,
        record-count: uint,
        last-updated: uint
    }
)

;; CID-to-data-id reverse lookup
(define-map cid-to-data-id
    { cid: (buff 64) }
    { data-id: uint }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-storage-record (data-id uint))
    (map-get? storage-records { data-id: data-id })
)

(define-read-only (get-owner-stats (owner principal))
    (map-get? owner-storage-stats { owner: owner })
)

(define-read-only (get-data-id-for-cid (cid (buff 64)))
    (map-get? cid-to-data-id { cid: cid })
)

(define-read-only (owner-has-quota (owner principal) (additional-bytes uint))
    (let ((stats (default-to
            { total-bytes: u0, quota-bytes: DEFAULT-QUOTA-BYTES, record-count: u0, last-updated: u0 }
            (map-get? owner-storage-stats { owner: owner }))))
        (<= (+ (get total-bytes stats) additional-bytes) (get quota-bytes stats))
    )
)

;; ─── Record management ───────────────────────────────────────────────────────

(define-public (register-storage
    (data-id uint)
    (owner principal)
    (primary-cid (buff 64))
    (metadata-cid (buff 64))
    (encryption-key-hash (buff 32))
    (size-bytes uint)
    (storage-tier uint))

    (begin
        (asserts! (is-eq tx-sender (var-get storage-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (map-get? storage-records { data-id: data-id })) ERR-RECORD-EXISTS)
        (asserts! (and (>= storage-tier u1) (<= storage-tier u3)) ERR-INVALID-TIER)
        (asserts! (owner-has-quota owner size-bytes) ERR-QUOTA-EXCEEDED)

        ;; Compute retention expiry based on tier
        (let ((retention-blocks
                (if (is-eq storage-tier TIER-STANDARD) u4320    ;; ~30 days
                    (if (is-eq storage-tier TIER-EXTENDED) u52560  ;; ~1 year
                        u0))))  ;; 0 = permanent

            (map-set storage-records { data-id: data-id }
                {
                    owner: owner,
                    primary-cid: primary-cid,
                    metadata-cid: metadata-cid,
                    encryption-key-hash: encryption-key-hash,
                    size-bytes: size-bytes,
                    storage-tier: storage-tier,
                    is-active: true,
                    created-at: stacks-block-height,
                    last-accessed-at: stacks-block-height,
                    access-count: u0,
                    retention-expires-at: (if (is-eq retention-blocks u0) u0
                        (+ stacks-block-height retention-blocks))
                }
            )

            ;; Update owner stats
            (let ((stats (default-to
                    { total-bytes: u0, quota-bytes: DEFAULT-QUOTA-BYTES, record-count: u0, last-updated: u0 }
                    (map-get? owner-storage-stats { owner: owner }))))
                (map-set owner-storage-stats { owner: owner }
                    (merge stats {
                        total-bytes: (+ (get total-bytes stats) size-bytes),
                        record-count: (+ (get record-count stats) u1),
                        last-updated: stacks-block-height
                    })
                )
            )

            ;; CID reverse lookup
            (map-set cid-to-data-id { cid: primary-cid } { data-id: data-id })

            (ok data-id)
        )
    )
)

;; Record a data access (updates last-accessed-at and increments counter)
(define-public (record-access (data-id uint))
    (let ((r (unwrap! (map-get? storage-records { data-id: data-id }) ERR-RECORD-NOT-FOUND)))
        (asserts! (get is-active r) ERR-RECORD-INACTIVE)
        (map-set storage-records { data-id: data-id }
            (merge r {
                last-accessed-at: stacks-block-height,
                access-count: (+ (get access-count r) u1)
            })
        )
        (ok true)
    )
)

;; Deactivate a storage record (soft delete)
(define-public (deactivate-record (data-id uint))
    (let ((r (unwrap! (map-get? storage-records { data-id: data-id }) ERR-RECORD-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (get owner r)) (is-eq tx-sender (var-get storage-admin)))
            ERR-NOT-AUTHORIZED)

        (map-set storage-records { data-id: data-id }
            (merge r { is-active: false }))

        ;; Reduce owner byte count
        (match (map-get? owner-storage-stats { owner: (get owner r) })
            stats (map-set owner-storage-stats { owner: (get owner r) }
                (merge stats {
                    total-bytes: (- (get total-bytes stats) (get size-bytes r)),
                    record-count: (- (get record-count stats) u1)
                }))
            false
        )
        (ok true)
    )
)

;; Set custom quota for an owner
(define-public (set-owner-quota (owner principal) (quota-bytes uint))
    (begin
        (asserts! (is-eq tx-sender (var-get storage-admin)) ERR-NOT-AUTHORIZED)
        (let ((stats (default-to
                { total-bytes: u0, quota-bytes: DEFAULT-QUOTA-BYTES, record-count: u0, last-updated: u0 }
                (map-get? owner-storage-stats { owner: owner }))))
            (map-set owner-storage-stats { owner: owner }
                (merge stats { quota-bytes: quota-bytes }))
        )
        (ok true)
    )
)

;; Admin
(define-public (set-storage-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get storage-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set storage-admin new-admin))
    )
)
