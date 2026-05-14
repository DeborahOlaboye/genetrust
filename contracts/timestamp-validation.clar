;; Timestamp validation and security helpers

(define-constant MIN-TIMESTAMP u0)
(define-constant MAX-TIMESTAMP u999999999999)

;; Check if timestamp is valid
(define-public (is-valid-timestamp (timestamp uint))
  (ok (and
    (>= timestamp MIN-TIMESTAMP)
    (<= timestamp MAX-TIMESTAMP)))
)

;; Check if timestamp is in future
(define-public (is-future-timestamp (timestamp uint) (current-block uint))
  (ok (> timestamp current-block))
)

;; Check if timestamp is in past
(define-public (is-past-timestamp (timestamp uint) (current-block uint))
  (ok (< timestamp current-block))
)

;; Guard: require timestamp is valid
(define-public (guard-valid-timestamp (timestamp uint))
  (if (> timestamp MAX-TIMESTAMP)
    (err ERR-INVALID-TIMESTAMP)
    (ok true))
)

;; Guard: require timestamp is in future
(define-public (guard-future-timestamp (timestamp uint) (current-block uint))
  (if (<= timestamp current-block)
    (err ERR-INVALID-TIMESTAMP)
    (ok true))
)

;; Guard: require timestamp is in past
(define-public (guard-past-timestamp (timestamp uint) (current-block uint))
  (if (>= timestamp current-block)
    (err ERR-INVALID-TIMESTAMP)
    (ok true))
)

;; Calculate time difference
(define-public (calculate-time-diff (t1 uint) (t2 uint))
  (ok (if (> t1 t2) (- t1 t2) (- t2 t1)))
)

(define-constant ERR-INVALID-TIMESTAMP u1009)
