;; exchange.clar
;; Core exchange for genetic data trading with expanded functionality
;; Upgraded to Clarity 4 with enhanced features

;; Clarity 4 Helpers
(define-constant MAX_STRING_LENGTH u500)

;; Safe string to uint conversion using Clarity 4's string-to-uint?
(define-private (safe-string-to-uint (input (string-utf8 100)))
    (match (string-to-uint? input)
        value (ok value)
        error (err ERR-INVALID-PRICE)
    )
)

;; Safe string slicing with bounds checking
(define-private (safe-slice (input (string-utf8 500)) (start uint) (len uint))
    (match (slice? input start len)
        sliced (ok sliced)
        error (err ERR-INVALID-DATA)
    )
)

;; Safe string replacement using replace-at?
(define-private (safe-replace (input (string-utf8 500)) (at uint) (replacement (string-utf8 1)))
    (match (replace-at? input at replacement)
        replaced (ok replaced)
        error (err ERR-INVALID-DATA)
    )
)

;; Import trait (renamed)
(impl-trait .dataset-registry-trait.dataset-registry-trait)

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-PRICE (err u101))
(define-constant ERR-LISTING-NOT-FOUND (err u102))
(define-constant ERR-INSUFFICIENT-BALANCE (err u103))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u104))
(define-constant ERR-NO-VERIFIED-PROOFS (err u105))
(define-constant ERR-NO-VALID-CONSENT (err u106))
(define-constant ERR-PAYMENT-FAILED (err u107))
(define-constant ERR-ESCROW-EXISTS (err u108))
(define-constant ERR-ESCROW-NOT-FOUND (err u109))
(define-constant ERR-EXPIRED (err u110))
(define-constant ERR-NOT-FOUND (err u111))

;; Data maps
(define-map listings
    { listing-id: uint }
    {
        owner: principal,
        price: uint,
        data-contract: principal,
        data-id: uint,
        active: bool,
        access-level: uint,
        metadata-hash: (buff 32),
        requires-verification: bool,     ;; Requires verified proofs
        platform-fee-percent: uint,      ;; Fee percentage (in basis points, e.g. 250 = 2.5%)
        created-at: uint,                ;; When listing was created
        updated-at: uint                 ;; When listing was last updated
    }
)

(define-map user-purchases
    { user: principal, listing-id: uint }
    {
        purchase-time: uint,
        access-expiry: uint,
        access-level: uint,
        transaction-id: (buff 32),       ;; Transaction ID for the purchase
        purchase-price: uint             ;; Price paid for the purchase
    }
)

;; Price tiers for different access levels
(define-map access-level-pricing
    { listing-id: uint, access-level: uint }
    {
        price: uint                      ;; Price for this access level
    }
)

;; Escrow system for purchases
(define-map purchase-escrows
    { escrow-id: uint }
    {
        listing-id: uint,
        buyer: principal,
        amount: uint,
        created-at: uint,
        expires-at: uint,
        released: bool,
        refunded: bool,
        access-level: uint
    }
)

;; Counters
(define-data-var next-escrow-id uint u1)

;; Platform fee configuration
(define-data-var platform-fee-percent uint u250)  ;; Default 2.5%
(define-data-var platform-address principal tx-sender)

;; Administrative functions
(define-data-var marketplace-admin principal tx-sender)

(define-public (set-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set marketplace-admin new-admin))
    )
)

(define-public (set-platform-fee (new-fee-percent uint))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (<= new-fee-percent u1000) ERR-INVALID-PRICE)  ;; Max fee is 10%
        (ok (var-set platform-fee-percent new-fee-percent))
    )
)

(define-public (set-platform-address (new-address principal))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set platform-address new-address))
    )
)

