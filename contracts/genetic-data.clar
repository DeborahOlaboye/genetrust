;; dataset-registry.clar
;; Core contract for dataset registry and access control on the Stacks blockchain
;; Handles dataset ownership, metadata, pricing tiers, and access delegation

;; Import trait and access control
(impl-trait .dataset-registry-trait.dataset-registry-trait)
(use-trait access-trait .access-control.access-control-trait)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-DATA (err u101))
(define-constant ERR-DATA-EXISTS (err u102))
(define-constant ERR-DATA-NOT-FOUND (err u103))
(define-constant ERR-INVALID-ACCESS_LEVEL (err u104))
(define-constant ERR-RATE_LIMIT (err u105))
(define-constant ERR-CONTRACT_PAUSED (err u106))
(define-constant ERR-ACCESS_DENIED (err u107))

;; Constants
(define-constant BLOCKS_PER_DAY 144)  ;; ~1 day (assuming 10 min/block)
(define-constant MAX_OPS_PER_WINDOW 10)  ;; Max operations per rate limit window
(define-constant ACCESS_EXPIRATION_BLOCKS 8640)  ;; ~30 days (144 * 60)
(define-constant ACCESS_LEVEL_BASIC u1)
(define-constant ACCESS_LEVEL_DETAILED u2)
(define-constant ACCESS_LEVEL_FULL u3

;; Rate limiting constants
(define-constant RATE_LIMIT_WINDOW BLOCKS_PER_DAY)  ;; Reuse constant
(define-constant MAX_OPERATIONS_PER_WINDOW MAX_OPS_PER_WINDOW  ;; Reuse constant

;; Contract state
(define-data-var is-paused bool false)
;; Remove unused vars to save storage
(define-data-var operation-window-start uint u0)  ;; Keep only necessary vars

;; Data structures
;; Optimized data structure with minimal storage
(define-map genetic-datasets
    { data-id: uint }
    {
        owner: principal,
        price: uint,
        access-level: uint,               ;; Using constants: ACCESS_LEVEL_*
        metadata-hash: (buff 32),         ;; Hash of genetic data metadata
        encrypted-storage-url: (string-utf8 200),  ;; Reduced from 256 to save gas
        description: (string-utf8 200),   ;; Reduced from 256 to save gas
        created-at: uint,                 ;; Block height when created
        updated-at: uint,                 ;; Block height when last updated
        is-active: bool                   ;; Whether the dataset is active
    }
)

;; Track access rights for each data set
(define-map access-rights
    { data-id: uint, user: principal }
    {
        access-level: uint,               ;; Using constants: ACCESS_LEVEL_*
        expiration: uint,                 ;; Block height when access expires
        granted-by: principal,            ;; Who granted the access
        created-at: uint                  ;; When access was granted
    }
)

;; Track rate limiting for operations
(define-map operation-counts
    { user: principal }
    {
        count: uint,
        window-start: uint
    }
)

;; Events
;; Use more efficient event encoding
(define-constant EVENT-DATA-REGISTERED 0x01)
(define-constant EVENT-DATA-UPDATED 0x02)
(define-constant EVENT-ACCESS-GRANTED 0x03)
(define-constant EVENT-ACCESS-REVOKED 0x04)

;; Security Helpers
(define-read-only (is-contract-paused) (var-get is-paused))

;; Clarity 4 Helper: Safe string to uint conversion
(define-private (safe-string-to-uint (input (string-utf8 100)))
    (match (string-to-uint? input)
        value (ok value)
        error (err ERR-INVALID-DATA)
    )
)

;; Clarity 4 Helper: Safe string slicing with bounds checking
(define-private (safe-slice-utf8 (input (string-utf8 500)) (start uint) (len uint))
    (match (slice? input start len)
        sliced (ok sliced)
        error (err ERR-INVALID-DATA)
    )
)

(define-private (check-paused)
    (asserts! (not (is-contract-paused)) ERR-CONTRACT_PAUSED)
    (ok true)
)

(define-private (check-rate-limit (user principal))
    (let (
        (current-window (get-window-start))
        (user-stats (default-to 
            { count: u1, window-start: current-window }
            (map-get? operation-counts { user: user })
        ))
    )
        (if (is-eq (get window-start user-stats) current-window)
            (let ((new-count (+ (get count user-stats) u1)))
                (asserts! (<= new-count MAX_OPERATIONS_PER_WINDOW) ERR-RATE_LIMIT)
                (map-set operation-counts 
                    { user: user } 
                    { count: new-count, window-start: current-window }
                )
            )
            (map-set operation-counts 
                { user: user } 
                { count: u1, window-start: current-window }
            )
        )
    )
    (ok true)
)

(define-read-only (get-window-start)
    (let ((current-block stacks-block-height))
        (- current-block (mod current-block RATE_LIMIT_WINDOW))
    )
)

(define-read-only (get-dataset-owner (data-id uint))
    (match (map-get? genetic-datasets { data-id: data-id })
        dataset (some (get owner dataset))
        none
    )
)

(define-private (only-owner (data-id uint))
    (let ((owner (unwrap! (get-dataset-owner data-id) ERR-DATA-NOT-FOUND)))
        (asserts! (is-eq owner tx-sender) ERR-NOT-AUTHORIZED)
        (ok (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND))
    )
)

(define-private (validate-access-level (level uint))
    (asserts! (and (>= level u1) (<= level u3)) ERR-INVALID-ACCESS_LEVEL)
    (ok true)
)

;; Register a new genetic dataset
(define-public (register-genetic-data
    (data-id uint)
    (price (string-utf8 20))  ;; Accept price as string for better UX
    (access-level uint)
    (metadata-hash (buff 32))
    (storage-url (string-utf8 200))
    (description (string-utf8 200)))
    
    (try! (check-paused))
    
    ;; Validate input using Clarity 4 features
    (asserts! (is-none (map-get? genetic-datasets { data-id: data-id })) ERR-DATA-EXISTS)
    
    ;; Convert string price to uint with validation
    (let ((parsed-price (try! (safe-string-to-uint price))))
        
        ;; Validate access level using helper function
        (try! (validate-access-level access-level))
        
        ;; Process description with safe slicing
        (let ((safe-description (unwrap! (safe-slice-utf8 description u0 (min (len description) u200)) "")))
            
            ;; Set the dataset with enhanced data
            (map-set genetic-datasets
                { data-id: data-id }
                {
                    owner: tx-sender,
                    price: parsed-price,
                    access-level: access-level,
                    metadata-hash: metadata-hash,
                    encrypted-storage-url: (unwrap! (safe-slice-utf8 storage-url u0 (min (len storage-url) u200)) ""),
                    description: safe-description,
                    created-at: block-height,
                    updated-at: block-height,
                    is-active: true
                }
            )
        )
        
        (ok (print { 
            event: EVENT-DATA-REGISTERED, 
            data-id: data-id, 
            by: tx-sender,
            block: block-height,
            tx: tx-sender
        }))
    )
)

;; Update dataset metadata
(define-public (update-genetic-data
    (data-id uint)
    (new-price (optional (string-utf8 20)))
    (new-access-level (optional uint))
    (new-metadata-hash (optional (buff 32)))
    (new-storage-url (optional (string-utf8 200)))
    (new-description (optional (string-utf8 200)))
)
    (try! (check-paused))
    (try! (check-rate-limit tx-sender))
    
    (let ((dataset (try! (only-owner data-id))))
        
        ;; Convert string price to uint if provided (using Clarity 4's string-to-uint?)
        (let ((parsed-price 
                (if (is-some new-price) 
                    (try! (safe-string-to-uint (unwrap-panic new-price)))
                    (get price dataset)
                )))
            
            ;; Process description with safe slicing if provided
            (let ((processed-description 
                    (if (is-some new-description)
                        (let ((desc (unwrap-panic new-description)))
                            ;; Truncate to first 200 chars if needed using safe-slice-utf8
                            (unwrap! (safe-slice-utf8 desc u0 (min (len desc) u200)) "")
                        )
                        (get description dataset)
                    )))
                
                ;; Only update what's provided
                (let ((updates {
                    owner: (get owner dataset),
                    price: parsed-price,
                    access-level: (default-to (get access-level dataset) new-access-level),
                    metadata-hash: (default-to (get metadata-hash dataset) new-metadata-hash),
                    encrypted-storage-url: (default-to (get encrypted-storage-url dataset) new-storage-url),
                    description: processed-description,
                    created-at: (get created-at dataset),
                    updated-at: block-height,
                    is-active: (get is-active dataset)
                }))
                    
                    ;; Validate access level if it's being updated
                    (when (is-some new-access-level)
                        (asserts! (and (>= (get access-level updates) ACCESS_LEVEL_BASIC) 
                                      (<= (get access-level updates) ACCESS_LEVEL_FULL)) 
                                 ERR-INVALID-ACCESS-LEVEL)
                    )
                    
                    (map-set genetic-datasets { data-id: data-id } updates)
                    (ok (print { 
                        event: EVENT-DATA-UPDATED, 
                        data-id: data-id, 
                        by: tx-sender,
                        block: block-height,
                        tx: tx-sender
                    }))
                )
            )
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
(define-read-only (has-access (data-id uint) (user principal) (required-level uint))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (and 
            (>= (get access-level rights) required-level)
            (< block-height (get expiration rights))
        )
        false
    )
)

(define-read-only (verify-access-rights (data-id uint) (user principal))
    (has-access data-id user ACCESS_LEVEL_BASIC)
)

;; Grant access - implements trait function
(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (try! (check-paused))
    
    (let ((dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND)))
        (try! (only-owner data-id))
        
        ;; Ensure access level is valid and doesn't exceed dataset's max level
        (asserts! (and (>= access-level ACCESS_LEVEL_BASIC) 
                      (<= access-level (get access-level dataset))) 
                 ERR-INVALID-ACCESS-LEVEL)
        
        (map-set access-rights
            { data-id: data-id, user: user }
            {
                access-level: access-level,
                expiration: (+ block-height ACCESS_EXPIRATION_BLOCKS),
                granted-by: tx-sender,
                created-at: block-height
            }
        )
        (ok (print { 
            event: EVENT-ACCESS-GRANTED, 
            data-id: data-id, 
            to: user, 
            level: access-level,
            expires-at: (+ block-height ACCESS_EXPIRATION_BLOCKS)
        }))
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
    (try! (check-paused))
    
    (let ((dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND)))
        (try! (only-owner data-id))
        
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
                updated-at: block-height,
                is-active: (get is-active dataset)
            }
        )
        (ok (print { 
            event: "ownership-transferred", 
            data-id: data-id, 
            from: tx-sender, 
            to: new-owner 
        }))
    )
)

;; Batch operations using Clarity 4 fold/map
;; Helper to grant access sequentially with short-circuit on first error
(define-private (batch-grant-helper (acc (response bool uint)) (item (tuple (0 uint) (1 principal) (2 uint))))
    (if (is-err acc)
        acc
        (let (
            (gid (get 0 item))
            (usr (get 1 item))
            (lvl (get 2 item))
        )
            (let ((res (grant-access gid usr lvl)))
                (if (is-ok res) acc res)
            )
        )
    )
)

;; Public batch grant that zips three lists into tuples and folds over them
(define-public (batch-grant-access 
    (data-ids (list 50 uint))
    (users (list 50 principal))
    (access-levels (list 50 uint)))
  (begin
    (try! (check-paused))
    ;; Each grant will validate ownership and access-level; fold short-circuits on error
    (fold batch-grant-helper (zip data-ids users access-levels) (ok true))
  )
)

;; Set contract owner
(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
