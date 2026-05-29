;; Hash validation and security helpers

(define-constant MIN-HASH-LENGTH u32)
(define-constant MAX-HASH-LENGTH u64)

;; Check if hash is valid
(define-read-only (is-valid-hash (hash (buff 64)))
  (ok (and
    (>= (len hash) MIN-HASH-LENGTH)
    (<= (len hash) MAX-HASH-LENGTH)))
)

;; Check if hash is not empty
(define-read-only (is-hash-not-empty (hash (buff 64)))
  (ok (> (len hash) u0))
)

;; Guard: require hash is not empty
(define-read-only (guard-hash-not-empty (hash (buff 64)))
  (if (is-eq (len hash) u0)
    (err ERR-INVALID-HASH)
    (ok true))
)

;; Guard: require hash is valid length
(define-read-only (guard-hash-length (hash (buff 64)))
  (let ((hash-len (len hash)))
    (if (or (< hash-len MIN-HASH-LENGTH) (> hash-len MAX-HASH-LENGTH))
      (err ERR-INVALID-HASH)
      (ok true)))
)

;; Compare hashes
(define-read-only (hashes-equal (h1 (buff 64)) (h2 (buff 64)))
  (ok (is-eq h1 h2))
)

;; Validate hash format
(define-read-only (is-valid-hash-format (hash (buff 64)))
  (ok (> (len hash) u0))
)

;; Get hash length
(define-read-only (get-hash-length (hash (buff 64)))
  (ok (len hash))
)

(define-constant ERR-INVALID-HASH u1010)
