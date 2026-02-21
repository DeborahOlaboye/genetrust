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
