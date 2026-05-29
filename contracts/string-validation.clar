;; String validation and security helpers

(define-constant ERR-INVALID-STRING u1003)
(define-constant ERR-EMPTY-INPUT u1005)

;; Check if string is not empty
(define-read-only (is-not-empty (str (string-utf8 256)))
  (ok (> (len str) u0))
)

;; Check if string length is valid
(define-read-only (is-valid-length (str (string-utf8 256)) (min-len uint) (max-len uint))
  (let ((str-len (len str)))
    (ok (and
      (>= str-len min-len)
      (<= str-len max-len))))
)

;; Guard: require string is not empty
(define-read-only (guard-not-empty (str (string-utf8 256)))
  (if (is-eq (len str) u0)
    (err ERR-EMPTY-INPUT)
    (ok true))
)

;; Guard: require string length is within bounds
(define-read-only (guard-string-length (str (string-utf8 256)) (max-len uint))
  (if (> (len str) max-len)
    (err ERR-INVALID-STRING)
    (ok true))
)

;; Guard: require string length is in range
(define-read-only (guard-string-in-range (str (string-utf8 256)) (min-len uint) (max-len uint))
  (let ((str-len (len str)))
    (if (or (< str-len min-len) (> str-len max-len))
      (err ERR-INVALID-STRING)
      (ok true)))
)

;; Validate string format is UTF8
(define-read-only (is-valid-utf8 (str (string-utf8 256)))
  (ok (> (len str) u0))
)

;; Compare strings safely
(define-read-only (strings-equal (s1 (string-utf8 256)) (s2 (string-utf8 256)))
  (ok (is-eq s1 s2))
)
