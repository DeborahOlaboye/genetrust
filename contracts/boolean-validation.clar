;; Boolean validation and security helpers

(define-constant ERR-INVALID-BOOLEAN u1011)

;; Check if boolean is true
(define-read-only (is-true (value bool))
  (ok value)
)

;; Check if boolean is false
(define-read-only (is-false (value bool))
  (ok (not value))
)

;; Guard: require value is true
(define-read-only (guard-is-true (value bool))
  (if value
    (ok true)
    (err ERR-INVALID-BOOLEAN))
)

;; Guard: require value is false
(define-read-only (guard-is-false (value bool))
  (if (not value)
    (ok true)
    (err ERR-INVALID-BOOLEAN))
)

;; Validate boolean consistency
(define-read-only (booleans-match (b1 bool) (b2 bool))
  (ok (is-eq b1 b2))
)

;; Validate boolean XOR (exclusive or)
(define-read-only (booleans-xor (b1 bool) (b2 bool))
  (ok (not (is-eq b1 b2)))
)

;; Convert boolean to uint
(define-read-only (bool-to-uint (value bool))
  (ok (if value u1 u0))
)

;; Validate boolean AND operation
(define-read-only (booleans-and (b1 bool) (b2 bool))
  (ok (and b1 b2))
)
