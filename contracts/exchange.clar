;; exchange.clar
;; @title GeneTrust Exchange
;; @version 1.1.0
;; @author GeneTrust
;; @notice Marketplace for listing and purchasing access to genetic datasets.
;;         STX payments transfer directly from buyer to dataset owner with no intermediary.
;;         Owners can create, price-update, and cancel listings. Each buyer may purchase
;;         a listing exactly once. All state changes emit print events for indexers.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.exchange

;; Error code ranges (shared convention across the contract suite):
;;   400-409  Input validation
;;   410-414  Authorization
;;   430-439  Not found
;;   440-449  Conflict / already exists
;;   450-459  Gone / inactive
;;   500-519  Server / payment errors
;;   610-699  Business logic

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-AMOUNT (err u401))
(define-constant ERR-PRICE-TOO-HIGH (err u402))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u406))
(define-constant ERR-INVALID-STRING-LENGTH (err u407))

;; Errors - Authorization (410-414)
(define-constant ERR-NOT-AUTHORIZED (err u410))
(define-constant ERR-NOT-OWNER (err u411))

;; Errors - Not Found (430-439)
(define-constant ERR-NOT-FOUND (err u430))
(define-constant ERR-LISTING-NOT-FOUND (err u432))
(define-constant ERR-PURCHASE-NOT-FOUND (err u435))

;; Errors - Conflict (440-449)
(define-constant ERR-ALREADY-EXISTS (err u440))
(define-constant ERR-LISTING-ALREADY-EXISTS (err u442))
(define-constant ERR-DUPLICATE-PURCHASE (err u443))

;; Errors - Gone / Inactive (450-459)
(define-constant ERR-LISTING-INACTIVE (err u451))

;; Errors - Business Logic (610-699)
(define-constant ERR-CANNOT-BUY-OWN-LISTING (err u614))
(define-constant ERR-PRICE-MISMATCH (err u620))
(define-constant ERR-INSUFFICIENT-ACCESS-LEVEL (err u621))

;; Errors - Server Errors (500-519)
(define-constant ERR-PAYMENT-FAILED (err u500))
(define-constant ERR-TRANSACTION-FAILED (err u501))

(define-constant CONTRACT-VERSION "1.1.0")

;; Price cap: 1 billion STX in microSTX to prevent absurd listings
(define-constant MAX-PRICE u1000000000000000)

;; @notice Auto-incrementing counter for listing IDs. Starts at 1.
(define-data-var next-listing-id uint u1)
;; @notice Running total of all listings ever created (including cancelled).
(define-data-var total-listings-created uint u0)
;; @notice Running total of all completed purchases.
(define-data-var total-purchases-completed uint u0)

;; @notice Stores all marketplace listings keyed by listing-id.
;; @dev active flag is used for soft-cancellation; listings are never hard-deleted.
(define-map listings
    { listing-id: uint }
    {
        owner: principal,
        data-id: uint,
        price: uint,
        access-level: uint,
        description: (string-utf8 200),
        active: bool,
        created-at: uint
    }
)

;; @notice Records all completed purchases. Keyed by listing-id + buyer principal.
;; @dev A buyer can only have one purchase record per listing (no duplicate purchases).
(define-map purchases
    { listing-id: uint, buyer: principal }
    {
        paid: uint,
        access-level: uint,
        purchased-at: uint
    }
)

;; Create a marketplace listing for a dataset
;; @param data-id: ID of the dataset to list
;; @param price: Price in microSTX (must be > 0).
;; @param access-level: Access level offered (1-3).
;; @param description: Listing description (10-200 chars).
;; @returns ok(listing-id) on success.
;;   ERR-INVALID-INPUT (u400) — data-id is zero.
;;   ERR-INVALID-AMOUNT (u401) — price is zero.
;;   ERR-INVALID-ACCESS-LEVEL (u406) — access-level not in 1-3.
;;   ERR-INVALID-STRING-LENGTH (u407) — description outside 10-200 chars.
(define-public (create-listing
    (data-id uint)
    (price uint)
    (access-level uint)
    (description (string-utf8 200)))
    (let ((listing-id (var-get next-listing-id)))
        ;; Validate data-id is positive
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        ;; Validate price is positive
        (asserts! (> price u0) ERR-INVALID-AMOUNT)
        ;; Validate price does not exceed maximum cap
        (asserts! (<= price MAX-PRICE) ERR-PRICE-TOO-HIGH)
        ;; Validate access-level is in valid range (1-3)
        (asserts! (and (>= access-level u1) (<= access-level u3)) ERR-INVALID-ACCESS-LEVEL)
        ;; Validate description length (10-200 chars)
        (asserts! (and (>= (len description) u10) (<= (len description) u200)) ERR-INVALID-STRING-LENGTH)
        ;; Create the listing
        (map-set listings { listing-id: listing-id }
            {
                owner: tx-sender,
                data-id: data-id,
                price: price,
                access-level: access-level,
                description: description,
                active: true,
                created-at: stacks-block-height
            }
        )
        ;; Emit event for off-chain indexers
        (print { event: "listing-created", listing-id: listing-id, owner: tx-sender,
                 data-id: data-id, price: price, access-level: access-level,
                 block: stacks-block-height })
        ;; Increment counters
        (var-set next-listing-id (+ listing-id u1))
        (var-set total-listings-created (+ (var-get total-listings-created) u1))
        (ok listing-id)
    )
)

