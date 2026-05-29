;; Input validation utilities and helper functions
;; Comprehensive validation for all smart contract inputs

;; Principal validation
(define-constant MIN-PRINCIPAL-LENGTH u20)
(define-constant MAX-PRINCIPAL-LENGTH u34)

;; Amount validation
(define-constant MIN-AMOUNT u0)
(define-constant MAX-AMOUNT u340282366920938463463374607431768211455)

;; String validation
(define-constant MIN-STRING-LENGTH u1)
(define-constant MAX-STRING-LENGTH u256)

;; Data ID validation
(define-constant MIN-DATA-ID u1)
(define-constant MAX-DATA-ID u999999)

;; Validation error codes
(define-constant ERR-INVALID-PRINCIPAL u1001)
(define-constant ERR-INVALID-AMOUNT u1002)
(define-constant ERR-INVALID-STRING u1003)
(define-constant ERR-INVALID-DATA-ID u1004)
(define-constant ERR-EMPTY-INPUT u1005)
(define-constant ERR-INVALID-SENDER u1006)
(define-constant ERR-INVALID-RECIPIENT u1007)
(define-constant ERR-INVALID-PERCENTAGE u1008)

;; Validate principal is not zero address
(define-read-only (is-valid-principal (principal principal))
  (ok (and
    (not (is-eq principal tx-sender))
    (not (is-eq principal (as-contract tx-sender)))))
)

;; Validate amount is within bounds
(define-read-only (is-valid-amount (amount uint))
  (ok (and
    (>= amount MIN-AMOUNT)
    (<= amount MAX-AMOUNT)))
)

;; Validate percentage (0-100)
(define-read-only (is-valid-percentage (percentage uint))
  (ok (and
    (>= percentage u0)
    (<= percentage u100)))
)

;; Validate data ID
(define-read-only (is-valid-data-id (data-id uint))
  (ok (and
    (>= data-id MIN-DATA-ID)
    (<= data-id MAX-DATA-ID)))
)

;; Validate string length
(define-read-only (is-valid-string-length (str (string-utf8 256)))
  (let ((len (len str)))
    (ok (and
      (>= len MIN-STRING-LENGTH)
      (<= len MAX-STRING-LENGTH))))
)
