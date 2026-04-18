;; data-governance.clar
;; @title GeneTrust Data Governance
;; @version 1.0.0
;; @author GeneTrust
;; @notice Manages consent settings and GDPR rights for genetic datasets.
;;         Each dataset owner can set research, commercial, and clinical consent flags
;;         and invoke data subject rights: erasure, portability, and processing restriction.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.data-governance

;; Errors
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-INVALID-INPUT (err u400))

;; @notice Jurisdiction identifiers mapped to uint codes for on-chain storage.
;;         Frontends should decode these to human-readable region labels.
(define-constant JURISDICTION-GLOBAL u0)  ;; No regional restriction
(define-constant JURISDICTION-US u1)      ;; United States (HIPAA)
(define-constant JURISDICTION-EU u2)      ;; European Union (GDPR)
(define-constant JURISDICTION-UK u3)      ;; United Kingdom (UK GDPR)
(define-constant JURISDICTION-CANADA u4) ;; Canada (PIPEDA)

;; @notice Number of blocks representing approximately one year of consent validity.
;;         Based on ~10-minute Stacks block times: 6 blocks/hr x 24 hr x 365 days = 52560.
(define-constant CONSENT-EXPIRY-BLOCKS u52560)

;; @notice Stores per-dataset consent settings set by the data owner.
;;         Consent expires after CONSENT-EXPIRY-BLOCKS and must be renewed.
;; @dev owner is captured at set-consent time; only owner can update or invoke GDPR rights.
(define-map consent-records
    { data-id: uint }
    {
        owner: principal,
        research-consent: bool,
        commercial-consent: bool,
        clinical-consent: bool,
        jurisdiction: uint,
        expires-at: uint,
        updated-at: uint
    }
)

;; @notice Tracks GDPR right invocations for each dataset.
;;         Flags are set to true when the owner exercises their rights and are never unset.
;; @dev Downstream systems must honor these flags when processing or exposing dataset data.
(define-map gdpr-records
    { data-id: uint }
    {
        right-to-be-forgotten: bool,
        data-portability-requested: bool,
        processing-restricted: bool,
        updated-at: uint
    }
)

;; Set or update consent for a dataset
(define-public (set-consent
    (data-id uint)
    (research-consent bool)
    (commercial-consent bool)
    (clinical-consent bool)
    (jurisdiction uint))
    (begin
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (<= jurisdiction JURISDICTION-CANADA) ERR-INVALID-INPUT)
        (match (map-get? consent-records { data-id: data-id })
            existing (asserts! (is-eq tx-sender (get owner existing)) ERR-NOT-AUTHORIZED)
            true
        )
        (map-set consent-records { data-id: data-id }
            {
                owner: tx-sender,
                research-consent: research-consent,
                commercial-consent: commercial-consent,
                clinical-consent: clinical-consent,
                jurisdiction: jurisdiction,
                expires-at: (+ stacks-block-height CONSENT-EXPIRY-BLOCKS),
                updated-at: stacks-block-height
            }
        )
        (ok true)
    )
)

;; Request right-to-be-forgotten (owner only)
(define-public (request-erasure (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (map-set gdpr-records { data-id: data-id }
            (merge
                (default-to
                    { right-to-be-forgotten: false, data-portability-requested: false, processing-restricted: false, updated-at: u0 }
                    (map-get? gdpr-records { data-id: data-id })
                )
                { right-to-be-forgotten: true, updated-at: stacks-block-height }
            )
        )
        (ok true)
    )
)

;; Request data portability (owner only)
(define-public (request-portability (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (map-set gdpr-records { data-id: data-id }
            (merge
                (default-to
                    { right-to-be-forgotten: false, data-portability-requested: false, processing-restricted: false, updated-at: u0 }
                    (map-get? gdpr-records { data-id: data-id })
                )
                { data-portability-requested: true, updated-at: stacks-block-height }
            )
        )
        (ok true)
    )
)

;; Restrict processing (owner only)
(define-public (restrict-processing (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (map-set gdpr-records { data-id: data-id }
            (merge
                (default-to
                    { right-to-be-forgotten: false, data-portability-requested: false, processing-restricted: false, updated-at: u0 }
                    (map-get? gdpr-records { data-id: data-id })
                )
                { processing-restricted: true, updated-at: stacks-block-height }
            )
        )
        (ok true)
    )
)

;; Read: get consent for a dataset
(define-read-only (get-consent (data-id uint))
    (map-get? consent-records { data-id: data-id })
)

;; Read: get GDPR flags for a dataset
(define-read-only (get-gdpr-status (data-id uint))
    (map-get? gdpr-records { data-id: data-id })
)

;; Read: check if consent is currently valid (not expired)
(define-read-only (has-valid-consent (data-id uint))
    (match (map-get? consent-records { data-id: data-id })
        consent (ok (< stacks-block-height (get expires-at consent)))
        (ok false)
    )
)
