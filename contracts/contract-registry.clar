;; contract-registry.clar
;; Central on-chain registry for upgradeable contract components.
;; Leverages Clarity's dynamic dispatch to enable contract discovery.

(impl-trait .contract-registry-trait.contract-registry-trait)

;; ── Error codes ───────────────────────────────────────────────────────────────
(define-constant ERR-NOT-AUTHORIZED       (err u401))
(define-constant ERR-INVALID-INPUT        (err u400))
(define-constant ERR-CONTRACT-NOT-FOUND   (err u404))
(define-constant ERR-VERSION-NOT-FOUND    (err u404))
(define-constant ERR-ALREADY-EXISTS       (err u409))
(define-constant ERR-CONTRACT-PAUSED      (err u503))
(define-constant ERR-INVALID-CAPABILITY   (err u400))
(define-constant ERR-MIGRATION-FAILED     (err u500))
(define-constant ERR-VERSION-DEPRECATED   (err u410))

;; ── Admin state ───────────────────────────────────────────────────────────────
(define-data-var registry-admin principal tx-sender)
(define-data-var is-paused      bool      false)

;; ── Storage maps ──────────────────────────────────────────────────────────────

;; Maps (name, version) → full version entry
(define-map contract-versions
    { name: (string-utf8 100), version: uint }
    {
        contract-principal: principal,
        registered-at:      uint,
        registered-by:      principal,
        is-active:          bool,
        is-deprecated:      bool,
        capabilities:       (list 10 (string-utf8 50))
    }
)

;; Maps name → { latest-version, latest-principal }
(define-map latest-versions
    { name: (string-utf8 100) }
    {
        version:            uint,
        contract-principal: principal
    }
)

;; Maps name → total versions registered so far
(define-map version-counts
    { name: (string-utf8 100) }
    { count: uint }
)

;; Migration log
(define-map migration-records
    { migration-id: uint }
    {
        name:           (string-utf8 100),
        from-version:   uint,
        to-version:     uint,
        migrated-at:    uint,
        migrated-by:    principal,
        migration-note: (string-utf8 200)
    }
)
(define-data-var migration-counter uint u0)

;; Audit trail
(define-map registration-audit
    { audit-id: uint }
    {
        name:               (string-utf8 100),
        version:            uint,
        contract-principal: principal,
        action:             (string-utf8 50),
        performed-at:       uint,
        performed-by:       principal
    }
)
(define-data-var audit-counter uint u0)

;; ── Internal helpers ──────────────────────────────────────────────────────────

(define-private (assert-not-paused)
    (if (var-get is-paused)
        ERR-CONTRACT-PAUSED
        (ok true)
    )
)

(define-private (assert-admin)
    (if (is-eq tx-sender (var-get registry-admin))
        (ok true)
        ERR-NOT-AUTHORIZED
    )
)

(define-private (write-audit
    (name    (string-utf8 100))
    (version uint)
    (principal-val principal)
    (action  (string-utf8 50)))
    (let ((aid (var-get audit-counter)))
        (map-set registration-audit
            { audit-id: aid }
            {
                name:               name,
                version:            version,
                contract-principal: principal-val,
                action:             action,
                performed-at:       stacks-block-height,
                performed-by:       tx-sender
            }
        )
        (var-set audit-counter (+ aid u1))
        aid
    )
)

;; ── Admin public functions ────────────────────────────────────────────────────

(define-public (set-registry-admin (new-admin principal))
    (begin
        (try! (assert-admin))
        (ok (var-set registry-admin new-admin))
    )
)

(define-public (set-paused (paused bool))
    (begin
        (try! (assert-admin))
        (var-set is-paused paused)
        (ok paused)
    )
)

;; ── Version registration ──────────────────────────────────────────────────────

