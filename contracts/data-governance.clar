;; data-governance.clar
;; @title GeneTrust Data Governance
;; @version 1.0.0
;; @author GeneTrust
;; @notice Manages consent settings and GDPR rights for genetic datasets.
;;         Each dataset owner can set research, commercial, and clinical consent flags
;;         and invoke data subject rights: erasure, portability, and processing restriction.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.data-governance

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))

;; Errors - Authorization (410-414)
(define-constant ERR-NOT-AUTHORIZED (err u410))

;; Errors - Not Found (430-439)
(define-constant ERR-NOT-FOUND (err u430))
(define-constant ERR-CONSENT-NOT-FOUND (err u431))

;; Errors - Conflict / Already Exists (440-449)
(define-constant ERR-GDPR-FLAG-ALREADY-SET (err u445))

;; Errors - Gone / Inactive (450-459)
(define-constant ERR-CONSENT-EXPIRED (err u453))

;; Errors - Business Logic (610-699)
(define-constant ERR-CANNOT-MODIFY-ERASED (err u612))

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

;; @notice Sets or updates the consent configuration for a dataset.
;; @param data-id The dataset ID to configure consent for (must be > 0).
;; @param research-consent Whether research use of this dataset is permitted.
;; @param commercial-consent Whether commercial use of this dataset is permitted.
;; @param clinical-consent Whether clinical use of this dataset is permitted.
;; @param jurisdiction The regulatory jurisdiction code (0-4) governing this consent.
;; @return ok(true) on success. ERR-INVALID-INPUT if data-id or jurisdiction is invalid.
;;         ERR-NOT-AUTHORIZED if caller is not the existing record owner.
;; @requires Caller must be the existing consent record owner (if a record exists).
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

;; @notice Flags this dataset with the GDPR right-to-be-forgotten.
;; @param data-id The dataset ID to flag (must be > 0 and have an existing consent record).
;; @return ok(true) on success. ERR-NOT-FOUND if no consent record exists.
;;         ERR-INVALID-INPUT if data-id is zero. ERR-NOT-AUTHORIZED if caller is not the owner.
;; @requires Caller must be the dataset consent owner.
(define-public (request-erasure (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-CONSENT-NOT-FOUND))
          (gdpr (default-to { right-to-be-forgotten: false, data-portability-requested: false, processing-restricted: false, updated-at: u0 }
                            (map-get? gdpr-records { data-id: data-id }))))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get right-to-be-forgotten gdpr)) ERR-GDPR-FLAG-ALREADY-SET)
        (map-set gdpr-records { data-id: data-id }
            (merge gdpr { right-to-be-forgotten: true, updated-at: stacks-block-height })
        )
        (ok true)
    )
)

;; @notice Flags this dataset with the GDPR data-portability right.
;; @param data-id The dataset ID to flag (must be > 0 and have an existing consent record).
;; @return ok(true) on success. ERR-NOT-FOUND if no consent record exists.
;;         ERR-INVALID-INPUT if data-id is zero. ERR-NOT-AUTHORIZED if caller is not the owner.
;; @requires Caller must be the dataset consent owner.
(define-public (request-portability (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-CONSENT-NOT-FOUND))
          (gdpr (default-to { right-to-be-forgotten: false, data-portability-requested: false, processing-restricted: false, updated-at: u0 }
                            (map-get? gdpr-records { data-id: data-id }))))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get data-portability-requested gdpr)) ERR-GDPR-FLAG-ALREADY-SET)
        (map-set gdpr-records { data-id: data-id }
            (merge gdpr { data-portability-requested: true, updated-at: stacks-block-height })
        )
        (ok true)
    )
)

;; @notice Flags this dataset with the GDPR processing-restriction right.
;; @param data-id The dataset ID to flag (must be > 0 and have an existing consent record).
;; @return ok(true) on success. ERR-NOT-FOUND if no consent record exists.
;;         ERR-INVALID-INPUT if data-id is zero. ERR-NOT-AUTHORIZED if caller is not the owner.
;; @requires Caller must be the dataset consent owner.
(define-public (restrict-processing (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-CONSENT-NOT-FOUND)))
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

;; @notice Returns the full consent record for a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(consent-record) if found, none otherwise.
(define-read-only (get-consent (data-id uint))
    (map-get? consent-records { data-id: data-id })
)

;; @notice Returns the GDPR rights flags for a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(gdpr-record) if found, none if no GDPR rights have been invoked.
(define-read-only (get-gdpr-status (data-id uint))
    (map-get? gdpr-records { data-id: data-id })
)

;; @notice Checks whether the consent for a dataset is currently valid (not expired).
;; @param data-id The dataset ID to check.
;; @return ok(true) if a consent record exists and has not expired, ok(false) otherwise.
(define-read-only (has-valid-consent (data-id uint))
    (match (map-get? consent-records { data-id: data-id })
        consent (ok (< stacks-block-height (get expires-at consent)))
        (ok false)
    )
)