;; Listing management
(define-public (create-listing 
    (listing-id uint) 
    (price (string-utf8 20))  ;; Changed to string for better UX
    (data-contract principal)
    (data-id uint)
    (access-level uint)
    (metadata-hash (buff 32))
    (requires-verification bool)
    (description (string-utf8 500)))  ;; Added description for better metadata handling
    
    (let (
        (parsed-price (try! (safe-string-to-uint price)))
        (safe-description (unwrap! (safe-slice description u0 (min (len description) u500)) ""))
    )
        (asserts! (> parsed-price u0) ERR-INVALID-PRICE)
        (asserts! (and (> access-level u0) (<= access-level u3)) ERR-INVALID-ACCESS-LEVEL)
        
        (match (map-insert listings
            { listing-id: listing-id }
            {
                owner: tx-sender,
                price: parsed-price,
                data-contract: data-contract,
                data-id: data-id,
                active: true,
                access-level: access-level,
                metadata-hash: metadata-hash,
                description: safe-description,  ;; Store the processed description
                requires-verification: requires-verification,
                platform-fee-percent: (var-get platform-fee-percent),
                created-at: block-height,
                updated-at: block-height
            }
        )
            (ok _) (begin
                ;; Set up default pricing tier for this access level
                (map-set access-level-pricing
                    { listing-id: listing-id, access-level: access-level }
                    { price: parsed-price }
                )
                (ok (print { 
                    event: "listing-created", 
                    listing-id: listing-id, 
                    by: tx-sender,
                    block: block-height
                }))
            )
            (err error) (err error)
        )
    )
)

;; Set tiered pricing for different access levels
(define-public (set-access-level-price (listing-id uint) (access-level uint) (price uint))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        ;; Only the owner can set prices
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-AUTHORIZED)
        (asserts! (> price u0) ERR-INVALID-PRICE)
        (asserts! (> access-level u0) ERR-INVALID-ACCESS-LEVEL)
        (asserts! (<= access-level (get access-level listing)) ERR-INVALID-ACCESS-LEVEL)
        
        (map-set access-level-pricing
            { listing-id: listing-id, access-level: access-level }
            { price: price }
        )
        
        (ok true)
    )
)

;; Update listing status
(define-public (update-listing-status (listing-id uint) (active bool))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        ;; Only the owner can update status
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-AUTHORIZED)
        
        (map-set listings
            { listing-id: listing-id }
            (merge listing { 
                active: active,
                updated-at: stacks-block-height
            })
        )
        
        (ok true)
    )
)

;; Verify compliance and proof status
(define-public (verify-purchase-eligibility (listing-id uint) (access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (data-id (get data-id listing))
    )
        ;; Check if listing is active
        (asserts! (get active listing) ERR-LISTING-NOT-FOUND)
        
        ;; Check access level validity
        (asserts! (> access-level u0) ERR-INVALID-ACCESS-LEVEL)
        (asserts! (<= access-level (get access-level listing)) ERR-INVALID-ACCESS-LEVEL)
        
        ;; If verification required, make a safer call to verify proofs
        (if (get requires-verification listing)
            ;; Handle the verification call more carefully to avoid indeterminate types
            (begin
                ;; Make the contract call and handle the response directly
                (let ((verification-result (contract-call? .attestations check-verified-proof data-id u1)))
                    ;; Check if we got an ok result
                    (asserts! (is-ok verification-result) ERR-NO-VERIFIED-PROOFS)
                    
                    ;; Now safely unwrap and check the proof list length
                    (let ((proof-list (unwrap! verification-result ERR-NO-VERIFIED-PROOFS)))
                        (asserts! (> (len proof-list) u0) ERR-NO-VERIFIED-PROOFS)
                    )
                )
            )
            true
        )
        
        ;; Handle compliance check in a similar way
        (let ((consent-result (contract-call? .data-governance validate-consent-for-purpose data-id u1)))
            ;; Check if we got an ok result
            (asserts! (is-ok consent-result) ERR-NO-VALID-CONSENT)
            
            ;; Now safely unwrap and check the consent value
            (let ((is-valid (unwrap! consent-result ERR-NO-VALID-CONSENT)))
                (asserts! is-valid ERR-NO-VALID-CONSENT)
            )
        )
        
        (ok true)
    )
)

