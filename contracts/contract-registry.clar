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

;; ── Version lifecycle ─────────────────────────────────────────────────────────

;; Check if a specific version is still active (not deprecated, not superseded).
;; Implements contract-registry-trait.is-version-active.
(define-public (is-version-active (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (ok (and (get is-active entry) (not (get is-deprecated entry))))
        ERR-VERSION-NOT-FOUND
    )
)

;; Read-only variant of is-version-active for gas-free off-chain checks.
(define-read-only (check-version-active (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (and (get is-active entry) (not (get is-deprecated entry)))
        false
    )
)

;; Deprecate a specific version so callers know it should not be used.
;; Only the registry admin may deprecate versions.
(define-public (deprecate-version (name (string-utf8 100)) (version uint))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))

        (let ((entry (unwrap! (map-get? contract-versions { name: name, version: version })
                              ERR-VERSION-NOT-FOUND)))
            ;; Mark as deprecated and inactive
            (map-set contract-versions
                { name: name, version: version }
                (merge entry { is-deprecated: true, is-active: false })
            )

            ;; Audit the deprecation
            (write-audit name version (get contract-principal entry) u"deprecate")

            (ok true)
        )
    )
)

;; Reactivate a previously deactivated (but not deprecated) version.
;; Useful for emergency rollbacks. Only admin.
(define-public (reactivate-version (name (string-utf8 100)) (version uint))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))

        (let ((entry (unwrap! (map-get? contract-versions { name: name, version: version })
                              ERR-VERSION-NOT-FOUND)))
            ;; Cannot reactivate a deprecated entry
            (asserts! (not (get is-deprecated entry)) ERR-VERSION-DEPRECATED)

            (map-set contract-versions
                { name: name, version: version }
                (merge entry { is-active: true })
            )

            (write-audit name version (get contract-principal entry) u"reactivate")

            (ok true)
        )
    )
)

;; ── Capability discovery ──────────────────────────────────────────────────────
;; Capabilities are free-form utf8 tags attached to each version entry.
;; Examples: "exchange", "btc-escrow", "dataset-registry", "governance", "v2".
;; They allow callers to discover what features a given contract version exposes
;; without hard-coding interface assumptions.

