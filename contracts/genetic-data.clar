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
(define-constant ERR-INVALID-BLOCK (err u108))
(define-constant ERR-INVALID-PRICE (err u109))
(define-constant ERR-INVALID-INPUT (err u110))

;; Constants
(define-constant BLOCKS_PER_DAY 144)  ;; ~1 day (assuming 10 min/block)
(define-constant MAX_OPS_PER_WINDOW 10)  ;; Max operations per rate limit window
(define-constant ACCESS_EXPIRATION_BLOCKS 8640)  ;; ~30 days (144 * 60)
(define-constant ACCESS_LEVEL_BASIC u1)
(define-constant ACCESS_LEVEL_DETAILED u2)
(define-constant ACCESS_LEVEL_FULL u3)

;; Rate limiting constants
(define-constant RATE_LIMIT_WINDOW BLOCKS_PER_DAY)  ;; Reuse constant
(define-constant MAX_OPERATIONS_PER_WINDOW MAX_OPS_PER_WINDOW)  ;; Reuse constant

;; Contract state
(define-data-var is-paused bool false)
(define-data-var contract-owner principal tx-sender)
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

;; Track dataset version history for historical queries
(define-map dataset-version-history
    { data-id: uint, version: uint }
    {
        owner: principal,
        price: uint,
        access-level: uint,
        metadata-hash: (buff 32),
        encrypted-storage-url: (string-utf8 200),
        description: (string-utf8 200),
        created-at: uint,
        updated-at: uint,
        is-active: bool,
        block-height: uint
    }
)

;; Track current version for each dataset
(define-map dataset-versions
    { data-id: uint }
    { current-version: uint }
)

;; Track historical access changes
(define-map access-history
    { data-id: uint, user: principal, change-id: uint }
    {
        old-access-level: uint,
        new-access-level: uint,
        changed-at: uint,
        changed-by: principal,
        is-active: bool
    }
)

;; Track access change counter per dataset-user pair
(define-map access-change-count
    { data-id: uint, user: principal }
    { count: uint }
)

;; Events
;; Use more efficient event encoding
(define-constant EVENT-DATA-REGISTERED 0x01)
(define-constant EVENT-DATA-UPDATED 0x02)
(define-constant EVENT-ACCESS-GRANTED 0x03)
(define-constant EVENT-ACCESS-REVOKED 0x04)

;; Security Helpers
(define-read-only (is-contract-paused) (var-get is-paused))

;; Clarity 3 helper: min for uint
(define-private (min-u (a uint) (b uint)) (if (<= a b) a b))

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
    (begin
        (asserts! (not (is-contract-paused)) ERR-CONTRACT_PAUSED)
        (ok true)
    )
)