;; Get price for specific access level
(define-read-only (get-access-level-price (listing-id uint) (access-level uint))
    (match (map-get? access-level-pricing { listing-id: listing-id, access-level: access-level })
        price-info (ok (get price price-info))
        ;; Fall back to listing default price
        (match (map-get? listings { listing-id: listing-id })
            listing (ok (get price listing))
            (err ERR-LISTING-NOT-FOUND)
        )
    )
)

;; Create purchase escrow
(define-public (create-purchase-escrow (listing-id uint) (access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (escrow-id (var-get next-escrow-id))
    )
        ;; Verify eligibility
        (try! (verify-purchase-eligibility listing-id access-level))
        
        ;; Get the price for this access level
        (let ((price (unwrap! (get-access-level-price listing-id access-level) ERR-INVALID-PRICE)))
            ;; Check if buyer has enough balance
            (asserts! (>= (stx-get-balance tx-sender) price) ERR-INSUFFICIENT-BALANCE)
            
            ;; Increment escrow ID
            (var-set next-escrow-id (+ escrow-id u1))
            
            ;; Transfer STX to contract temporarily
            (try! (stx-transfer? price tx-sender (as-contract tx-sender)))
            
            ;; Create escrow record
            (map-set purchase-escrows
                { escrow-id: escrow-id }
                {
                    listing-id: listing-id,
                    buyer: tx-sender,
                    amount: price,
                    created-at: stacks-block-height,
                    expires-at: (+ stacks-block-height u144), ;; 24 hour expiry (assuming 10-min blocks)
                    released: false,
                    refunded: false,
                    access-level: access-level
                }
            )
            
            (ok escrow-id)
        )
    )
)

;; Complete purchase by releasing escrow
(define-public (complete-purchase (escrow-id uint) (tx-id (buff 32)))
    (let (
        (escrow (unwrap! (map-get? purchase-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND))
        (listing (unwrap! (map-get? listings { listing-id: (get listing-id escrow) }) ERR-LISTING-NOT-FOUND))
    )
        ;; Verify escrow is valid
        (asserts! (not (get released escrow)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get refunded escrow)) ERR-NOT-AUTHORIZED)
        (asserts! (< stacks-block-height (get expires-at escrow)) ERR-EXPIRED)
        
        ;; Mark escrow as released
        (map-set purchase-escrows
            { escrow-id: escrow-id }
            (merge escrow { released: true })
        )
        
        ;; Calculate platform fee
        (let (
            (amount (get amount escrow))
            (fee-percent (get platform-fee-percent listing))
            (fee-amount (/ (* amount fee-percent) u10000))
            (seller-amount (- amount fee-amount))
        )
            ;; Transfer platform fee
            (as-contract (unwrap! (stx-transfer? fee-amount tx-sender (var-get platform-address)) ERR-PAYMENT-FAILED))
            
            ;; Transfer remaining amount to seller
            (as-contract (unwrap! (stx-transfer? seller-amount tx-sender (get owner listing)) ERR-PAYMENT-FAILED))
            
            ;; Record the purchase
            (map-set user-purchases
                { user: (get buyer escrow), listing-id: (get listing-id escrow) }
                {
                    purchase-time: stacks-block-height,
                    access-expiry: (+ stacks-block-height u8640),
                    access-level: (get access-level escrow),
                    transaction-id: tx-id,
                    purchase-price: amount
                }
            )
            
            ;; Log access in compliance contract - using manual response handling
            (let ((log-result (contract-call? .data-governance audit-access 
                (get data-id listing)
                u1  ;; Assume research purpose
                tx-id
            )))
                (asserts! (is-ok log-result) ERR-PAYMENT-FAILED)
            )
            
            ;; Grant access in genetic-data contract - using manual response handling
            (let ((access-result (contract-call? .dataset-registry grant-access 
                (get data-id listing)
                (get buyer escrow)
                (get access-level escrow)
            )))
                (asserts! (is-ok access-result) ERR-PAYMENT-FAILED)
            )
            
            (ok true)
        )
    )
)