;; Return the capabilities list for a (name, version) pair.
;; Implements contract-registry-trait.get-capabilities.
(define-public (get-capabilities (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (ok (get capabilities entry))
        ERR-VERSION-NOT-FOUND
    )
)

;; Read-only variant for off-chain use.
(define-read-only (read-capabilities (name (string-utf8 100)) (version uint))
    (match (map-get? contract-versions { name: name, version: version })
        entry (some (get capabilities entry))
        none
    )
)

;; Set the capabilities list for a registered version. Admin-only.
;; Replaces the entire capabilities list; the caller should include all tags.
(define-public (set-capabilities
    (name         (string-utf8 100))
    (version      uint)
    (capabilities (list 10 (string-utf8 50))))
    (begin
        (try! (assert-not-paused))
        (try! (assert-admin))

        (let ((entry (unwrap! (map-get? contract-versions { name: name, version: version })
                              ERR-VERSION-NOT-FOUND)))
            (map-set contract-versions
                { name: name, version: version }
                (merge entry { capabilities: capabilities })
            )
            (write-audit name version (get contract-principal entry) u"set-capabilities")
            (ok true)
        )
    )
)

;; Check if a specific capability tag is present for (name, latest-version).
;; Used by callers to guard against calling a contract that lacks a feature.
(define-read-only (has-capability
    (name       (string-utf8 100))
    (capability (string-utf8 50)))
    (match (map-get? latest-versions { name: name })
        latest-entry
            (match (map-get? contract-versions { name: name, version: (get version latest-entry) })
                version-entry
                    (is-some (index-of (get capabilities version-entry) capability))
                false
            )
        false
    )
)

;; ── Graceful migration support ────────────────────────────────────────────────
;; A migration is a deliberate, admin-initiated promotion of the active version
;; for a named contract slot. It records a structured log entry so that
;; off-chain tooling (indexers, dashboards) can reconstruct the full upgrade
;; history and provide rollback guidance.

;; Promote a new contract principal as the active version for a name.
;; This is similar to register-version but intended for post-audit upgrades
;; where the new principal is already known and the migration note is mandatory.
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
            ;; Deactivate previous latest if it exists
            (match (map-get? latest-versions { name: name })
                prev (map-set contract-versions
                        { name: name, version: (get version prev) }
                        (merge (unwrap-panic (map-get? contract-versions
                                    { name: name, version: (get version prev) }))
                               { is-active: false })
                     )
                true
            )

            ;; Register the new version
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

            ;; Update latest pointer
            (map-set latest-versions
                { name: name }
                { version: new-version, contract-principal: new-principal }
            )
            (map-set version-counts { name: name } { count: new-version })

            ;; Record migration log
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

;; Read a migration record by its ID.
(define-read-only (get-migration-record (migration-id uint))
    (map-get? migration-records { migration-id: migration-id })
)

;; Return the total number of migrations recorded.
(define-read-only (get-migration-count)
    (var-get migration-counter)
)

;; Return a concise summary of the most recent migration for a named slot.
;; Returns none when no migration has been performed for that name.
(define-read-only (get-latest-migration-summary (name (string-utf8 100)))
    (let ((total (var-get migration-counter)))
        (if (is-eq total u0)
            none
            ;; Walk backwards from the last recorded migration to find the most
            ;; recent entry that matches the requested name.
            ;; We check only the last entry for efficiency (single read).
            (match (map-get? migration-records { migration-id: (- total u1) })
                record (if (is-eq (get name record) name)
                    (some {
                        from-version:   (get from-version record),
                        to-version:     (get to-version record),
                        migrated-at:    (get migrated-at record),
                        migration-note: (get migration-note record)
                    })
                    none
                )
                none
            )
        )
    )
)

;; ── Audit trail read functions ────────────────────────────────────────────────

;; Read a single audit entry by its ID.
(define-read-only (get-audit-entry (audit-id uint))
    (map-get? registration-audit { audit-id: audit-id })
)

;; Return the total number of audit entries written.
(define-read-only (get-audit-count)
    (var-get audit-counter)
)

;; ── Compound discovery helpers ────────────────────────────────────────────────
;; These helpers combine multiple lookups to give callers the information they
;; need in a single read-only call, minimising round-trips.

;; Return a summary of the latest registered version for a named contract:
;; { version, principal, is-active, is-deprecated, capabilities }.
(define-read-only (get-latest-summary (name (string-utf8 100)))
    (match (map-get? latest-versions { name: name })
        latest
            (match (map-get? contract-versions { name: name, version: (get version latest) })
                entry (some {
                    version:            (get version latest),
                    contract-principal: (get contract-principal entry),
                    is-active:          (get is-active entry),
                    is-deprecated:      (get is-deprecated entry),
                    capabilities:       (get capabilities entry),
                    registered-at:      (get registered-at entry)
                })
                none
            )
        none
    )
)

;; Verify that a given principal matches the latest registered version.
;; Designed to be called after contract-of extracts the principal from a
;; trait-typed argument, allowing callers to confirm they received the
;; correct (non-spoofed) contract before dispatching.
(define-read-only (verify-is-latest
    (name               (string-utf8 100))
    (contract-principal principal))
    (match (map-get? latest-versions { name: name })
        latest (is-eq (get contract-principal latest) contract-principal)
        false
    )
)

;; ── Additional discovery helpers ──────────────────────────────────────────────

;; Return true if any version has been registered under the given name.
;; Off-chain callers can use this to cheaply check existence before querying
;; further details.
(define-read-only (is-contract-registered (name (string-utf8 100)))
    (is-some (map-get? latest-versions { name: name }))
)

;; Atomic single-call lookup that returns the latest version's principal,
;; active status, and capabilities together.  This reduces round-trips for
;; callers that need all three fields before dispatching.
;; Returns none when the name has never been registered.
(define-read-only (lookup-and-verify
    (name               (string-utf8 100))
    (contract-principal principal))
    (match (map-get? latest-versions { name: name })
        latest
            (match (map-get? contract-versions { name: name, version: (get version latest) })
                entry (some {
                    is-latest:          (is-eq (get contract-principal latest) contract-principal),
                    is-active:          (get is-active entry),
                    is-deprecated:      (get is-deprecated entry),
                    capabilities:       (get capabilities entry),
                    registered-version: (get version latest)
                })
                none
            )
        none
    )
)
