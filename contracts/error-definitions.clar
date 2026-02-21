;; error-definitions.clar
;; Standardized error types and handling for all contracts
;; Clarity 4 enhanced error handling with context

;; Standard HTTP-style error codes
(define-constant HTTP-400-BAD-REQUEST u400)
(define-constant HTTP-401-UNAUTHORIZED u401)
(define-constant HTTP-403-FORBIDDEN u403)
(define-constant HTTP-404-NOT-FOUND u404)
(define-constant HTTP-409-CONFLICT u409)
(define-constant HTTP-422-UNPROCESSABLE-ENTITY u422)
(define-constant HTTP-500-INTERNAL-SERVER-ERROR u500)

;; Error type definitions with standardized codes
(define-constant ERR-INVALID-INPUT { code: u400, message: "Invalid input provided", context: none })
(define-constant ERR-NOT-AUTHORIZED { code: u401, message: "Authorization required", context: none })
(define-constant ERR-ACCESS-DENIED { code: u403, message: "Access denied", context: none })
(define-constant ERR-NOT-FOUND { code: u404, message: "Resource not found", context: none })
(define-constant ERR-ALREADY-EXISTS { code: u409, message: "Resource already exists", context: none })
(define-constant ERR-INVALID-STATE { code: u422, message: "Invalid state for operation", context: none })
(define-constant ERR-INTERNAL-ERROR { code: u500, message: "Internal server error", context: none })

;; Dataset-specific errors
(define-constant ERR-DATASET-NOT-FOUND { code: u404, message: "Dataset not found", context: none })
(define-constant ERR-DATASET-EXISTS { code: u409, message: "Dataset already exists", context: none })
(define-constant ERR-DATASET-INACTIVE { code: u422, message: "Dataset is inactive", context: none })
(define-constant ERR-INVALID-DATASET-ID { code: u400, message: "Invalid dataset ID", context: none })

;; Access control errors
(define-constant ERR-ACCESS-EXPIRED { code: u403, message: "Access has expired", context: none })
(define-constant ERR-INSUFFICIENT-ACCESS-LEVEL { code: u403, message: "Insufficient access level", context: none })
(define-constant ERR-INVALID-ACCESS-LEVEL { code: u400, message: "Invalid access level", context: none })

;; Consent errors
(define-constant ERR-NO-CONSENT { code: u403, message: "No consent for operation", context: none })
(define-constant ERR-CONSENT-EXPIRED { code: u403, message: "Consent has expired", context: none })
(define-constant ERR-INVALID-CONSENT { code: u400, message: "Invalid consent", context: none })

;; Governance and GDPR errors
(define-constant ERR-INVALID-JURISDICTION { code: u400, message: "Invalid jurisdiction", context: none })
(define-constant ERR-GDPR-VIOLATION { code: u422, message: "GDPR compliance violation", context: none })
(define-constant ERR-GDPR-RECORD-MISSING { code: u404, message: "GDPR record not found", context: none })

;; Rate limiting and operational errors
(define-constant ERR-RATE-LIMIT-EXCEEDED { code: u429, message: "Rate limit exceeded", context: none })
(define-constant ERR-CONTRACT-PAUSED { code: u503, message: "Contract is paused", context: none })
(define-constant ERR-TRANSACTION-FAILED { code: u500, message: "Transaction failed", context: none })

;; Block and timestamp errors
(define-constant ERR-INVALID-BLOCK-HEIGHT { code: u400, message: "Invalid block height", context: none })
(define-constant ERR-FUTURE-BLOCK-HEIGHT { code: u400, message: "Block height is in the future", context: none })

;; String and encoding errors
(define-constant ERR-INVALID-STRING { code: u400, message: "Invalid string encoding", context: none })
(define-constant ERR-STRING-TOO-LONG { code: u400, message: "String exceeds maximum length", context: none })

;; Generic error code mapping
(define-read-only (get-error-http-code (error-code uint))
    (match error-code
        u400 "Bad Request"
        u401 "Unauthorized"
        u403 "Forbidden"
        u404 "Not Found"
        u409 "Conflict"
        u422 "Unprocessable Entity"
        u429 "Too Many Requests"
        u500 "Internal Server Error"
        u503 "Service Unavailable"
        "Unknown Error"
    )
)

;; Get user-friendly error message
(define-read-only (get-error-message (error-code uint))
    (match error-code
        u400 "The request contained invalid data"
        u401 "You are not authorized to perform this action"
        u403 "Access denied"
        u404 "The requested resource was not found"
        u409 "The resource already exists"
        u422 "The request could not be processed due to invalid state"
        u429 "Too many requests, please try again later"
        u500 "An internal server error occurred"
        u503 "The service is temporarily unavailable"
        "An error occurred"
    )
)
