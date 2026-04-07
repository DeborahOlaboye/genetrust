;; data-governance.clar
;; Consent management and GDPR controls for GeneTrust

;; Errors
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-INVALID-INPUT (err u400))

;; Jurisdiction constants (readable by frontend)
(define-constant JURISDICTION-GLOBAL u0)
(define-constant JURISDICTION-US u1)
(define-constant JURISDICTION-EU u2)
(define-constant JURISDICTION-UK u3)
(define-constant JURISDICTION-CANADA u4)

;; Consent expiry: ~1 year
(define-constant CONSENT-EXPIRY-BLOCKS u52560)

;; Consent records per dataset
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

;; GDPR flags per dataset
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
