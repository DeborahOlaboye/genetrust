;; Amount validation and security helpers

;; Check if amount is positive
(define-public (is-positive-amount (amount uint))
  (ok (> amount u0))
)

;; Check if amount is within safe bounds
(define-public (is-safe-amount (amount uint))
  (ok (<= amount MAX-AMOUNT))
)

;; Guard: require amount is positive
(define-public (guard-positive-amount (amount uint))
  (if (is-eq amount u0)
    (err ERR-INVALID-AMOUNT)
    (ok true))
)

;; Guard: require amount is within bounds
(define-public (guard-safe-amount (amount uint))
  (if (> amount MAX-AMOUNT)
    (err ERR-INVALID-AMOUNT)
    (ok true))
)

;; Guard: require amount is in range
(define-public (guard-amount-in-range (amount uint) (min-amt uint) (max-amt uint))
  (if (or (< amount min-amt) (> amount max-amt))
    (err ERR-INVALID-AMOUNT)
    (ok true))
)

;; Compare amounts safely
(define-public (compare-amounts (a1 uint) (a2 uint))
  (ok (if (< a1 a2) (- a2 a1) (- a1 a2)))
)

;; Check if amount exceeds threshold
(define-public (exceeds-threshold (amount uint) (threshold uint))
  (ok (> amount threshold))
)

;; Check if amount is sufficient for fee
(define-public (has-sufficient-balance (balance uint) (amount uint) (fee uint))
  (ok (>= balance (+ amount fee)))
)