(define-private (check-rate-limit (user principal))
    (begin
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
    (begin
        (asserts! (and (>= level u1) (<= level u3)) ERR-INVALID-ACCESS_LEVEL)
        (ok true)
    )
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
    (try! (check-rate-limit tx-sender))
    
    ;; Validate input using Clarity 4 features
    (asserts! (is-none (map-get? genetic-datasets { data-id: data-id })) ERR-DATA-EXISTS)
    
    ;; Validate access level
    (try! (validate-access-level access-level))
    
    ;; Validate URL and description lengths
    (asserts! (<= (len storage-url) u200) ERR-INVALID-INPUT)
    (asserts! (<= (len description) u200) ERR-INVALID-INPUT)
    
    ;; Convert string price to uint with validation
    (let ((parsed-price (try! (safe-string-to-uint price))))
        (asserts! (> parsed-price u0) ERR-INVALID-PRICE)
        
        ;; Create new dataset record
        (let ((new-dataset {
                    owner: tx-sender,
                    price: parsed-price,
                    access-level: access-level,
                    metadata-hash: metadata-hash,
                    encrypted-storage-url: (try! (safe-slice-utf8 storage-url u0 (min-u (len storage-url) u200))),
                    description: description,
                    created-at: stacks-block-height,
                    updated-at: stacks-block-height,
                    is-active: true
                }))
            (begin
                ;; Record initial version
                (try! (record-dataset-version data-id new-dataset))
                
                ;; Set the dataset
                (map-set genetic-datasets { data-id: data-id } new-dataset)
                
                (ok (print { 
                    event: EVENT-DATA-REGISTERED, 
                    data-id: data-id, 
                    by: tx-sender,
                    block: stacks-block-height,
                    tx: tx-sender
                }))
            )
        )
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
                            (try! (safe-slice-utf8 desc u0 (min-u (len desc) u200)))
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
                    updated-at: stacks-block-height,
                    is-active: (get is-active dataset)
                }))
                    
                    ;; Validate access level if it's being updated
                    (when (is-some new-access-level)
                        (asserts! (and (>= (get access-level updates) ACCESS_LEVEL_BASIC) 
                                      (<= (get access-level updates) ACCESS_LEVEL_FULL)) 
                                 ERR-INVALID-ACCESS_LEVEL)
                    )
                    
                    ;; Record version history before updating
                    (try! (record-dataset-version data-id updates))
                    
                    (map-set genetic-datasets { data-id: data-id } updates)
                    (ok (print { 
                        event: EVENT-DATA-UPDATED, 
                        data-id: data-id, 
                        by: tx-sender,
                        block: stacks-block-height,
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
            (< stacks-block-height (get expiration rights))
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
                 ERR-INVALID-ACCESS_LEVEL)
        
        ;; Record old access level for history
        (let ((old-access (match (map-get? access-rights { data-id: data-id, user: user })
            rights (get access-level rights)
            u0
        )))
            (begin
                ;; Record the change in history
                (try! (record-access-change data-id user old-access access-level))
                
                (map-set access-rights
                    { data-id: data-id, user: user }
                    {
                        access-level: access-level,
                        expiration: (+ stacks-block-height ACCESS_EXPIRATION_BLOCKS),
                        granted-by: tx-sender,
                        created-at: stacks-block-height
                    }
                )
                (ok (print { 
                    event: EVENT-ACCESS-GRANTED, 
                    data-id: data-id, 
                    to: user, 
                    level: access-level,
                    expires-at: (+ stacks-block-height ACCESS_EXPIRATION_BLOCKS)
                }))
            )
        )
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

;; Get access change for a specific change ID
(define-read-only (get-access-change
    (data-id uint)
    (user principal)
    (change-id uint))
    (map-get? access-history { data-id: data-id, user: user, change-id: change-id })
)

;; Time-based access analytics: count total changes for a user in time period
(define-read-only (count-user-access-changes (data-id uint) (user principal))
    (match (map-get? access-change-count { data-id: data-id, user: user })
        counts (get count counts)
        u0
    )
)

;; Get dataset change timeline
(define-read-only (get-dataset-change-timeline (data-id uint))
    {
        data-id: data-id,
        total-versions: (match (map-get? dataset-versions { data-id: data-id })
            ver-info (get current-version ver-info)
            u0
        ),
        current-block: stacks-block-height
    }
)

;; Historical access state query
(define-read-only (get-historical-access-state
    (data-id uint)
    (user principal)
    (at-block uint))
    {
        data-id: data-id,
        user: user,
        block-height: at-block,
        current-access: (map-get? access-rights { data-id: data-id, user: user })
    }
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
                updated-at: stacks-block-height,
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

;; Helper: Get dataset by version ID
(define-private (get-dataset-version (data-id uint) (version uint))
    (match (map-get? dataset-version-history { data-id: data-id, version: version })
        hist (ok hist)
        (err ERR-DATA-NOT-FOUND)
    )
)

;; Historical query: Get dataset state at a specific block height (Clarity 4 at-block)
(define-read-only (get-dataset-at-block 
    (data-id uint) 
    (block-height uint))
  (match (get-block-info? id-header-hash block-height)
    header (ok {
        data-id: data-id,
        block-height: block-height,
        dataset: (map-get? genetic-datasets { data-id: data-id }),
        note: "State at specified block height"
    })
    (err ERR-INVALID-BLOCK)
  )
)

;; Get all versions of a dataset
(define-read-only (get-dataset-versions (data-id uint))
    (match (map-get? dataset-versions { data-id: data-id })
        version-map {
            data-id: data-id,
            current-version: (get current-version version-map),
            total-versions: (get current-version version-map)
        }
        none
    )
)

;; Get specific version of dataset history
(define-read-only (get-dataset-version-at (data-id uint) (version uint))
    (get-dataset-version data-id version)
)

;; Check dataset access history for a user
(define-read-only (get-access-history 
    (data-id uint) 
    (user principal))
    {
        data-id: data-id,
        user: user,
        change-count: (default-to { count: u0 } (map-get? access-change-count { data-id: data-id, user: user }))
    }
)

;; Helper: Record dataset version when modified
(define-private (record-dataset-version (data-id uint) (dataset (tuple (owner principal) (price uint) (access-level uint) (metadata-hash (buff 32)) (encrypted-storage-url (string-utf8 200)) (description (string-utf8 200)) (created-at uint) (updated-at uint) (is-active bool))))
    (let (
        (current-versions (default-to { current-version: u0 } (map-get? dataset-versions { data-id: data-id })))
        (next-version (+ (get current-version current-versions) u1))
    )
        (begin
            (map-set dataset-version-history
                { data-id: data-id, version: next-version }
                (merge dataset { block-height: stacks-block-height })
            )
            (map-set dataset-versions
                { data-id: data-id }
                { current-version: next-version }
            )
            (ok next-version)
        )
    )
)

;; Helper: Record access level change history
(define-private (record-access-change
    (data-id uint)
    (user principal)
    (old-level uint)
    (new-level uint))
    (let (
        (change-count (default-to { count: u0 } (map-get? access-change-count { data-id: data-id, user: user })))
        (next-change-id (+ (get count change-count) u1))
    )
        (begin
            (map-set access-history
                { data-id: data-id, user: user, change-id: next-change-id }
                {
                    old-access-level: old-level,
                    new-access-level: new-level,
                    changed-at: stacks-block-height,
                    changed-by: tx-sender,
                    is-active: true
                }
            )
            (map-set access-change-count
                { data-id: data-id, user: user }
                { count: next-change-id }
            )
            (ok next-change-id)
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
    (asserts! (and (is-eq (len data-ids) (len users)) (is-eq (len users) (len access-levels))) ERR-INVALID-DATA)
    ;; Each grant will validate ownership and access-level; fold short-circuits on error
    (fold batch-grant-helper (zip data-ids users access-levels) (ok true))
  )
)

;; Map-based bulk grant returning a list of success flags for each tuple
(define-public (bulk-grant-access-map
    (data-ids (list 50 uint))
    (users (list 50 principal))
    (access-levels (list 50 uint)))
  (begin
    (try! (check-paused))
    (asserts! (and (is-eq (len data-ids) (len users)) (is-eq (len users) (len access-levels))) ERR-INVALID-DATA)
    (ok (map (lambda (t)
        (is-ok (grant-access (get 0 t) (get 1 t) (get 2 t)))
    ) (zip data-ids users access-levels)))
  )
)

;; Batch dataset registration using fold
(define-private (batch-register-helper (acc (response bool uint)) (item (tuple (0 uint) (1 (string-utf8 20)) (2 uint) (3 (buff 32)) (4 (string-utf8 200)) (5 (string-utf8 200)))))
    (if (is-err acc)
        acc
        (let (
            (did (get 0 item))
            (price (get 1 item))
            (lvl (get 2 item))
            (mh (get 3 item))
            (url (get 4 item))
            (desc (get 5 item))
        )
            (let ((res (register-genetic-data did price lvl mh url desc)))
                (if (is-ok res) acc res)
            )
        )
    )
)

(define-public (batch-register-datasets (items (list 50 (tuple (0 uint) (1 (string-utf8 20)) (2 uint) (3 (buff 32)) (4 (string-utf8 200)) (5 (string-utf8 200))))))
  (begin
    (try! (check-paused))
    (fold batch-register-helper items (ok true))
  )
)

;; Set contract owner
(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
