;; Boolean validation and security helpers

;; Check if boolean is true
(define-public (is-true (value bool))
  (ok value)
)

;; Check if boolean is false
(define-public (is-false (value bool))
  (ok (not value))
)

;; Guard: require value is true
(define-public (guard-is-true (value bool))
  (if value
    (ok true)
    (err ERR-INVALID-BOOLEAN))
)

;; Guard: require value is false
(define-public (guard-is-false (value bool))
  (if (not value)
    (ok true)
    (err ERR-INVALID-BOOLEAN))
)

;; Validate boolean consistency
(define-public (booleans-match (b1 bool) (b2 bool))
  (ok (is-eq b1 b2))
)

;; Validate boolean XOR (exclusive or)
(define-public (booleans-xor (b1 bool) (b2 bool))
  (ok (not (is-eq b1 b2)))
)

;; Convert boolean to uint
(define-public (bool-to-uint (value bool))
  (ok (if value u1 u0))
)

;; Validate boolean AND operation
(define-public (booleans-and (b1 bool) (b2 bool))
  (ok (and b1 b2))
)

(define-constant ERR-INVALID-BOOLEAN u1011)
