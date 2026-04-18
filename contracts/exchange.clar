;; exchange.clar
;; @title GeneTrust Exchange
;; @version 1.0.0
;; @author GeneTrust
;; @notice Marketplace for listing and purchasing access to genetic datasets.
;;         STX payments transfer directly from buyer to dataset owner with no intermediary.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.exchange

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-AMOUNT (err u401))
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

;; Errors - Precondition Failed (460-469)
(define-constant ERR-INSUFFICIENT-ACCESS-LEVEL (err u621))
(define-constant ERR-PRICE-MISMATCH (err u620))

;; Errors - Server Errors (500-519)
(define-constant ERR-PAYMENT-FAILED (err u500))
(define-constant ERR-TRANSACTION-FAILED (err u501))

;; @notice Auto-incrementing counter for listing IDs. Starts at 1.
(define-data-var next-listing-id uint u1)

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
;; @param price: Price in microSTX (must be > 0)
;; @param access-level: Access level offered (1-3)
;; @param description: Listing description (10-200 chars)
;; @returns: ok with listing-id on success, error otherwise
;; @requires: data-id must be positive
;; @requires: price must be positive
;; @requires: access-level must be 1-3
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
        ;; Increment counter
        (var-set next-listing-id (+ listing-id u1))
        (ok listing-id)
    )
)

;; Cancel a marketplace listing (owner only)
;; @param listing-id: ID of the listing to cancel
;; @returns: ok true on success, error otherwise
;; @requires: Caller must be listing owner
;; @requires: Listing must exist and be active
(define-public (cancel-listing (listing-id uint))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        ;; Validate listing-id is positive
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        ;; Verify caller is the listing owner
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-OWNER)
        ;; Check listing is not already inactive
        (asserts! (get active listing) ERR-NOT-FOUND)
        ;; Deactivate the listing
        (map-set listings { listing-id: listing-id } (merge listing { active: false }))
        (ok true)
    )
)

;; Purchase access to a listed dataset - transfers STX to the owner
;; @param listing-id: ID of the listing to purchase
;; @param desired-access-level: Requested access level (must be <= listing access level)
;; @returns: ok with purchase details on success, error otherwise
;; @requires: Listing must exist and be active
;; @requires: desired-access-level must be valid (1-3)
;; @requires: desired-access-level must not exceed listing access level
;; @requires: Payment must succeed
(define-public (purchase-listing (listing-id uint) (desired-access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND))
        (owner (get owner listing))
        (price (get price listing))
    )
        ;; Validate listing-id is positive
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        ;; Check listing is active
        (asserts! (get active listing) ERR-NOT-FOUND)
        ;; Prevent buyer from being the owner
        (asserts! (not (is-eq tx-sender owner)) ERR-INVALID-INPUT)
        ;; Validate desired-access-level is valid (1-3)
        (asserts! (and (>= desired-access-level u1) (<= desired-access-level u3)) ERR-INVALID-ACCESS-LEVEL)
        ;; Check requested access level does not exceed listing access level
        (asserts! (<= desired-access-level (get access-level listing)) ERR-INSUFFICIENT-ACCESS-LEVEL)
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
        ;; Return purchase confirmation
        (ok { listing-id: listing-id, access-level: desired-access-level, paid: price })
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

;; @notice Returns the next listing-id that will be assigned on the next create-listing call.
;; @dev Useful for frontends to predict listing-id before submitting a transaction.
;; @return ok(uint) — the next available listing-id.
(define-read-only (get-next-listing-id)
    (ok (var-get next-listing-id))
)
