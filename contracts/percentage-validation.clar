;; Percentage validation and security helpers

(define-constant ERR-INVALID-PERCENTAGE u1008)
(define-constant MIN-PERCENTAGE u0)
(define-constant MAX-PERCENTAGE u100)

;; Check if percentage is valid (0-100)
(define-read-only (is-valid-percentage-range (percentage uint))
  (ok (and
    (>= percentage MIN-PERCENTAGE)
    (<= percentage MAX-PERCENTAGE)))
)

;; Check if percentage is positive
(define-read-only (is-positive-percentage (percentage uint))
  (ok (> percentage u0))
)

;; Guard: require percentage is valid
(define-read-only (guard-valid-percentage (percentage uint))
  (if (> percentage MAX-PERCENTAGE)
    (err ERR-INVALID-PERCENTAGE)
    (ok true))
)

;; Guard: require percentage is in range
(define-read-only (guard-percentage-in-range (percentage uint))
  (if (or (< percentage MIN-PERCENTAGE) (> percentage MAX-PERCENTAGE))
    (err ERR-INVALID-PERCENTAGE)
    (ok true))
)

;; Calculate percentage of amount
(define-read-only (calculate-percentage (amount uint) (percentage uint))
  (ok (/ (* amount percentage) u100))
)

;; Validate percentage sum
(define-read-only (percentages-sum-to-hundred (p1 uint) (p2 uint) (p3 uint))
  (ok (is-eq (+ p1 (+ p2 p3)) u100))
)

;; Compare percentages
(define-read-only (compare-percentages (p1 uint) (p2 uint))
  (ok (if (< p1 p2) p2 p1))
)
