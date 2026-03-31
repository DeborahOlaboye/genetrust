;; exchange.clar
;; Core exchange for genetic data trading
;; Downported to Clarity 2.x for compatibility

;; Contract constants
(define-constant CONTRACT_ATTESTATIONS 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.attestations)

;; Clarity 2 Helpers
(define-private (min-u (a uint) (b uint)) (if (<= a b) a b))

;; Import trait
(impl-trait .dataset-registry-trait.dataset-registry-trait)

;; Error constants (aligned with error-definitions.clar logic)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INVALID-PRICE (err u400))
(define-constant ERR-LISTING-NOT-FOUND (err u404))
(define-constant ERR-INSUFFICIENT-BALANCE (err u422))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u400))
(define-constant ERR-NO-VERIFIED-PROOFS (err u422))
(define-constant ERR-NO-VALID-CONSENT (err u403))
(define-constant ERR-PAYMENT-FAILED (err u500))
(define-constant ERR-ESCROW-EXISTS (err u409))
(define-constant ERR-ESCROW-NOT-FOUND (err u404))
(define-constant ERR-EXPIRED (err u422))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-VERIFICATION-FAILED (err u422))
(define-constant ERR-INVALID-DATA (err u400))

;; Error context tracking
(define-map error-context 
    { error-id: uint }
    {
        error-code: uint,
        message: (string-utf8 256),
        context-data: (string-utf8 512),
        timestamp: uint,
        listing-id: uint
    }
)
(define-data-var error-counter uint u0)

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
        description: (string-utf8 500),
        requires-verification: bool,
        platform-fee-percent: uint,
        created-at: uint,
        updated-at: uint
    }
)

(define-map user-purchases
    { user: principal, listing-id: uint }
    {
        purchase-time: uint,
        access-expiry: uint,
        access-level: uint,
        transaction-id: (buff 32),
        purchase-price: uint
    }
)

(define-map access-level-pricing
    { listing-id: uint, access-level: uint }
    { price: uint }
)

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
(define-data-var platform-fee-percent uint u250)
(define-data-var platform-address principal tx-sender)
(define-data-var marketplace-admin principal tx-sender)

;; Admin functions
(define-public (set-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set marketplace-admin new-admin))
    )
)

(define-public (set-platform-fee (new-fee-percent uint))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (<= new-fee-percent u1000) ERR-INVALID-PRICE)
        (ok (var-set platform-fee-percent new-fee-percent))
    )
)

;; Listing management
(define-public (create-listing 
    (listing-id uint) 
    (price uint) 
    (data-contract principal)
    (data-id uint)
    (access-level uint)
    (metadata-hash (buff 32))
    (requires-verification bool)
    (description (string-utf8 500)))
    
    (begin
        (asserts! (> price u0) ERR-INVALID-PRICE)
        (asserts! (and (> access-level u0) (<= access-level u3)) ERR-INVALID-ACCESS-LEVEL)
        
        (asserts! (map-insert listings
            { listing-id: listing-id }
            {
                owner: tx-sender,
                price: price,
                data-contract: data-contract,
                data-id: data-id,
                active: true,
                access-level: access-level,
                metadata-hash: metadata-hash,
                description: description,
                requires-verification: requires-verification,
                platform-fee-percent: (var-get platform-fee-percent),
                created-at: burn-block-height,
                updated-at: burn-block-height
            }
        ) ERR-INVALID-DATA)

        (map-set access-level-pricing
            { listing-id: listing-id, access-level: access-level }
            { price: price }
        )
        (ok (print { event: "listing-created", listing-id: listing-id, by: tx-sender }))
    )
)

(define-public (update-listing-status (listing-id uint) (active bool))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-AUTHORIZED)
        (ok (map-set listings
            { listing-id: listing-id }
            (merge listing { active: active, updated-at: burn-block-height })
        ))
    )
)

