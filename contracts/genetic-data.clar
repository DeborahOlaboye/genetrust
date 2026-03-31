;; dataset-registry.clar
;; Core contract for dataset registry and access control
;; Refactored for Clarity 2.x compatibility

;; Traits
(impl-trait .dataset-registry-trait.dataset-registry-trait)

;; Error constants
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INVALID-DATA (err u400))
(define-constant ERR-DATA-EXISTS (err u409))
(define-constant ERR-DATA-NOT-FOUND (err u404))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u400))
(define-constant ERR-RATE-LIMIT (err u429))
(define-constant ERR-CONTRACT-PAUSED (err u503))
(define-constant ERR-ACCESS-DENIED (err u403))
(define-constant ERR-INVALID-BLOCK (err u400))
(define-constant ERR-INVALID-PRICE (err u400))
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-PUBKEY (err u422))
(define-constant ERR-PUBKEY-MISMATCH (err u403))
(define-constant ERR-DELEGATION-NOT-FOUND (err u404))
(define-constant ERR-DELEGATION-EXPIRED (err u403))
(define-constant ERR-MULTISIG-THRESHOLD (err u400))
(define-constant ERR-ALREADY-APPROVED (err u409))
(define-constant ERR-ACTION-NOT-FOUND (err u404))

;; Constants
(define-constant BLOCKS-PER-DAY u144)
(define-constant MAX-OPS-PER-WINDOW u10)
(define-constant ACCESS-EXPIRATION-BLOCKS u8640)
(define-constant ACCESS-LEVEL-BASIC u1)
(define-constant ACCESS-LEVEL-DETAILED u2)
(define-constant ACCESS-LEVEL-FULL u3)

;; Contract state
(define-data-var is-paused bool false)
(define-data-var contract-owner principal tx-sender)
(define-data-var audit-trail-counter uint u0)

;; Data maps
(define-map genetic-datasets
    { data-id: uint }
    {
        owner: principal,
        price: uint,
        access-level: uint,
        metadata-hash: (buff 32),
        encrypted-storage-url: (string-utf8 200),
        description: (string-utf8 200),
        created-at: uint,
        updated-at: uint,
        is-active: bool
    }
)

(define-map access-rights
    { data-id: uint, user: principal }
    {
        access-level: uint,
        expiration: uint,
        granted-by: principal,
        created-at: uint
    }
)

(define-map dataset-versions
    { data-id: uint }
    { current-version: uint }
)

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

(define-map access-change-count
    { data-id: uint, user: principal }
    { count: uint }
)

;; Private Helpers
(define-private (check-paused)
    (asserts! (not (var-get is-paused)) ERR-CONTRACT-PAUSED)
    (ok true)
)

(define-private (is-owner (data-id uint) (caller principal))
    (match (map-get? genetic-datasets { data-id: data-id })
        dataset (is-eq (get owner dataset) caller)
        false
    )
)

(define-private (record-dataset-version (data-id uint) (dataset { owner: principal, price: uint, access-level: uint, metadata-hash: (buff 32), encrypted-storage-url: (string-utf8 200), description: (string-utf8 200), created-at: uint, updated-at: uint, is-active: bool }))
    (let (
        (ver-info (default-to { current-version: u0 } (map-get? dataset-versions { data-id: data-id })))
        (next-ver (+ (get current-version ver-info) u1))
    )
        (map-set dataset-version-history
            { data-id: data-id, version: next-ver }
            (merge dataset { block-height: burn-block-height })
        )
        (map-set dataset-versions { data-id: data-id } { current-version: next-ver })
        (ok next-ver)
    )
)

(define-private (record-access-change (data-id uint) (user principal) (old-level uint) (new-level uint))
    (let (
        (count-info (default-to { count: u0 } (map-get? access-change-count { data-id: data-id, user: user })))
        (next-id (+ (get count count-info) u1))
    )
        (map-set access-history
            { data-id: data-id, user: user, change-id: next-id }
            {
                old-access-level: old-level,
                new-access-level: new-level,
                changed-at: burn-block-height,
                changed-by: tx-sender,
                is-active: true
            }
        )
        (map-set access-change-count { data-id: data-id, user: user } { count: next-id })
        (ok next-id)
    )
)

;; Public Functions
(define-public (register-genetic-data
    (data-id uint)
    (price uint)
    (access-level uint)
    (metadata-hash (buff 32))
    (storage-url (string-utf8 200))
    (description (string-utf8 200)))
    
    (begin
        (try! (check-paused))
        (asserts! (is-none (map-get? genetic-datasets { data-id: data-id })) ERR-DATA-EXISTS)
        (asserts! (and (>= access-level ACCESS-LEVEL-BASIC) (<= access-level ACCESS-LEVEL-FULL)) ERR-INVALID-ACCESS-LEVEL)
        
        (let ((new-dataset {
            owner: tx-sender,
            price: price,
            access-level: access-level,
            metadata-hash: metadata-hash,
            encrypted-storage-url: storage-url,
            description: description,
            created-at: burn-block-height,
            updated-at: burn-block-height,
            is-active: true
        }))
            (try! (record-dataset-version data-id new-dataset))
            (map-set genetic-datasets { data-id: data-id } new-dataset)
            (var-set audit-trail-counter (+ (var-get audit-trail-counter) u1))
            (ok true)
        )
    )
)

(define-public (grant-access (data-id uint) (user principal) (access-level uint))
    (begin
        (try! (check-paused))
        (let ((dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND)))
            (asserts! (or (is-eq tx-sender (get owner dataset)) (is-eq tx-sender (var-get contract-owner))) ERR-NOT-AUTHORIZED)
            (asserts! (<= access-level (get access-level dataset)) ERR-INVALID-ACCESS-LEVEL)
            
            (let ((old-access (default-to u0 (get access-level (map-get? access-rights { data-id: data-id, user: user })))))
                (try! (record-access-change data-id user old-access access-level))
                (map-set access-rights
                    { data-id: data-id, user: user }
                    {
                        access-level: access-level,
                        expiration: (+ burn-block-height ACCESS-EXPIRATION-BLOCKS),
                        granted-by: tx-sender,
                        created-at: burn-block-height
                    }
                )
                (ok true)
            )
        )
    )
)

(define-public (revoke-access (data-id uint) (user principal))
    (begin
        (try! (check-paused))
        (let (
            (dataset (unwrap! (map-get? genetic-datasets { data-id: data-id }) ERR-DATA-NOT-FOUND))
            (rights (unwrap! (map-get? access-rights { data-id: data-id, user: user }) ERR-DATA-NOT-FOUND))
        )
            (asserts! (or (is-eq tx-sender (get owner dataset)) (is-eq tx-sender (var-get contract-owner))) ERR-NOT-AUTHORIZED)
            (try! (record-access-change data-id user (get access-level rights) u0))
            (ok (map-delete access-rights { data-id: data-id, user: user }))
        )
    )
)

;; Trait implementation: Get data details
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

;; Trait implementation: Verify access rights
(define-public (verify-access-rights (data-id uint) (user principal))
    (match (map-get? access-rights { data-id: data-id, user: user })
        rights (ok (and (>= (get access-level rights) ACCESS-LEVEL-BASIC) (< burn-block-height (get expiration rights))))
        (ok false)
    )
)

;; Read-only functions
(define-read-only (get-dataset (data-id uint))
    (map-get? genetic-datasets { data-id: data-id })
)

(define-read-only (get-user-access (data-id uint) (user principal))
    (map-get? access-rights { data-id: data-id, user: user })
)

(define-read-only (get-active-datasets-count)
    (var-get audit-trail-counter)
)
