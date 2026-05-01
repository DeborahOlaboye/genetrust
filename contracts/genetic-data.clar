;; genetic-data.clar
;; @title GeneTrust Dataset Registry
;; @version 1.0.0
;; @author GeneTrust
;; @notice Registers and manages genetic datasets on the Stacks blockchain.
;;         Handles dataset ownership, tiered access control, and access expiry.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.dataset-registry

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-AMOUNT (err u401))
(define-constant ERR-PRICE-TOO-HIGH (err u402))
(define-constant ERR-INVALID-HASH (err u403))
(define-constant ERR-INVALID-METADATA (err u404))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u406))
(define-constant ERR-INVALID-STRING-LENGTH (err u407))
(define-constant ERR-ZERO-HASH (err u408))

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

;; Price cap: 1 billion STX in microSTX to prevent absurd listings
(define-constant MAX-PRICE u1000000000000000)

;; Minimum storage URL length (e.g. "ipfs://a" is 8 chars)
(define-constant MIN-URL-LENGTH u5)

;; Dataset counter
(define-data-var next-data-id uint u1)

;; Running total of all datasets ever registered (including deactivated ones)
(define-data-var total-datasets uint u0)

;; @notice Primary storage map for all registered genetic datasets.
;;         Keyed by auto-incremented data-id. Owner is always tx-sender at registration time.
;; @dev is-active flag is used for soft-deletion; datasets are never hard-deleted.
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

;; @notice Tracks access rights granted by dataset owners to other principals.
;;         Access automatically expires after ACCESS-EXPIRY-BLOCKS (~30 days).
;; @dev expiration is block-height based. Frontend should call has-valid-access before use.
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
        ;; Validate metadata hash is exactly 32 bytes
        (asserts! (is-eq (len metadata-hash) u32) ERR-INVALID-HASH)
        ;; Validate metadata hash is not all-zero (meaningless sentinel)
        (asserts! (not (is-eq metadata-hash 0x0000000000000000000000000000000000000000000000000000000000000000)) ERR-ZERO-HASH)
        ;; Validate storage URL meets minimum length and does not exceed maximum
        (asserts! (and (>= (len storage-url) MIN-URL-LENGTH) (<= (len storage-url) u200)) ERR-INVALID-STRING-LENGTH)
        ;; Validate description is not empty and reasonable length
        (asserts! (and (>= (len description) u10) (<= (len description) u200)) ERR-INVALID-STRING-LENGTH)
        ;; Validate price is positive
        (asserts! (> price u0) ERR-INVALID-AMOUNT)
        ;; Validate price does not exceed the maximum cap
        (asserts! (<= price MAX-PRICE) ERR-PRICE-TOO-HIGH)
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
        ;; Emit event for off-chain indexers
        (print { event: "dataset-registered", data-id: data-id, owner: tx-sender,
                 access-level: access-level, price: price, block: stacks-block-height })
        ;; Increment counters
        (var-set next-data-id (+ data-id u1))
        (var-set total-datasets (+ (var-get total-datasets) u1))
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
        ;; Prevent granting access to the contract itself
        (asserts! (not (is-eq user (as-contract tx-sender))) ERR-INVALID-INPUT)
        ;; Verify caller is the dataset owner
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        ;; Verify dataset is active
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        ;; Validate access-level is in valid range (1-3)
        (asserts! (and (>= access-level ACCESS-BASIC) (<= access-level ACCESS-FULL)) ERR-INVALID-ACCESS-LEVEL)
        ;; Granted level cannot exceed the dataset's own access level
        (asserts! (<= access-level (get access-level dataset)) ERR-INSUFFICIENT-ACCESS-LEVEL)
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
        (print { event: "access-granted", data-id: data-id, user: user,
                 access-level: access-level, granted-by: tx-sender,
                 expires-at: (+ stacks-block-height ACCESS-EXPIRY-BLOCKS),
                 block: stacks-block-height })
        (ok true)
    )
)

;; Revoke access from a user (owner only)
;; @param data-id: ID of the dataset
;; @param user: Principal whose access to revoke
;; @returns: ok true on success, error otherwise
;; @requires: Caller must be dataset owner
;; @requires: User cannot be the caller
;; @requires: Dataset must exist
(define-public (revoke-access (data-id uint) (user principal))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND))
          (access (unwrap! (map-get? access-rights { data-id: data-id, user: user }) ERR-ACCESS-RIGHT-NOT-FOUND)))
        ;; Validate data-id is positive
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        ;; Prevent self-revoke
        (asserts! (not (is-eq user tx-sender)) ERR-CANNOT-REVOKE-OWN-ACCESS)
        ;; Verify caller is the dataset owner
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        ;; Delete the access right
        (map-delete access-rights { data-id: data-id, user: user })
        (print { event: "access-revoked", data-id: data-id, user: user,
                 revoked-by: tx-sender, block: stacks-block-height })
        (ok true)
    )
)

