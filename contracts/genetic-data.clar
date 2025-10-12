;; dataset-registry.clar
;; Core contract for dataset registry and access control on the Stacks blockchain
;; Handles dataset ownership, metadata, pricing tiers, and access delegation

;; Import trait (renamed)
(impl-trait .dataset-registry-trait.dataset-registry-trait)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-DATA (err u101))
(define-constant ERR-DATA-EXISTS (err u102))
(define-constant ERR-DATA-NOT-FOUND (err u103))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u104))

;; Data structures
(define-map genetic-datasets
    { data-id: uint }
    {
        owner: principal,
        price: uint,
        access-level: uint,
        metadata-hash: (buff 32),          ;; Hash of genetic data metadata
        encrypted-storage-url: (string-utf8 256),  ;; IPFS or other storage URL
        description: (string-utf8 256),     ;; Brief description of the dataset
        created-at: uint,                  ;; Block height when created
        updated-at: uint                   ;; Block height when last updated
    }
)

;; Track access rights for each data set
(define-map access-rights
    { data-id: uint, user: principal }
    {
        access-level: uint,                ;; 1=basic, 2=detailed, 3=full
        expiration: uint,                  ;; Block height when access expires
        granted-by: principal              ;; Who granted the access
    }
)

;; Administrative functions
(define-data-var contract-owner principal tx-sender)

;; Register a new genetic dataset
(define-public (register-genetic-data
    (data-id uint)
    (price uint)
    (access-level uint)
    (metadata-hash (buff 32))
    (storage-url (string-utf8 256))
    (description (string-utf8 256)))
    
    (let ((existing-data (map-get? genetic-datasets { data-id: data-id })))
        (asserts! (is-none existing-data) ERR-DATA-EXISTS)
        (asserts! (> access-level u0) ERR-INVALID-ACCESS-LEVEL)
        (asserts! (<= access-level u3) ERR-INVALID-ACCESS-LEVEL)
        
        (map-set genetic-datasets
            { data-id: data-id }
            {
                owner: tx-sender,
                price: price,
                access-level: access-level,
                metadata-hash: metadata-hash,
                encrypted-storage-url: storage-url,
                description: description,
                created-at: stacks-block-height,
                updated-at: stacks-block-height
            }
        )
        (ok true)
    )
)

;; Update dataset metadata
(define-public (update-genetic-data
    (data-id uint)
    (new-price (optional uint))
    (new-access-level (optional uint))
    (new-metadata-hash (optional (buff 32)))
    (new-storage-url (optional (string-utf8 256)))
    (new-description (optional (string-utf8 256))))
    
    (let ((dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND)))
        ;; Only the owner can update
        (asserts! (is-eq (get owner dataset) tx-sender) ERR-NOT-AUTHORIZED)
        
        ;; Prepare updated values
        (let (
            (updated-price (default-to (get price dataset) new-price))
            (updated-access-level (default-to (get access-level dataset) new-access-level))
            (updated-metadata-hash (default-to (get metadata-hash dataset) new-metadata-hash))
            (updated-storage-url (default-to (get encrypted-storage-url dataset) new-storage-url))
            (updated-description (default-to (get description dataset) new-description))
        )
            ;; Validate access level range
            (asserts! (> updated-access-level u0) ERR-INVALID-ACCESS-LEVEL)
            (asserts! (<= updated-access-level u3) ERR-INVALID-ACCESS-LEVEL)
            
            (map-set genetic-datasets
                { data-id: data-id }
                {
                    owner: (get owner dataset),
                    price: updated-price,
                    access-level: updated-access-level,
                    metadata-hash: updated-metadata-hash,
                    encrypted-storage-url: updated-storage-url,
                    description: updated-description,
                    created-at: (get created-at dataset),
                    updated-at: stacks-block-height
                }
            )
            (ok true)
        )
    )
)

;; Implement trait functions

;; Get data details - implements trait function
(define-public (get-data-details (data-id uint))
    (match (map-get? genetic-datasets { data-id: data-id })
        dataset (ok {
            owner: (get owner dataset),
            price: (get price dataset),
            access-level: (get access-level dataset),
            metadata-hash: (get metadata-hash dataset)
        })
        (err u404)
    )
)

;; Verify access rights - implements trait function
(define-public (verify-access-rights (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (ok (< stacks-block-height (get expiration rights)))
        (err u404)
    )
)

;; Grant access - implements trait function
(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (let ((dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND)))
        ;; Only the owner can grant access
        (asserts! (is-eq (get owner dataset) tx-sender) ERR-NOT-AUTHORIZED)
        
        ;; Ensure access level is valid
        (asserts! (> access-level u0) ERR-INVALID-ACCESS-LEVEL)
        (asserts! (<= access-level (get access-level dataset)) ERR-INVALID-ACCESS-LEVEL)
        
        (map-set access-rights
            { data-id: data-id, user: user }
            {
                access-level: access-level,
                expiration: (+ stacks-block-height u8640), ;; Access expires after ~30 days
                granted-by: tx-sender
            }
        )
        (ok true)
    )
)

;; Read-only functions for data discovery

;; Get dataset details including description and URLs
(define-read-only (get-dataset-details (data-id uint))
    (map-get? genetic-datasets { data-id: data-id })
)

;; Check if user has access to a dataset
(define-read-only (get-user-access (data-id uint) (user principal))
    (map-get? access-rights { data-id: data-id, user: user })
)

;; Transfer ownership of a dataset
(define-public (transfer-ownership (data-id uint) (new-owner principal))
    (let ((dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND)))
        ;; Only the owner can transfer ownership
        (asserts! (is-eq (get owner dataset) tx-sender) ERR-NOT-AUTHORIZED)
        
        (map-set genetic-datasets
            { data-id: data-id }
            {
                owner: new-owner,
                price: (get price dataset),
                access-level: (get access-level dataset),
                metadata-hash: (get metadata-hash dataset),
                encrypted-storage-url: (get encrypted-storage-url dataset),
                description: (get description dataset),
                created-at: (get created-at dataset),
                updated-at: stacks-block-height
            }
        )
        (ok true)
    )
)

;; Set contract owner
(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
