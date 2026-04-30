;; data-governance.clar
;; @title GeneTrust Data Governance
;; @version 1.1.0
;; @author GeneTrust
;; @notice Manages consent settings and GDPR rights for genetic datasets.
;;         Each dataset owner can set research, commercial, and clinical consent flags
;;         and invoke data subject rights: erasure, portability, and processing restriction.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.data-governance

(define-constant CONTRACT-VERSION "1.1.0")

;; Error code ranges mirror the rest of the contract suite:
;;   400-409  Input validation
;;   410-414  Authorization
;;   430-439  Not found
;;   440-449  Conflict / already exists
;;   450-459  Gone / inactive
;;   610-699  Business logic

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
;;         Frontends must decode these to human-readable region labels.
;;         Valid range: 0-4 (JURISDICTION-GLOBAL through JURISDICTION-CANADA).
(define-constant JURISDICTION-GLOBAL u0)  ;; No regional restriction
(define-constant JURISDICTION-US u1)      ;; United States — HIPAA / CCPA
(define-constant JURISDICTION-EU u2)      ;; European Union — GDPR (Regulation 2016/679)
(define-constant JURISDICTION-UK u3)      ;; United Kingdom — UK GDPR / Data Protection Act 2018
(define-constant JURISDICTION-CANADA u4) ;; Canada — PIPEDA / Bill C-27

;; @notice Number of blocks representing approximately one year of consent validity.
;;         Stacks produces ~1 block per 10 minutes: 6 blocks/hr × 24 hr × 365 days = 52 560.
;;         After expiry the owner must call renew-consent or set-consent to re-activate.
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
;; @return ok(true) on success.
;;         ERR-INVALID-INPUT (u400) if data-id is zero or jurisdiction code is out of range.
;;         ERR-NOT-AUTHORIZED (u410) if caller is not the existing record owner.
;;         ERR-CANNOT-MODIFY-ERASED (u612) if right-to-be-forgotten has been invoked.
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
        (asserts!
            (not (default-to false
                    (match (map-get? gdpr-records { data-id: data-id })
                        gdpr (some (get right-to-be-forgotten gdpr))
                        none
                    )))
            ERR-CANNOT-MODIFY-ERASED)
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
        (print { event: "consent-set", data-id: data-id, owner: tx-sender,
                 research: research-consent, commercial: commercial-consent,
                 clinical: clinical-consent, jurisdiction: jurisdiction,
                 block: stacks-block-height })
        (ok true)
    )
)

;; @notice Renews the consent expiry for an existing consent record without changing any flags.
;; @param data-id The dataset ID whose consent to renew (must be > 0 and have a record).
;; @return ok(true) on success. ERR-CONSENT-NOT-FOUND if no record exists.
;;         ERR-INVALID-INPUT if data-id is zero. ERR-NOT-AUTHORIZED if caller is not the owner.
;;         ERR-CANNOT-MODIFY-ERASED if right-to-be-forgotten has been invoked.
;; @requires Caller must be the existing consent record owner.
(define-public (renew-consent (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-CONSENT-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts!
            (not (default-to false
                    (match (map-get? gdpr-records { data-id: data-id })
                        gdpr (some (get right-to-be-forgotten gdpr))
                        none
                    )))
            ERR-CANNOT-MODIFY-ERASED)
        (map-set consent-records { data-id: data-id }
            (merge consent {
                expires-at: (+ stacks-block-height CONSENT-EXPIRY-BLOCKS),
                updated-at: stacks-block-height
            })
        )
        (print { event: "consent-renewed", data-id: data-id, owner: tx-sender,
                 new-expires-at: (+ stacks-block-height CONSENT-EXPIRY-BLOCKS),
                 block: stacks-block-height })
        (ok true)
    )
)

;; @notice Updates only the jurisdiction code on an existing consent record.
;; @param data-id The dataset ID to update.
;; @param jurisdiction The new jurisdiction code (0-4).
;; @return ok(true) on success. ERR-CONSENT-NOT-FOUND if no record. ERR-INVALID-INPUT if params invalid.
;;         ERR-NOT-AUTHORIZED if not the owner. ERR-CANNOT-MODIFY-ERASED if erasure was requested.
(define-public (update-jurisdiction (data-id uint) (jurisdiction uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-CONSENT-NOT-FOUND)))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (<= jurisdiction JURISDICTION-CANADA) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts!
            (not (default-to false
                    (match (map-get? gdpr-records { data-id: data-id })
                        gdpr (some (get right-to-be-forgotten gdpr))
                        none
                    )))
            ERR-CANNOT-MODIFY-ERASED)
        (map-set consent-records { data-id: data-id }
            (merge consent { jurisdiction: jurisdiction, updated-at: stacks-block-height })
        )
        (print { event: "jurisdiction-updated", data-id: data-id, owner: tx-sender,
                 old-jurisdiction: (get jurisdiction consent), new-jurisdiction: jurisdiction,
                 block: stacks-block-height })
        (ok true)
    )
)

