;; List validation and security helpers

;; Check if list is not empty
(define-read-only (is-list-not-empty (items (list 100 principal)))
  (ok (> (len items) u0))
)

;; Check if list length is valid
(define-read-only (is-valid-list-length (items (list 100 principal)) (min-len uint) (max-len uint))
  (let ((list-len (len items)))
    (ok (and
      (>= list-len min-len)
      (<= list-len max-len))))
)

;; Guard: require list is not empty
(define-read-only (guard-list-not-empty (items (list 100 principal)))
  (if (is-eq (len items) u0)
    (err ERR-EMPTY-LIST)
    (ok true))
)

;; Guard: require list length is within bounds
(define-read-only (guard-list-max-length (items (list 100 principal)) (max-len uint))
  (if (> (len items) max-len)
    (err ERR-INVALID-LIST)
    (ok true))
)

;; Guard: require list length is in range
(define-read-only (guard-list-in-range (items (list 100 principal)) (min-len uint) (max-len uint))
  (let ((list-len (len items)))
    (if (or (< list-len min-len) (> list-len max-len))
      (err ERR-INVALID-LIST)
      (ok true)))
)

;; Get list length
(define-read-only (get-list-length (items (list 100 principal)))
  (ok (len items))
)

;; Check if list has exactly n items
(define-read-only (list-has-length (items (list 100 principal)) (expected-len uint))
  (ok (is-eq (len items) expected-len))
)

(define-constant ERR-EMPTY-LIST u1012)
(define-constant ERR-INVALID-LIST u1013)