;; Refund escrow if expired or cancelled
(define-public (refund-escrow (escrow-id uint))
    (let (
        (escrow (unwrap! (map-get? purchase-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND))
    )
        ;; Verify escrow is valid for refund
        (asserts! (not (get released escrow)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get refunded escrow)) ERR-NOT-AUTHORIZED)
        
        ;; Only allow refund if expired or buyer is requesting
        (asserts! (or 
            (>= stacks-block-height (get expires-at escrow))
            (is-eq tx-sender (get buyer escrow))
        ) ERR-NOT-AUTHORIZED)
        
        ;; Mark escrow as refunded
        (map-set purchase-escrows
            { escrow-id: escrow-id }
            (merge escrow { refunded: true })
        )
        
        ;; Refund buyer
        (as-contract (try! (stx-transfer? (get amount escrow) tx-sender (get buyer escrow))))
        
        (ok true)
    )
)

;; Direct purchase (without escrow) - simpler but less secure
(define-public (purchase-listing-direct (listing-id uint) (access-level uint) (tx-id (buff 32)))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (owner (get owner listing))
    )
        ;; Verify eligibility - using the fixed function
        ;; Call it and check the result before proceeding
        (let ((eligibility-result (verify-purchase-eligibility listing-id access-level)))
            (asserts! (is-ok eligibility-result) ERR-NO-VALID-CONSENT)
        )
        
        ;; Get the price for this access level
        (let ((price (unwrap! (get-access-level-price listing-id access-level) ERR-INVALID-PRICE)))
            ;; Check if buyer has enough balance
            (asserts! (>= (stx-get-balance tx-sender) price) ERR-INSUFFICIENT-BALANCE)
            
            ;; Calculate platform fee
            (let (
                (fee-percent (get platform-fee-percent listing))
                (fee-amount (/ (* price fee-percent) u10000))
                (seller-amount (- price fee-amount))
            )
                ;; Transfer platform fee - using unwrap! instead of try!
                (unwrap! (stx-transfer? fee-amount tx-sender (var-get platform-address)) ERR-PAYMENT-FAILED)
                
                ;; Transfer remaining amount to seller - using unwrap! instead of try!
                (unwrap! (stx-transfer? seller-amount tx-sender owner) ERR-PAYMENT-FAILED)
                
                ;; Record the purchase
                (map-set user-purchases
                    { user: tx-sender, listing-id: listing-id }
                    {
                        purchase-time: stacks-block-height,
                        access-expiry: (+ stacks-block-height u8640),
                        access-level: access-level,
                        transaction-id: tx-id,
                        purchase-price: price
                    }
                )
                
                ;; Log access in compliance contract - using manual response handling
                (let ((log-result (contract-call? .data-governance audit-access 
                    (get data-id listing)
                    u1  ;; Assume research purpose
                    tx-id
                )))
                    (asserts! (is-ok log-result) ERR-PAYMENT-FAILED)
                )
                
                ;; Grant access in genetic-data contract - using manual response handling
                (let ((access-result (contract-call? .dataset-registry grant-access 
                    (get data-id listing)
                    tx-sender
                    access-level
                )))
                    (asserts! (is-ok access-result) ERR-PAYMENT-FAILED)
                )
                
                (ok true)
            )
        )
    )
)

;; Implement trait functions

;; Get data details - implements trait function
(define-public (get-data-details (data-id uint))
    (match (map-get? listings { listing-id: data-id })
        listing (ok {
            owner: (get owner listing),
            price: (get price listing),
            access-level: (get access-level listing),
            metadata-hash: (get metadata-hash listing)
        })
        (err u404)
    )
)

