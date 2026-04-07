;; genetic-data.clar
;; Dataset registry and access control for GeneTrust

;; Errors
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-INVALID-INPUT (err u400))

;; Access levels
(define-constant ACCESS-BASIC u1)
(define-constant ACCESS-DETAILED u2)
(define-constant ACCESS-FULL u3)

;; Access expires after ~30 days of blocks
(define-constant ACCESS-EXPIRY-BLOCKS u8640)

;; Dataset counter
(define-data-var next-data-id uint u1)

;; Datasets
(define-map datasets
    { data-id: uint }
    {
        owner: principal,
        metadata-hash: (buff 32),
        storage-url: (string-utf8 200),
        description: (string-utf8 200),
        access-level: uint,
        price: uint,
        is-active: bool,
        created-at: uint
    }
)

;; Access rights granted to users
(define-map access-rights
    { data-id: uint, user: principal }
    {
        access-level: uint,
        expires-at: uint,
        granted-by: principal
    }
)

;; Register a new dataset
(define-public (register-dataset
    (metadata-hash (buff 32))
    (storage-url (string-utf8 200))
    (description (string-utf8 200))
    (access-level uint)
    (price uint))
    (let ((data-id (var-get next-data-id)))
        (asserts! (> (len metadata-hash) u0) ERR-INVALID-INPUT)
        (asserts! (> (len storage-url) u0) ERR-INVALID-INPUT)
        (asserts! (> (len description) u0) ERR-INVALID-INPUT)
        (asserts! (> price u0) ERR-INVALID-INPUT)
        (asserts! (and (>= access-level ACCESS-BASIC) (<= access-level ACCESS-FULL)) ERR-INVALID-INPUT)
        (map-set datasets { data-id: data-id }
            {
                owner: tx-sender,
                metadata-hash: metadata-hash,
                storage-url: storage-url,
                description: description,
                access-level: access-level,
                price: price,
                is-active: true,
                created-at: stacks-block-height
            }
        )
        (var-set next-data-id (+ data-id u1))
        (ok data-id)
    )
)

;; Grant access to a user (owner only)
(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (not (is-eq user tx-sender)) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-AUTHORIZED)
        (asserts! (and (>= access-level ACCESS-BASIC) (<= access-level ACCESS-FULL)) ERR-INVALID-INPUT)
        (map-set access-rights { data-id: data-id, user: user }
            {
                access-level: access-level,
                expires-at: (+ stacks-block-height ACCESS-EXPIRY-BLOCKS),
                granted-by: tx-sender
            }
        )
        (ok true)
    )
)

;; Revoke access from a user (owner only)
(define-public (revoke-access (data-id uint) (user principal))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (not (is-eq user tx-sender)) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-AUTHORIZED)
        (map-delete access-rights { data-id: data-id, user: user })
        (ok true)
    )
)

;; Deactivate a dataset (owner only)
(define-public (deactivate-dataset (data-id uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-AUTHORIZED)
        (map-set datasets { data-id: data-id } (merge dataset { is-active: false }))
        (ok true)
    )
)

;; Read: get dataset info
(define-read-only (get-dataset (data-id uint))
    (map-get? datasets { data-id: data-id })
)

;; Read: check if a user has access
(define-read-only (get-access (data-id uint) (user principal))
    (map-get? access-rights { data-id: data-id, user: user })
)

;; Read: check if access is currently valid (not expired)
(define-read-only (has-valid-access (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (ok (< stacks-block-height (get expires-at rights)))
        (ok false)
    )
)

;; Read: get next data-id (useful for frontend)
(define-read-only (get-next-data-id)
    (ok (var-get next-data-id))
)
