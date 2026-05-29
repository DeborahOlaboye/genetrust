;; Data ID validation and security helpers

;; Check if data ID is valid
(define-read-only (is-valid-data-id-range (data-id uint))
  (ok (and
    (>= data-id MIN-DATA-ID)
    (<= data-id MAX-DATA-ID)))
)

;; Check if data ID is positive
(define-read-only (is-positive-data-id (data-id uint))
  (ok (> data-id u0))
)

;; Guard: require data ID is valid
(define-read-only (guard-valid-data-id (data-id uint))
  (if (is-eq data-id u0)
    (err ERR-INVALID-DATA-ID)
    (ok true))
)

;; Guard: require data ID is in range
(define-read-only (guard-data-id-in-range (data-id uint))
  (if (or (< data-id MIN-DATA-ID) (> data-id MAX-DATA-ID))
    (err ERR-INVALID-DATA-ID)
    (ok true))
)

;; Compare data IDs
(define-read-only (data-ids-equal (id1 uint) (id2 uint))
  (ok (is-eq id1 id2))
)

;; Check if data ID is within safe bounds
(define-read-only (is-safe-data-id (data-id uint) (max-id uint))
  (ok (<= data-id max-id))
)

;; Increment data ID safely
(define-read-only (increment-data-id (data-id uint))
  (ok (+ data-id u1))
)

;; Validate data ID sequence
(define-read-only (is-sequential-data-id (prev-id uint) (curr-id uint))
  (ok (is-eq curr-id (+ prev-id u1)))
)
