;; genetic-data.clar
;; Dataset registry and access control for GeneTrust

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-AMOUNT (err u401))
(define-constant ERR-INVALID-HASH (err u403))
(define-constant ERR-INVALID-METADATA (err u404))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u406))
(define-constant ERR-INVALID-STRING-LENGTH (err u407))

;; Errors - Authorization (410-414)
(define-constant ERR-NOT-AUTHORIZED (err u410))
(define-constant ERR-NOT-OWNER (err u411))
(define-constant ERR-INSUFFICIENT-PERMISSIONS (err u412))

;; Errors - Not Found (430-439)
(define-constant ERR-NOT-FOUND (err u430))
(define-constant ERR-DATASET-NOT-FOUND (err u431))
(define-constant ERR-ACCESS-RIGHT-NOT-FOUND (err u436))

;; Errors - Conflict (440-449)
(define-constant ERR-ALREADY-EXISTS (err u440))
(define-constant ERR-DATASET-ALREADY-EXISTS (err u441))
(define-constant ERR-DUPLICATE-ACCESS-GRANT (err u444))

;; Errors - Gone/Inactive (450-459)
(define-constant ERR-INACTIVE-DATASET (err u450))

;; Errors - Precondition Failed (460-469)
(define-constant ERR-INSUFFICIENT-ACCESS-LEVEL (err u621))

;; Errors - Custom Business Logic (600-699)
(define-constant ERR-SELF-GRANT-NOT-ALLOWED (err u610))
(define-constant ERR-CANNOT-REVOKE-OWN-ACCESS (err u611))
(define-constant ERR-EXPIRED-ACCESS (err u423))

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
;; @param metadata-hash: 32-byte hash of dataset metadata
;; @param storage-url: URL where dataset is stored (5-200 chars)
;; @param description: Dataset description (10-200 chars)
;; @param access-level: Access level (1=basic, 2=detailed, 3=full)
;; @param price: Price in microSTX (must be > 0)
;; @returns: ok with data-id on success, error otherwise
(define-public (register-dataset
    (metadata-hash (buff 32))
    (storage-url (string-utf8 200))
    (description (string-utf8 200))
    (access-level uint)
    (price uint))
    (let ((data-id (var-get next-data-id)))
        ;; Validate metadata hash
        (asserts! (is-eq (len metadata-hash) u32) ERR-INVALID-HASH)
        ;; Validate storage URL is not empty and reasonable length
        (asserts! (and (> (len storage-url) u0) (<= (len storage-url) u200)) ERR-INVALID-STRING-LENGTH)
        ;; Validate description is not empty and reasonable length
        (asserts! (and (>= (len description) u10) (<= (len description) u200)) ERR-INVALID-STRING-LENGTH)
        ;; Validate price is positive
        (asserts! (> price u0) ERR-INVALID-AMOUNT)
        ;; Validate access-level is in valid range (1-3)
        (asserts! (and (>= access-level ACCESS-BASIC) (<= access-level ACCESS-FULL)) ERR-INVALID-ACCESS-LEVEL)
        ;; Create the dataset
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
        ;; Increment counter
        (var-set next-data-id (+ data-id u1))
        (ok data-id)
    )
)

;; Grant access to a user (owner only)
;; @param data-id: ID of the dataset
;; @param user: Principal to grant access to
;; @param access-level: Access level to grant (1-3)
;; @returns: ok true on success, error otherwise
;; @requires: Caller must be dataset owner
;; @requires: User cannot be the caller
;; @requires: Dataset must exist and be active
(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        ;; Validate data-id is positive
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        ;; Prevent self-grant
        (asserts! (not (is-eq user tx-sender)) ERR-SELF-GRANT-NOT-ALLOWED)
        ;; Verify caller is the dataset owner
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        ;; Verify dataset is active
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        ;; Validate access-level is in valid range
        (asserts! (and (>= access-level ACCESS-BASIC) (<= access-level ACCESS-FULL)) ERR-INVALID-ACCESS-LEVEL)
        ;; Check if access already exists
        (asserts! (is-none (map-get? access-rights { data-id: data-id, user: user })) ERR-DUPLICATE-ACCESS-GRANT)
        ;; Grant the access
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
