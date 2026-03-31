;; error-definitions.clar
;; Standardized error types and handling for all contracts
;; Refactored for Clarity 2 compatibility

;; Standard HTTP-style error codes as uints
(define-constant ERR-BAD-REQUEST (err u400))
(define-constant ERR-UNAUTHORIZED (err u401))
(define-constant ERR-FORBIDDEN (err u403))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-CONFLICT (err u409))
(define-constant ERR-GONE (err u410))
(define-constant ERR-UNPROCESSABLE-ENTITY (err u422))
(define-constant ERR-TOO-MANY-REQUESTS (err u429))
(define-constant ERR-INTERNAL-SERVER-ERROR (err u500))
(define-constant ERR-SERVICE-UNAVAILABLE (err u503))

;; Dataset-specific errors (Standardized to u1000 range)
(define-constant ERR-DATASET-NOT-FOUND (err u1001))
(define-constant ERR-DATASET-EXISTS (err u1002))
(define-constant ERR-DATASET-INACTIVE (err u1003))
(define-constant ERR-INVALID-DATASET-ID (err u1004))

;; Access control errors (Standardized to u2000 range)
(define-constant ERR-ACCESS-EXPIRED (err u2001))
(define-constant ERR-INSUFFICIENT-ACCESS-LEVEL (err u2002))
(define-constant ERR-INVALID-ACCESS-LEVEL (err u2003))

;; Consent errors (Standardized to u3000 range)
(define-constant ERR-NO-CONSENT (err u3001))
(define-constant ERR-CONSENT-EXPIRED (err u3002))
(define-constant ERR-INVALID-CONSENT (err u3003))

;; Governance and GDPR errors (Standardized to u4000 range)
(define-constant ERR-INVALID-JURISDICTION (err u4001))
(define-constant ERR-GDPR-VIOLATION (err u4002))
(define-constant ERR-GDPR-RECORD-MISSING (err u4003))

;; Operational errors (Standardized to u5000 range)
(define-constant ERR-CONTRACT-PAUSED (err u5001))
(define-constant ERR-TRANSACTION-FAILED (err u5002))
(define-constant ERR-INVALID-BLOCK-HEIGHT (err u5003))

;; Contract registry errors
(define-constant ERR-CONTRACT-NOT-FOUND (err u6001))
(define-constant ERR-VERSION-NOT-FOUND (err u6002))
(define-constant ERR-VERSION-DEPRECATED (err u6003))
(define-constant ERR-MIGRATION-FAILED (err u6004))

;; Generic error code mapping for UI display
(define-read-only (get-error-http-label (error-code uint))
    (if (is-eq error-code u400) "Bad Request"
    (if (is-eq error-code u401) "Unauthorized"
    (if (is-eq error-code u403) "Forbidden"
    (if (is-eq error-code u404) "Not Found"
    (if (is-eq error-code u409) "Conflict"
    (if (is-eq error-code u422) "Unprocessable Entity"
    (if (is-eq error-code u429) "Too Many Requests"
    (if (is-eq error-code u500) "Internal Server Error"
    (if (is-eq error-code u503) "Service Unavailable"
    "Unknown Error")))))))))
)

;; Get user-friendly error message
(define-read-only (get-error-message (error-code uint))
    (if (is-eq error-code u400) "The request contained invalid data"
    (if (is-eq error-code u401) "You are not authorized to perform this action"
    (if (is-eq error-code u403) "Access denied"
    (if (is-eq error-code u404) "The requested resource was not found"
    (if (is-eq error-code u409) "The resource already exists"
    (if (is-eq error-code u422) "The request could not be processed due to invalid state"
    (if (is-eq error-code u429) "Too many requests, please try again later"
    (if (is-eq error-code u500) "An internal server error occurred"
    (if (is-eq error-code u503) "The service is temporarily unavailable"
    "An error occurred")))))))))
)