;; Cancel a marketplace listing (owner only). Soft-deletes by setting active=false.
;; @param listing-id: ID of the listing to cancel (must be > 0).
;; @returns ok(true) on success.
;;   ERR-LISTING-NOT-FOUND (u432) — listing does not exist.
;;   ERR-INVALID-INPUT (u400) — listing-id is zero.
;;   ERR-NOT-OWNER (u411) — caller is not the listing owner.
;;   ERR-LISTING-INACTIVE (u451) — listing is already cancelled.
(define-public (cancel-listing (listing-id uint))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        ;; Validate listing-id is positive
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        ;; Verify caller is the listing owner
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-OWNER)
        ;; Check listing is not already inactive
        (asserts! (get active listing) ERR-LISTING-INACTIVE)
        ;; Deactivate the listing
        (map-set listings { listing-id: listing-id } (merge listing { active: false }))
        (print { event: "listing-cancelled", listing-id: listing-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; Update the price of an active listing (owner only).
;; @param listing-id: ID of the listing to update (must be > 0).
;; @param new-price: New price in microSTX (must be > 0).
;; @returns ok(true) on success.
;;   ERR-LISTING-NOT-FOUND (u432) — listing does not exist.
;;   ERR-INVALID-INPUT (u400) — listing-id is zero.
;;   ERR-INVALID-AMOUNT (u401) — new-price is zero.
;;   ERR-NOT-OWNER (u411) — caller is not the listing owner.
;;   ERR-LISTING-INACTIVE (u451) — listing has been cancelled.
(define-public (update-listing-price (listing-id uint) (new-price uint))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        (asserts! (> new-price u0) ERR-INVALID-AMOUNT)
        (asserts! (<= new-price MAX-PRICE) ERR-PRICE-TOO-HIGH)
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-OWNER)
        (asserts! (get active listing) ERR-LISTING-INACTIVE)
        (map-set listings { listing-id: listing-id }
            (merge listing { price: new-price })
        )
        (print { event: "listing-price-updated", listing-id: listing-id, owner: tx-sender,
                 old-price: (get price listing), new-price: new-price, block: stacks-block-height })
        (ok true)
    )
)

;; Purchase access to a listed dataset — transfers STX to the listing owner.
;; @param listing-id: ID of the listing to purchase (must be > 0).
;; @param desired-access-level: Requested access level (1-3, must be <= listing access-level).
;; @returns ok({ listing-id, access-level, paid }) on success.
;;   ERR-LISTING-NOT-FOUND (u432) — listing does not exist.
;;   ERR-LISTING-INACTIVE (u451) — listing has been cancelled.
;;   ERR-CANNOT-BUY-OWN-LISTING (u614) — caller is the listing owner.
;;   ERR-INVALID-ACCESS-LEVEL (u406) — desired-access-level not in 1-3.
;;   ERR-INSUFFICIENT-ACCESS-LEVEL (u621) — desired level exceeds listing level.
;;   ERR-DUPLICATE-PURCHASE (u443) — caller has already purchased this listing.
;;   ERR-PAYMENT-FAILED (u500) — STX transfer failed.
(define-public (purchase-listing (listing-id uint) (desired-access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (owner (get owner listing))
        (price (get price listing))
    )
        ;; Validate listing-id is positive
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        ;; Check listing is active
        (asserts! (get active listing) ERR-LISTING-INACTIVE)
        ;; Prevent buyer from being the owner
        (asserts! (not (is-eq tx-sender owner)) ERR-CANNOT-BUY-OWN-LISTING)
        ;; Validate desired-access-level is valid (1-3)
        (asserts! (and (>= desired-access-level u1) (<= desired-access-level u3)) ERR-INVALID-ACCESS-LEVEL)
        ;; Check requested access level does not exceed listing access level
        (asserts! (<= desired-access-level (get access-level listing)) ERR-INSUFFICIENT-ACCESS-LEVEL)
        ;; Prevent duplicate purchase — buyer cannot purchase the same listing twice
        (asserts! (is-none (map-get? purchases { listing-id: listing-id, buyer: tx-sender })) ERR-DUPLICATE-PURCHASE)
        ;; Process payment
        (try! (stx-transfer? price tx-sender owner))
        ;; Record the purchase
        (map-set purchases { listing-id: listing-id, buyer: tx-sender }
            {
                paid: price,
                access-level: desired-access-level,
                purchased-at: stacks-block-height
            }
        )
        ;; Emit event for off-chain indexers
        (print { event: "listing-purchased", listing-id: listing-id, buyer: tx-sender,
                 access-level: desired-access-level, paid: price, block: stacks-block-height })
        ;; Increment global purchase counter
        (var-set total-purchases-completed (+ (var-get total-purchases-completed) u1))
        ;; Return purchase confirmation
        (ok { listing-id: listing-id, access-level: desired-access-level, paid: price })
    )
)

