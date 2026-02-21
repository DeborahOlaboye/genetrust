;; contract-registry-trait.clar
;; Trait definition for the upgradeable contract registry.
;; Contracts implementing this trait act as a central registry that maps
;; human-readable names to on-chain contract principals, enabling dynamic
;; contract discovery and upgradeable architecture via Clarity 4's contract-of.

(define-trait contract-registry-trait
    (
        ;; Return the principal of the latest active version for a named contract.
        ;; Returns ERR-CONTRACT-NOT-FOUND (u404) when the name is unknown.
        (get-latest-version ((string-utf8 100)) (response principal uint))

        ;; Return the principal of a specific version of a named contract.
        ;; Returns ERR-CONTRACT-NOT-FOUND (u404) when the version does not exist.
        (get-version ((string-utf8 100) uint) (response principal uint))

        ;; Register a new version for a named contract (admin-only).
        ;; Returns the assigned version number on success.
        (register-version ((string-utf8 100) principal) (response uint uint))

        ;; Check whether a specific version is still active (not deprecated).
        (is-version-active ((string-utf8 100) uint) (response bool uint))

        ;; Return the list of declared capabilities for a named contract version.
        ;; Capabilities are free-form utf8 tags, e.g. "exchange", "registry", "btc-escrow".
        (get-capabilities ((string-utf8 100) uint) (response (list 10 (string-utf8 50)) uint))
    )
)
