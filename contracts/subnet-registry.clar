;; subnet-registry.clar
;; Main chain registry of authorised Stacks subnets for GeneTrust.
;; Tracks which subnets are active, their types, and their operator addresses.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-SUBNET-EXISTS (err u201))
(define-constant ERR-SUBNET-NOT-FOUND (err u202))
(define-constant ERR-INVALID-SUBNET-TYPE (err u203))
(define-constant ERR-SUBNET-INACTIVE (err u204))
(define-constant ERR-INVALID-OPERATOR (err u205))

;; Subnet type constants
(define-constant SUBNET-TYPE-PROCESSING u1)
(define-constant SUBNET-TYPE-STORAGE u2)
(define-constant SUBNET-TYPE-HYBRID u3)

;; Contract admin
(define-data-var registry-admin principal tx-sender)
(define-data-var next-subnet-id uint u1)

;; Subnet registry map
(define-map subnets
    { subnet-id: uint }
    {
        subnet-type: uint,              ;; SUBNET-TYPE-* constant
        operator: principal,            ;; Who operates this subnet
        bridge-contract: principal,     ;; Main chain bridge contract address
        name: (string-utf8 64),
        description: (string-utf8 256),
        endpoint-url: (string-utf8 128),
        is-active: bool,
        registered-at: uint,
        last-seen-at: uint,
        total-jobs-processed: uint
    }
)

;; Map from subnet-type to list of subnet IDs (for discovery)
(define-map subnet-ids-by-type
    { subnet-type: uint }
    { ids: (list 20 uint) }
)

;; Authorised relayers per subnet (relayers submit proofs)
(define-map subnet-relayers
    { subnet-id: uint, relayer: principal }
    { authorized: bool, added-at: uint }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-subnet (subnet-id uint))
    (map-get? subnets { subnet-id: subnet-id })
)

(define-read-only (is-subnet-active (subnet-id uint))
    (match (map-get? subnets { subnet-id: subnet-id })
        s (get is-active s)
        false
    )
)

(define-read-only (is-authorized-relayer (subnet-id uint) (relayer principal))
    (match (map-get? subnet-relayers { subnet-id: subnet-id, relayer: relayer })
        r (get authorized r)
        false
    )
)

(define-read-only (get-subnets-by-type (subnet-type uint))
    (map-get? subnet-ids-by-type { subnet-type: subnet-type })
)

(define-read-only (get-next-subnet-id)
    (var-get next-subnet-id)
)

;; ─── Admin functions ─────────────────────────────────────────────────────────

(define-public (set-registry-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get registry-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set registry-admin new-admin))
    )
)

;; ─── Subnet management ───────────────────────────────────────────────────────

;; Register a new subnet
(define-public (register-subnet
    (subnet-type uint)
    (operator principal)
    (bridge-contract principal)
    (name (string-utf8 64))
    (description (string-utf8 256))
    (endpoint-url (string-utf8 128)))

    (begin
        (asserts! (is-eq tx-sender (var-get registry-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (and (>= subnet-type u1) (<= subnet-type u3)) ERR-INVALID-SUBNET-TYPE)

        (let ((subnet-id (var-get next-subnet-id)))
            (asserts! (is-none (map-get? subnets { subnet-id: subnet-id })) ERR-SUBNET-EXISTS)

            ;; Register subnet
            (map-set subnets
                { subnet-id: subnet-id }
                {
                    subnet-type: subnet-type,
                    operator: operator,
                    bridge-contract: bridge-contract,
                    name: name,
                    description: description,
                    endpoint-url: endpoint-url,
                    is-active: true,
                    registered-at: stacks-block-height,
                    last-seen-at: stacks-block-height,
                    total-jobs-processed: u0
                }
            )

            ;; Update type index
            (let ((existing (default-to { ids: (list) } (map-get? subnet-ids-by-type { subnet-type: subnet-type }))))
                (map-set subnet-ids-by-type
                    { subnet-type: subnet-type }
                    { ids: (unwrap-panic (as-max-len? (append (get ids existing) subnet-id) u20)) }
                )
            )

            (var-set next-subnet-id (+ subnet-id u1))
            (ok subnet-id)
        )
    )
)

;; Deactivate a subnet
(define-public (deactivate-subnet (subnet-id uint))
    (let ((subnet (unwrap! (map-get? subnets { subnet-id: subnet-id }) ERR-SUBNET-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (var-get registry-admin))
                (is-eq tx-sender (get operator subnet)))
            ERR-NOT-AUTHORIZED)
        (map-set subnets { subnet-id: subnet-id }
            (merge subnet { is-active: false }))
        (ok true)
    )
)

;; Reactivate a subnet
(define-public (reactivate-subnet (subnet-id uint))
    (let ((subnet (unwrap! (map-get? subnets { subnet-id: subnet-id }) ERR-SUBNET-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get registry-admin)) ERR-NOT-AUTHORIZED)
        (map-set subnets { subnet-id: subnet-id }
            (merge subnet { is-active: true }))
        (ok true)
    )
)

;; Add a relayer for a subnet
(define-public (add-relayer (subnet-id uint) (relayer principal))
    (let ((subnet (unwrap! (map-get? subnets { subnet-id: subnet-id }) ERR-SUBNET-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (var-get registry-admin))
                (is-eq tx-sender (get operator subnet)))
            ERR-NOT-AUTHORIZED)
        (map-set subnet-relayers
            { subnet-id: subnet-id, relayer: relayer }
            { authorized: true, added-at: stacks-block-height }
        )
        (ok true)
    )
)

;; Remove a relayer for a subnet
(define-public (remove-relayer (subnet-id uint) (relayer principal))
    (let ((subnet (unwrap! (map-get? subnets { subnet-id: subnet-id }) ERR-SUBNET-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (var-get registry-admin))
                (is-eq tx-sender (get operator subnet)))
            ERR-NOT-AUTHORIZED)
        (map-set subnet-relayers
            { subnet-id: subnet-id, relayer: relayer }
            { authorized: false, added-at: stacks-block-height }
        )
        (ok true)
    )
)

;; Record a heartbeat from a subnet operator (updates last-seen-at)
(define-public (subnet-heartbeat (subnet-id uint) (jobs-processed uint))
    (let ((subnet (unwrap! (map-get? subnets { subnet-id: subnet-id }) ERR-SUBNET-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get operator subnet)) ERR-NOT-AUTHORIZED)
        (asserts! (get is-active subnet) ERR-SUBNET-INACTIVE)
        (map-set subnets { subnet-id: subnet-id }
            (merge subnet {
                last-seen-at: stacks-block-height,
                total-jobs-processed: (+ (get total-jobs-processed subnet) jobs-processed)
            })
        )
        (ok true)
    )
)