(define-public (register-version
    (name               (string-utf8 100))
    (contract-principal principal))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)

        (let (
            (counts      (default-to { count: u0 } (map-get? version-counts { name: name })))
            (new-version (+ (get count counts) u1))
            (prev-latest (map-get? latest-versions { name: name }))
        )
            ;; Deactivate previous version entry
            (match prev-latest
                prev (match (map-get? contract-versions { name: name, version: (get version prev) })
                        entry (map-set contract-versions
                                { name: name, version: (get version prev) }
                                (merge entry { is-active: false }))
                        true)
                true
            )

            ;; Write new entry
            (map-set contract-versions
                { name: name, version: new-version }
                {
                    contract-principal: contract-principal,
                    registered-at:      stacks-block-height,
                    registered-by:      tx-sender,
                    is-active:          true,
                    is-deprecated:      false,
                    capabilities:       (list)
                }
            )

            (map-set latest-versions
                { name: name }
                { version: new-version, contract-principal: contract-principal }
            )

            (map-set version-counts { name: name } { count: new-version })
            (write-audit name new-version contract-principal u"register")
            (ok new-version)
        )
    )
)

;; ── Version query functions ───────────────────────────────────────────────────

(define-public (get-latest-version (name (string-utf8 100)))
    (match (map-get? latest-versions { name: name })
        entry (ok (get contract-principal entry))
        ERR-CONTRACT-NOT-FOUND
    )
)

(define-public (get-version (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (ok (get contract-principal entry))
        ERR-VERSION-NOT-FOUND
    )
)

(define-public (is-version-active (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (ok (and (get is-active entry) (not (get is-deprecated entry))))
        ERR-VERSION-NOT-FOUND
    )
)

(define-public (get-capabilities (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (ok (get capabilities entry))
        ERR-VERSION-NOT-FOUND
    )
)

;; ── Version lifecycle ─────────────────────────────────────────────────────────

(define-public (deprecate-version (name (string-utf8 100)) (version uint))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))
        (let ((entry (unwrap! (map-get? contract-versions { name: name, version: version }) ERR-VERSION-NOT-FOUND)))
            (map-set contract-versions
                { name: name, version: version }
                (merge entry { is-deprecated: true, is-active: false })
            )
            (write-audit name version (get contract-principal entry) u"deprecate")
            (ok true)
        )
    )
)

(define-public (set-capabilities
    (name         (string-utf8 100))
    (version      uint)
    (capabilities (list 10 (string-utf8 50))))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))
        (let ((entry (unwrap! (map-get? contract-versions { name: name, version: version }) ERR-VERSION-NOT-FOUND)))
            (map-set contract-versions
                { name: name, version: version }
                (merge entry { capabilities: capabilities })
            )
            (write-audit name version (get contract-principal entry) u"set-capabilities")
            (ok true)
        )
    )
)

;; ── Migration support ─────────────────────────────────────────────────────────

(define-public (migrate-contract
    (name              (string-utf8 100))
    (new-principal     principal)
    (capabilities      (list 10 (string-utf8 50)))
    (migration-note    (string-utf8 200)))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)
        (asserts! (> (len migration-note) u0) ERR-INVALID-INPUT)

        (let (
            (counts      (default-to { count: u0 } (map-get? version-counts { name: name })))
            (from-ver    (get count counts))
            (new-version (+ from-ver u1))
            (mid         (var-get migration-counter))
        )
            (match (map-get? latest-versions { name: name })
                prev (match (map-get? contract-versions { name: name, version: (get version prev) })
                        entry (map-set contract-versions
                                { name: name, version: (get version prev) }
                                (merge entry { is-active: false }))
                        true)
                true
            )

            (map-set contract-versions
                { name: name, version: new-version }
                {
                    contract-principal: new-principal,
                    registered-at:      stacks-block-height,
                    registered-by:      tx-sender,
                    is-active:          true,
                    is-deprecated:      false,
                    capabilities:       capabilities
                }
            )

            (map-set latest-versions
                { name: name }
                { version: new-version, contract-principal: new-principal }
            )
            (map-set version-counts { name: name } { count: new-version })

            (map-set migration-records
                { migration-id: mid }
                {
                    name:           name,
                    from-version:   from-ver,
                    to-version:     new-version,
                    migrated-at:    stacks-block-height,
                    migrated-by:    tx-sender,
                    migration-note: migration-note
                }
            )
            (var-set migration-counter (+ mid u1))
            (write-audit name new-version new-principal u"migrate")
            (ok new-version)
        )
    )
)

;; ── Read-only Helpers ────────────────────────────────────────────────────────

(define-read-only (get-version-info (name (string-utf8 100)) (version uint))
    (map-get? contract-versions { name: name, version: version })
)

(define-read-only (get-latest-version-info (name (string-utf8 100)))
    (map-get? latest-versions { name: name })
)
