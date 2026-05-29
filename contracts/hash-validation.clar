;; Hash validation and security helpers

(define-constant ERR-INVALID-HASH u1010)
(define-constant MIN-HASH-LENGTH u32)
(define-constant MAX-HASH-LENGTH u32)

;; Check if hash is valid
(define-read-only (is-valid-hash (hash (buff 32)))
  (ok (is-eq (len hash) MAX-HASH-LENGTH))
)

;; Check if hash is not empty
(define-read-only (is-hash-not-empty (hash (buff 32)))
  (ok (> (len hash) u0))
)

;; Guard: require hash is not empty
(define-read-only (guard-hash-not-empty (hash (buff 32)))
  (if (is-eq (len hash) u0)
    (err ERR-INVALID-HASH)
    (ok true))
)

;; Guard: require hash is valid length
(define-read-only (guard-hash-length (hash (buff 32)))
  (let ((hash-len (len hash)))
    (if (not (is-eq hash-len MAX-HASH-LENGTH))
      (err ERR-INVALID-HASH)
      (ok true)))
)

;; Compare hashes
(define-read-only (hashes-equal (h1 (buff 32)) (h2 (buff 32)))
  (ok (is-eq h1 h2))
)

;; Validate hash format
(define-read-only (is-valid-hash-format (hash (buff 32)))
  (ok (> (len hash) u0))
)

;; Get hash length
(define-read-only (get-hash-length (hash (buff 32)))
  (ok (len hash))
)