;; Verification logic
(define-public (verify-purchase-eligibility (listing-id uint) (access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (data-id (get data-id listing))
    )
        (asserts! (get active listing) ERR-LISTING-NOT-FOUND)
        (asserts! (<= access-level (get access-level listing)) ERR-INVALID-ACCESS-LEVEL)
        
        (if (get requires-verification listing)
            (let ((verification (contract-call? CONTRACT_ATTESTATIONS check-verified-proof data-id u1)))
                (asserts! (is-ok verification) ERR-VERIFICATION-FAILED)
                (ok true)
            )
            (ok true)
        )
    )
)

(define-read-only (get-access-level-price (listing-id uint) (access-level uint))
    (match (map-get? access-level-pricing { listing-id: listing-id, access-level: access-level })
        price-info (ok (get price price-info))
        (match (map-get? listings { listing-id: listing-id })
            listing (ok (get price listing))
            (err ERR-LISTING-NOT-FOUND)
        )
    )
)

;; Escrow logic
(define-public (create-purchase-escrow (listing-id uint) (access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (escrow-id (var-get next-escrow-id))
        (price (unwrap! (get-access-level-price listing-id access-level) ERR-INVALID-PRICE))
    )
        (try! (verify-purchase-eligibility listing-id access-level))
        (try! (stx-transfer? price tx-sender (as-contract tx-sender)))
        
        (map-set purchase-escrows
            { escrow-id: escrow-id }
            {
                listing-id: listing-id,
                buyer: tx-sender,
                amount: price,
                created-at: burn-block-height,
                expires-at: (+ burn-block-height u144),
                released: false,
                refunded: false,
                access-level: access-level
            }
        )
        (var-set next-escrow-id (+ escrow-id u1))
        (ok escrow-id)
    )
)

(define-public (complete-purchase (escrow-id uint) (tx-id (buff 32)))
    (let (
        (escrow (unwrap! (map-get? purchase-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND))
        (listing (unwrap! (map-get? listings { listing-id: (get listing-id escrow) }) ERR-LISTING-NOT-FOUND))
    )
        (asserts! (not (get released escrow)) ERR-NOT-AUTHORIZED)
        (asserts! (< burn-block-height (get expires-at escrow)) ERR-EXPIRED)
        
        (let (
            (amount (get amount escrow))
            (fee-amount (/ (* amount (get platform-fee-percent listing)) u10000))
            (seller-amount (- amount fee-amount))
        )
            (map-set purchase-escrows { escrow-id: escrow-id } (merge escrow { released: true }))
            
            (try! (as-contract (stx-transfer? fee-amount tx-sender (var-get platform-address))))
            (try! (as-contract (stx-transfer? seller-amount tx-sender (get owner listing))))
            
            (map-set user-purchases
                { user: (get buyer escrow), listing-id: (get listing-id escrow) }
                {
                    purchase-time: burn-block-height,
                    access-expiry: (+ burn-block-height u8640),
                    access-level: (get access-level escrow),
                    transaction-id: tx-id,
                    purchase-price: amount
                }
            )
            
            (try! (contract-call? .data-governance audit-access (get data-id listing) u1 tx-id))
            (try! (contract-call? .dataset-registry grant-access (get data-id listing) (get buyer escrow) (get access-level escrow)))
            
            (ok true)
        )
    )
)

;; Trait implementation
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

(define-public (verify-access-rights (data-id uint) (user principal))
    (match (map-get? user-purchases { user: user, listing-id: data-id })
        purchase-data (ok (< burn-block-height (get access-expiry purchase-data)))
        (err u404)
    )
)

(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-admin)) ERR-NOT-AUTHORIZED)
        (ok (map-set user-purchases
            { user: user, listing-id: data-id }
            {
                purchase-time: burn-block-height,
                access-expiry: (+ burn-block-height u8640),
                access-level: access-level,
                transaction-id: 0x00,
                purchase-price: u0
            }
        ))
    )
)

;; Read-only helpers
(define-read-only (get-listing (listing-id uint)) (map-get? listings { listing-id: listing-id }))
(define-read-only (get-user-purchase (user principal) (listing-id uint)) (map-get? user-purchases { user: user, listing-id: listing-id }))