;; @notice Flags this dataset with the GDPR right-to-be-forgotten.
;; @param data-id The dataset ID to flag (must be > 0 and have an existing consent record).
;; @return ok(true) on success. ERR-CONSENT-NOT-FOUND (u431) if no consent record exists.
;;         ERR-INVALID-INPUT (u400) if data-id is zero.
;;         ERR-NOT-AUTHORIZED (u410) if caller is not the owner.
;;         ERR-GDPR-FLAG-ALREADY-SET (u445) if the right was already invoked.
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
        (print { event: "erasure-requested", data-id: data-id, owner: tx-sender,
                 block: stacks-block-height })
        (ok true)
    )
)

;; @notice Flags this dataset with the GDPR data-portability right.
;; @param data-id The dataset ID to flag (must be > 0 and have an existing consent record).
;; @return ok(true) on success. ERR-CONSENT-NOT-FOUND (u431) if no consent record exists.
;;         ERR-INVALID-INPUT (u400) if data-id is zero.
;;         ERR-NOT-AUTHORIZED (u410) if caller is not the owner.
;;         ERR-GDPR-FLAG-ALREADY-SET (u445) if the right was already invoked.
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
;; @return ok(true) on success. ERR-CONSENT-NOT-FOUND (u431) if no consent record exists.
;;         ERR-INVALID-INPUT (u400) if data-id is zero.
;;         ERR-NOT-AUTHORIZED (u410) if caller is not the owner.
;;         ERR-GDPR-FLAG-ALREADY-SET (u445) if the right was already invoked.
;; @requires Caller must be the dataset consent owner.
(define-public (restrict-processing (data-id uint))
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-CONSENT-NOT-FOUND))
          (gdpr (default-to { right-to-be-forgotten: false, data-portability-requested: false, processing-restricted: false, updated-at: u0 }
                            (map-get? gdpr-records { data-id: data-id }))))
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get processing-restricted gdpr)) ERR-GDPR-FLAG-ALREADY-SET)
        (map-set gdpr-records { data-id: data-id }
            (merge gdpr { processing-restricted: true, updated-at: stacks-block-height })
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

;; @notice Returns the principal that owns the consent record for a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(principal) if a consent record exists, none otherwise.
(define-read-only (get-consent-owner (data-id uint))
    (match (map-get? consent-records { data-id: data-id })
        consent (some (get owner consent))
        none
    )
)

;; @notice Returns the block height at which consent expires for a dataset.
;; @param data-id The dataset ID to look up.
;; @return Some(uint) if a consent record exists, none otherwise.
(define-read-only (get-consent-expiry (data-id uint))
    (match (map-get? consent-records { data-id: data-id })
        consent (some (get expires-at consent))
        none
    )
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

;; @notice Checks whether processing has been restricted for a dataset.
;; @param data-id The dataset ID to check.
;; @return ok(true) if processing-restricted is set, ok(false) otherwise.
(define-read-only (is-processing-restricted (data-id uint))
    (match (map-get? gdpr-records { data-id: data-id })
        gdpr (ok (get processing-restricted gdpr))
        (ok false)
    )
)

;; @notice Checks whether erasure has been requested for a dataset.
;; @param data-id The dataset ID to check.
;; @return ok(true) if right-to-be-forgotten is set, ok(false) otherwise.
(define-read-only (is-erasure-requested (data-id uint))
    (match (map-get? gdpr-records { data-id: data-id })
        gdpr (ok (get right-to-be-forgotten gdpr))
        (ok false)
    )
)

;; @notice Checks whether data portability has been requested for a dataset.
;; @param data-id The dataset ID to check.
;; @return ok(true) if data-portability-requested is set, ok(false) otherwise.
(define-read-only (is-portability-requested (data-id uint))
    (match (map-get? gdpr-records { data-id: data-id })
        gdpr (ok (get data-portability-requested gdpr))
        (ok false)
    )
)

;; @notice Returns true if any GDPR right has been invoked for a dataset.
;; @param data-id The dataset ID to check.
;; @return ok(true) if any flag is set, ok(false) if none are set or no record exists.
(define-read-only (has-any-gdpr-flag (data-id uint))
    (match (map-get? gdpr-records { data-id: data-id })
        gdpr (ok (or (get right-to-be-forgotten gdpr)
                     (get data-portability-requested gdpr)
                     (get processing-restricted gdpr)))
        (ok false)
    )
)

;; @notice Returns the deployed contract version string.
;; @return The CONTRACT-VERSION constant value.
(define-read-only (get-version)
    CONTRACT-VERSION
)
