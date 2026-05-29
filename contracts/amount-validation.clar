;; Amount validation and security helpers

;; Check if amount is positive
(define-read-only (is-positive-amount (amount uint))
  (ok (> amount u0))
)

;; Check if amount is within safe bounds
(define-read-only (is-safe-amount (amount uint))
  (ok (<= amount MAX-AMOUNT))
)

;; Guard: require amount is positive
(define-read-only (guard-positive-amount (amount uint))
  (if (is-eq amount u0)
    (err ERR-INVALID-AMOUNT)
    (ok true))
)

;; Guard: require amount is within bounds
(define-read-only (guard-safe-amount (amount uint))
  (if (> amount MAX-AMOUNT)
    (err ERR-INVALID-AMOUNT)
    (ok true))
)

;; Guard: require amount is in range
(define-read-only (guard-amount-in-range (amount uint) (min-amt uint) (max-amt uint))
  (if (or (< amount min-amt) (> amount max-amt))
    (err ERR-INVALID-AMOUNT)
    (ok true))
)

;; Compare amounts safely
(define-read-only (compare-amounts (a1 uint) (a2 uint))
  (ok (if (< a1 a2) (- a2 a1) (- a1 a2)))
)

;; Check if amount exceeds threshold
(define-read-only (exceeds-threshold (amount uint) (threshold uint))
  (ok (> amount threshold))
)

;; Check if amount is sufficient for fee
(define-read-only (has-sufficient-balance (balance uint) (amount uint) (fee uint))
  (ok (>= balance (+ amount fee)))
)
