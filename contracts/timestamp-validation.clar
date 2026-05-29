;; Timestamp validation and security helpers

(define-constant ERR-INVALID-TIMESTAMP u1009)
(define-constant MIN-TIMESTAMP u0)
(define-constant MAX-TIMESTAMP u999999999999)

;; Check if timestamp is valid
(define-read-only (is-valid-timestamp (timestamp uint))
  (ok (and
    (>= timestamp MIN-TIMESTAMP)
    (<= timestamp MAX-TIMESTAMP)))
)

;; Check if timestamp is in future
(define-read-only (is-future-timestamp (timestamp uint) (current-block uint))
  (ok (> timestamp current-block))
)

;; Check if timestamp is in past
(define-read-only (is-past-timestamp (timestamp uint) (current-block uint))
  (ok (< timestamp current-block))
)

;; Guard: require timestamp is valid
(define-read-only (guard-valid-timestamp (timestamp uint))
  (if (> timestamp MAX-TIMESTAMP)
    (err ERR-INVALID-TIMESTAMP)
    (ok true))
)

;; Guard: require timestamp is in future
(define-read-only (guard-future-timestamp (timestamp uint) (current-block uint))
  (if (<= timestamp current-block)
    (err ERR-INVALID-TIMESTAMP)
    (ok true))
)

;; Guard: require timestamp is in past
(define-read-only (guard-past-timestamp (timestamp uint) (current-block uint))
  (if (>= timestamp current-block)
    (err ERR-INVALID-TIMESTAMP)
    (ok true))
)

;; Calculate time difference
(define-read-only (calculate-time-diff (t1 uint) (t2 uint))
  (ok (if (> t1 t2) (- t1 t2) (- t2 t1)))
)