;; Verify access rights - implements trait function
(define-public (verify-access-rights (data-id uint) (user principal))
    (match (map-get? user-purchases { user: user, listing-id: data-id })
        purchase-data (ok (< stacks-block-height (get access-expiry purchase-data)))
        (err u404)
    )
)

;; Grant access - implements trait function
(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (map-set user-purchases
            { user: user, listing-id: data-id }
            {
                purchase-time: stacks-block-height,
                access-expiry: (+ stacks-block-height u8640),
                access-level: access-level,
                transaction-id: 0x00, ;; Admin granted access has no transaction
                purchase-price: u0    ;; Admin granted access has no price
            }
        )
        (ok true)
    )
)

;; Query functions
(define-read-only (get-listing (listing-id uint))
    (map-get? listings { listing-id: listing-id })
)

(define-read-only (get-user-purchase (user principal) (listing-id uint))
    (map-get? user-purchases { user: user, listing-id: listing-id })
)

(define-read-only (get-escrow (escrow-id uint))
    (map-get? purchase-escrows { escrow-id: escrow-id })
)

;; Batch operations leveraging Clarity 4 fold/map
(define-private (batch-create-helper (acc (response bool uint)) (item (tuple (0 uint) (1 (string-utf8 20)) (2 principal) (3 uint) (4 uint) (5 (buff 32)) (6 bool) (7 (string-utf8 500)))))
    (if (is-err acc)
        acc
        (let (
            (lid (get 0 item))
            (price (get 1 item))
            (dc (get 2 item))
            (did (get 3 item))
            (lvl (get 4 item))
            (mh (get 5 item))
            (ver (get 6 item))
            (desc (get 7 item))
        )
            (let ((res (create-listing lid price dc did lvl mh ver desc)))
                (if (is-ok res) acc res)
            )
        )
    )
)

(define-public (batch-create-listings (items (list 50 (tuple (0 uint) (1 (string-utf8 20)) (2 principal) (3 uint) (4 uint) (5 (buff 32)) (6 bool) (7 (string-utf8 500))))))
    (fold batch-create-helper items (ok true))
)

(define-private (batch-status-helper (acc (response bool uint)) (item (tuple (0 uint) (1 bool))))
    (if (is-err acc)
        acc
        (let ((res (update-listing-status (get 0 item) (get 1 item))))
            (if (is-ok res) acc res)
        )
    )
)

(define-public (batch-update-status (items (list 50 (tuple (0 uint) (1 bool)))))
    (fold batch-status-helper items (ok true))
)

(define-private (batch-purchase-helper (acc (response bool uint)) (item (tuple (0 uint) (1 uint) (2 (buff 32)))))
    (if (is-err acc)
        acc
        (let ((res (purchase-listing-direct (get 0 item) (get 1 item) (get 2 item))))
            (if (is-ok res) acc res)
        )
    )
)

(define-public (batch-purchase-direct (items (list 50 (tuple (0 uint) (1 uint) (2 (buff 32))))) )
    (fold batch-purchase-helper items (ok true))
)

;; Extend user access
(define-public (extend-access (listing-id uint) (user principal) (duration uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (purchase (unwrap! (map-get? user-purchases { user: user, listing-id: listing-id }) ERR-NOT-FOUND))
    )
        ;; Only owner or admin can extend access
        (asserts! (or 
            (is-eq tx-sender (get owner listing))
            (is-eq tx-sender (var-get marketplace-admin))
        ) ERR-NOT-AUTHORIZED)
        
        ;; Update the purchase record with extended expiry
        (map-set user-purchases
            { user: user, listing-id: listing-id }
            (merge purchase {
                access-expiry: (+ (get access-expiry purchase) duration)
            })
        )
        
        (ok true)
    )
)
