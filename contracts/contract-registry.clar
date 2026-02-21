;; contract-registry.clar
;; Central on-chain registry for upgradeable contract components.
;; Leverages Clarity 4's contract-of to enable dynamic contract discovery:
;; callers pass a trait-typed reference and use contract-of to obtain its
;; principal, which is then validated against the version stored here.
;;
;; Architecture
;; ─────────────
;; • Named slots (e.g. "exchange", "dataset-registry") each hold an ordered
;;   list of versioned entries.
;; • Every registration bumps the version counter and marks the previous
;;   version as superseded.
;; • Callers query get-latest-version, receive the active principal, cast it
;;   to their expected trait, call contract-of on the trait arg for
;;   verification, and dispatch through the trait.

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

;; Migration log: records every time the active version changes
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

;; Audit trail: every registration action
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

;; Guard: revert if the registry is paused
(define-private (assert-not-paused)
    (if (var-get is-paused)
        ERR-CONTRACT-PAUSED
        (ok true)
    )
)

;; Guard: revert if tx-sender is not the admin
(define-private (assert-admin)
    (if (is-eq tx-sender (var-get registry-admin))
        (ok true)
        ERR-NOT-AUTHORIZED
    )
)

;; Write an audit entry and advance the counter
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

;; Transfer registry admin to a new principal
(define-public (set-registry-admin (new-admin principal))
    (begin
        (try! (assert-admin))
        (var-set registry-admin new-admin)
        (ok true)
    )
)

;; Pause / unpause the registry (admin only)
(define-public (set-paused (paused bool))
    (begin
        (try! (assert-admin))
        (var-set is-paused paused)
        (ok paused)
    )
)

;; ── Read-only admin helpers ───────────────────────────────────────────────────
(define-read-only (get-registry-admin) (var-get registry-admin))
(define-read-only (is-registry-paused) (var-get is-paused))

;; ── Version registration ──────────────────────────────────────────────────────

;; Register a new contract version under a human-readable name.
;; Implements the contract-registry-trait.register-version function.
;; Only the registry admin may call this.
;; Returns the newly assigned version number.
(define-public (register-version
    (name             (string-utf8 100))
    (contract-principal principal))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))

        ;; Validate inputs
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)

        (let (
            (counts     (default-to { count: u0 } (map-get? version-counts { name: name })))
            (new-version (+ (get count counts) u1))
            (prev-latest (map-get? latest-versions { name: name }))
        )
            ;; Deactivate the previous latest entry (but do not deprecate it yet)
            (match prev-latest
                prev (map-set contract-versions
                        { name: name, version: (get version prev) }
                        (merge (unwrap-panic (map-get? contract-versions
                                    { name: name, version: (get version prev) }))
                               { is-active: false })
                     )
                true  ;; no previous version — nothing to deactivate
            )

            ;; Write the new version entry (active, not deprecated, no capabilities yet)
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

            ;; Update the latest pointer
            (map-set latest-versions
                { name: name }
                { version: new-version, contract-principal: contract-principal }
            )

            ;; Bump the version counter
            (map-set version-counts { name: name } { count: new-version })

            ;; Audit
            (write-audit name new-version contract-principal u"register")

            (ok new-version)
        )
    )
)

;; ── Version query functions ───────────────────────────────────────────────────

;; Return the principal of the currently active (latest) version of a named
;; contract. Implements contract-registry-trait.get-latest-version.
;; This is the primary entry point for dynamic contract discovery:
;;   (let ((exchange-principal (try! (contract-call? .contract-registry get-latest-version u"exchange"))))
;;     ...)
(define-public (get-latest-version (name (string-utf8 100)))
    (match (map-get? latest-versions { name: name })
        entry (ok (get contract-principal entry))
        ERR-CONTRACT-NOT-FOUND
    )
)

;; Return the principal stored for a specific (name, version) pair.
;; Implements contract-registry-trait.get-version.
(define-public (get-version (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (ok (get contract-principal entry))
        ERR-VERSION-NOT-FOUND
    )
)

;; Return the full version metadata for a (name, version) pair.
;; Read-only helper for off-chain indexers.
(define-read-only (get-version-info (name (string-utf8 100)) (version uint))
    (map-get? contract-versions { name: name, version: version })
)

;; Return the latest version pointer (version number + principal) for a name.
(define-read-only (get-latest-version-info (name (string-utf8 100)))
    (map-get? latest-versions { name: name })
)

;; Return how many versions have been registered for a name.
(define-read-only (get-version-count (name (string-utf8 100)))
    (match (map-get? version-counts { name: name })
        info (get count info)
        u0
    )
)