;; Update the access level of an existing grant (owner only)
;; @param data-id: ID of the dataset
;; @param user: Principal whose access level to update
;; @param new-access-level: New access level (1-3, cannot exceed dataset level)
;; @returns: ok true on success, error otherwise
(define-public (update-access-level (data-id uint) (user principal) (new-access-level uint))
    (let (
        (dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND))
        (rights (unwrap! (map-get? access-rights { data-id: data-id, user: user }) ERR-ACCESS-RIGHT-NOT-FOUND))
    )
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        (asserts! (and (>= new-access-level ACCESS-BASIC) (<= new-access-level ACCESS-FULL)) ERR-INVALID-ACCESS-LEVEL)
        (asserts! (<= new-access-level (get access-level dataset)) ERR-INSUFFICIENT-ACCESS-LEVEL)
        (map-set access-rights { data-id: data-id, user: user }
            (merge rights { access-level: new-access-level })
        )
        (print { event: "access-level-updated", data-id: data-id, user: user,
                 old-level: (get access-level rights), new-level: new-access-level,
                 updated-by: tx-sender, block: stacks-block-height })
        (ok true)
    )
)

;; Deactivate a dataset (owner only)
;; @param data-id: ID of the dataset to deactivate
;; @returns: ok true on success, error otherwise
;; @requires: Caller must be dataset owner
;; @requires: Dataset must exist and be active
(define-public (deactivate-dataset (data-id uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        ;; Validate data-id is positive
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        ;; Verify caller is the dataset owner
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        ;; Check dataset is not already deactivated
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        ;; Deactivate the dataset
        (map-set datasets { data-id: data-id } (merge dataset { is-active: false }))
        (print { event: "dataset-deactivated", data-id: data-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; Update the price of an active dataset (owner only)
;; @param data-id: ID of the dataset
;; @param new-price: New price in microSTX (must be > 0 and <= MAX-PRICE)
;; @returns: ok true on success, error otherwise
(define-public (update-dataset-price (data-id uint) (new-price uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        (asserts! (> new-price u0) ERR-INVALID-AMOUNT)
        (asserts! (<= new-price MAX-PRICE) ERR-PRICE-TOO-HIGH)
        (map-set datasets { data-id: data-id } (merge dataset { price: new-price }))
        (print { event: "dataset-price-updated", data-id: data-id, owner: tx-sender,
                 old-price: (get price dataset), new-price: new-price, block: stacks-block-height })
        (ok true)
    )
)

;; Update the storage URL of an active dataset (owner only)
;; @param data-id: ID of the dataset
;; @param new-url: New storage URL (5-200 chars)
;; @returns: ok true on success, error otherwise
(define-public (update-storage-url (data-id uint) (new-url (string-utf8 200)))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        (asserts! (and (>= (len new-url) MIN-URL-LENGTH) (<= (len new-url) u200)) ERR-INVALID-STRING-LENGTH)
        (map-set datasets { data-id: data-id } (merge dataset { storage-url: new-url }))
        (print { event: "dataset-url-updated", data-id: data-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; Update the description of an active dataset (owner only)
;; @param data-id: ID of the dataset
;; @param new-description: New description (10-200 chars)
;; @returns: ok true on success, error otherwise
(define-public (update-description (data-id uint) (new-description (string-utf8 200)))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        (asserts! (and (>= (len new-description) u10) (<= (len new-description) u200)) ERR-INVALID-STRING-LENGTH)
        (map-set datasets { data-id: data-id } (merge dataset { description: new-description }))
        (print { event: "dataset-description-updated", data-id: data-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; Reactivate a previously deactivated dataset (owner only)
;; @param data-id: ID of the dataset to reactivate
;; @returns: ok true on success, error otherwise
(define-public (reactivate-dataset (data-id uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (not (get is-active dataset)) ERR-ALREADY-EXISTS)
        (map-set datasets { data-id: data-id } (merge dataset { is-active: true }))
        (print { event: "dataset-reactivated", data-id: data-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; Transfer dataset ownership to a new principal (current owner only)
;; @param data-id: ID of the dataset
;; @param new-owner: Principal to transfer ownership to
;; @returns: ok true on success, error otherwise
(define-public (transfer-dataset-ownership (data-id uint) (new-owner principal))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (not (is-eq new-owner tx-sender)) ERR-INVALID-INPUT)
        (asserts! (not (is-eq new-owner (as-contract tx-sender))) ERR-INVALID-INPUT)
        (map-set datasets { data-id: data-id } (merge dataset { owner: new-owner }))
        (print { event: "dataset-ownership-transferred", data-id: data-id,
                 from: tx-sender, to: new-owner, block: stacks-block-height })
        (ok true)
    )
)

;; Extend an existing access grant by another ACCESS-EXPIRY-BLOCKS period (owner only)
;; @param data-id: ID of the dataset
;; @param user: Principal whose access to extend
;; @returns: ok true on success, error otherwise
(define-public (extend-access (data-id uint) (user principal))
    (let (
        (dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND))
        (rights (unwrap! (map-get? access-rights { data-id: data-id, user: user }) ERR-ACCESS-RIGHT-NOT-FOUND))
    )
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        (map-set access-rights { data-id: data-id, user: user }
            (merge rights { expires-at: (+ stacks-block-height ACCESS-EXPIRY-BLOCKS) })
        )
        (print { event: "access-extended", data-id: data-id, user: user,
                 new-expires-at: (+ stacks-block-height ACCESS-EXPIRY-BLOCKS),
                 extended-by: tx-sender, block: stacks-block-height })
        (ok true)
    )
)

;; @notice Returns all stored fields for a given dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(dataset) if found, none otherwise.
(define-read-only (get-dataset (data-id uint))
    (map-get? datasets { data-id: data-id })
)

;; @notice Returns the access-rights record for a user on a given dataset.
;; @param data-id The dataset ID.
;; @param user The principal whose access record to retrieve.
;; @return Some(access-right) if found, none otherwise.
(define-read-only (get-access (data-id uint) (user principal))
    (map-get? access-rights { data-id: data-id, user: user })
)

;; @notice Checks whether a user currently has non-expired access to a dataset.
;; @param data-id The dataset ID.
;; @param user The principal to check.
;; @return ok(true) if access exists and has not expired, ok(false) otherwise.
(define-read-only (has-valid-access (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (ok (< stacks-block-height (get expires-at rights)))
        (ok false)
    )
)

;; @notice Returns the next auto-increment ID that will be assigned to the next registered dataset.
;; @dev Useful for frontends to predict the data-id before submitting a transaction.
;; @return ok(uint) - the next available data-id.
(define-read-only (get-next-data-id)
    (ok (var-get next-data-id))
)

;; @notice Returns the owner principal of a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(principal) if dataset exists, none otherwise.
(define-read-only (get-dataset-owner (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get owner dataset))
        none
    )
)

;; @notice Returns the total number of datasets ever registered (including deactivated).
;; @return ok(uint) - the all-time dataset registration count.
(define-read-only (get-total-datasets)
    (ok (var-get total-datasets))
)

;; @notice Returns true if the given dataset exists and is active.
;; @param data-id The dataset ID to check.
;; @return ok(true) if active, ok(false) if inactive or not found.
(define-read-only (is-dataset-active (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (ok (get is-active dataset))
        (ok false)
    )
)

;; @notice Returns the current price of a dataset in microSTX.
;; @param data-id The dataset ID to look up.
;; @return Some(uint) if dataset exists, none otherwise.
(define-read-only (get-dataset-price (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get price dataset))
        none
    )
)

;; @notice Returns the block height at which a user's access expires.
;; @param data-id The dataset ID.
;; @param user The principal whose access to check.
;; @return Some(uint) if access exists, none if user has no access record.
(define-read-only (get-access-expiry (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (some (get expires-at rights))
        none
    )
)

;; @notice Returns the access level granted to a specific user on a dataset.
;; @param data-id The dataset ID.
;; @param user The principal to check.
;; @return Some(uint) if access exists, none otherwise.
(define-read-only (get-user-access-level (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (some (get access-level rights))
        none
    )
)

;; @notice Returns the principal that granted access to a specific user on a dataset.
;; @param data-id The dataset ID.
;; @param user The principal whose grant to look up.
;; @return Some(principal) if access record exists, none otherwise.
(define-read-only (get-access-granted-by (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (some (get granted-by rights))
        none
    )
)

;; @notice Returns the block height at which a dataset was registered.
;; @param data-id The dataset ID to look up.
;; @return Some(uint) if dataset exists, none otherwise.
(define-read-only (get-dataset-created-at (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get created-at dataset))
        none
    )
)

;; @notice Returns the storage URL of a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(string-utf8) if dataset exists, none otherwise.
(define-read-only (get-dataset-storage-url (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get storage-url dataset))
        none
    )
)

;; @notice Returns the description of a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(string-utf8) if dataset exists, none otherwise.
(define-read-only (get-dataset-description (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get description dataset))
        none
    )
)

;; @notice Returns the metadata hash of a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(buff 32) if dataset exists, none otherwise.
(define-read-only (get-dataset-metadata-hash (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get metadata-hash dataset))
        none
    )
)

;; @notice Checks whether a user has any access record for a dataset (expired or not).
;; @dev Use has-valid-access to check non-expired access. This checks bare existence.
;; @param data-id The dataset ID.
;; @param user The principal to check.
;; @return ok(true) if any access record exists, ok(false) otherwise.
(define-read-only (has-any-access (data-id uint) (user principal))
    (ok (is-some (map-get? access-rights { data-id: data-id, user: user })))
)

;; @notice Returns the access level configured for a dataset (not a user's grant — the dataset's own level).
;; @param data-id The dataset ID to look up.
;; @return Some(uint) if dataset exists, none otherwise.
(define-read-only (get-dataset-access-level (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some (get access-level dataset))
        none
    )
)

;; @notice Returns a summary snapshot of key dataset fields.
;; @param data-id The dataset ID to summarise.
;; @return Some(tuple) with owner, price, access-level, and is-active flag.
(define-read-only (get-dataset-summary (data-id uint))
    (match (map-get? datasets { data-id: data-id })
        dataset (some {
            owner: (get owner dataset),
            price: (get price dataset),
            access-level: (get access-level dataset),
            is-active: (get is-active dataset),
            created-at: (get created-at dataset)
        })
        none
    )
)