;; Update the description of an active listing (owner only)
;; @param listing-id: ID of the listing
;; @param new-description: New description (10-200 chars)
;; @returns: ok true on success, error otherwise
(define-public (update-listing-description (listing-id uint) (new-description (string-utf8 200)))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-OWNER)
        (asserts! (get active listing) ERR-LISTING-INACTIVE)
        (asserts! (and (>= (len new-description) u10) (<= (len new-description) u200)) ERR-INVALID-STRING-LENGTH)
        (map-set listings { listing-id: listing-id }
            (merge listing { description: new-description })
        )
        (print { event: "listing-description-updated", listing-id: listing-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; @notice Returns all stored fields for a given listing.
;; @param listing-id The listing ID to look up.
;; @return Some(listing) if found, none otherwise. Check active field before use.
(define-read-only (get-listing (listing-id uint))
    (map-get? listings { listing-id: listing-id })
)

;; @notice Returns the purchase record for a specific buyer on a specific listing.
;; @param listing-id The listing that was purchased.
;; @param buyer The principal who made the purchase.
;; @return Some(purchase) if found, none if the buyer has not purchased this listing.
(define-read-only (get-purchase (listing-id uint) (buyer principal))
    (map-get? purchases { listing-id: listing-id, buyer: buyer })
)

;; @notice Returns true if the given listing exists and is active.
;; @param listing-id The listing ID to check.
;; @return ok(true) if the listing exists and is active, ok(false) otherwise.
(define-read-only (is-listing-active (listing-id uint))
    (match (map-get? listings { listing-id: listing-id })
        listing (ok (get active listing))
        (ok false)
    )
)

;; @notice Returns true if the given buyer has already purchased a specific listing.
;; @param listing-id The listing to check.
;; @param buyer The principal to check.
;; @return ok(true) if the buyer has an existing purchase record, ok(false) otherwise.
(define-read-only (has-purchased (listing-id uint) (buyer principal))
    (ok (is-some (map-get? purchases { listing-id: listing-id, buyer: buyer })))
)

;; @notice Returns the next listing-id that will be assigned on the next create-listing call.
;; @dev Useful for frontends to predict listing-id before submitting a transaction.
;; @return ok(uint) - the next available listing-id.
(define-read-only (get-next-listing-id)
    (ok (var-get next-listing-id))
)

;; @notice Returns the access level granted to a buyer on a specific listing.
;; @param listing-id The listing that was purchased.
;; @param buyer The principal who made the purchase.
;; @return Some(uint) if the buyer purchased this listing, none otherwise.
(define-read-only (get-purchase-access-level (listing-id uint) (buyer principal))
    (match (map-get? purchases { listing-id: listing-id, buyer: buyer })
        purchase (some (get access-level purchase))
        none
    )
)

;; @notice Returns the dataset ID referenced by a listing.
;; @param listing-id The listing ID to look up.
;; @return Some(uint) if the listing exists, none otherwise.
(define-read-only (get-listing-data-id (listing-id uint))
    (match (map-get? listings { listing-id: listing-id })
        listing (some (get data-id listing))
        none
    )
)

;; @notice Returns the current price of a listing in microSTX.
;; @param listing-id The listing ID to look up.
;; @return Some(uint) if the listing exists, none otherwise.
(define-read-only (get-listing-price (listing-id uint))
    (match (map-get? listings { listing-id: listing-id })
        listing (some (get price listing))
        none
    )
)

;; @notice Returns the owner principal of a listing.
;; @param listing-id The listing ID to look up.
;; @return Some(principal) if the listing exists, none otherwise.
(define-read-only (get-listing-owner (listing-id uint))
    (match (map-get? listings { listing-id: listing-id })
        listing (some (get owner listing))
        none
    )
)

;; @notice Returns the total number of listings ever created (including cancelled ones).
;; @return ok(uint) - the all-time listing creation count.
(define-read-only (get-total-listings-created)
    (ok (var-get total-listings-created))
)

;; @notice Returns the deployed contract version string.
(define-read-only (get-version)
    CONTRACT-VERSION
)
