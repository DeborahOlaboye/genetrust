;; exchange.clar
;; Genetic data marketplace - list datasets, purchase access with STX

;; Errors
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-PAYMENT-FAILED (err u500))

;; Listing counter
(define-data-var next-listing-id uint u1)

;; Listings map
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

;; Purchases map
(define-map purchases
    { listing-id: uint, buyer: principal }
    {
        paid: uint,
        access-level: uint,
        purchased-at: uint
    }
)

;; Create a marketplace listing for a dataset
(define-public (create-listing
    (data-id uint)
    (price uint)
    (access-level uint)
    (description (string-utf8 200)))
    (let ((listing-id (var-get next-listing-id)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (> price u0) ERR-INVALID-INPUT)
        (asserts! (and (>= access-level u1) (<= access-level u3)) ERR-INVALID-INPUT)
        (asserts! (> (len description) u0) ERR-INVALID-INPUT)
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
        (var-set next-listing-id (+ listing-id u1))
        (ok listing-id)
    )
)

;; Cancel a listing (owner only)
(define-public (cancel-listing (listing-id uint))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-NOT-FOUND)))
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner listing)) ERR-NOT-AUTHORIZED)
        (map-set listings { listing-id: listing-id } (merge listing { active: false }))
        (ok true)
    )
)

;; Purchase access to a listed dataset - transfers STX to the owner
(define-public (purchase-listing (listing-id uint) (desired-access-level uint))
    (let (
        (listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-NOT-FOUND))
        (owner (get owner listing))
        (price (get price listing))
    )
        (asserts! (> listing-id u0) ERR-INVALID-INPUT)
        (asserts! (get active listing) ERR-NOT-FOUND)
        (asserts! (and (>= desired-access-level u1) (<= desired-access-level (get access-level listing))) ERR-INVALID-INPUT)
        (try! (stx-transfer? price tx-sender owner))
        (map-set purchases { listing-id: listing-id, buyer: tx-sender }
            {
                paid: price,
                access-level: desired-access-level,
                purchased-at: stacks-block-height
            }
        )
        (ok { listing-id: listing-id, access-level: desired-access-level, paid: price })
    )
)

;; Read: get a listing
(define-read-only (get-listing (listing-id uint))
    (map-get? listings { listing-id: listing-id })
)

;; Read: get a purchase record
(define-read-only (get-purchase (listing-id uint) (buyer principal))
    (map-get? purchases { listing-id: listing-id, buyer: buyer })
)

;; Read: get next listing-id (useful for frontend)
(define-read-only (get-next-listing-id)
    (ok (var-get next-listing-id))
)
