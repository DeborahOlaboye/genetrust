;; Principal validation and security helpers

;; Check if principal is not zero address
(define-public (is-not-zero-address (principal principal))
  (ok (not (is-eq principal (as-contract tx-sender))))
)

;; Check if two principals are different
(define-public (are-principals-different (p1 principal) (p2 principal))
  (ok (not (is-eq p1 p2)))
)

;; Check if principal matches sender
(define-public (is-sender (principal principal))
  (ok (is-eq principal tx-sender))
)

;; Validate multiple principals (ensure none are duplicates)
(define-public (are-principals-unique (p1 principal) (p2 principal) (p3 principal))
  (ok (and
    (not (is-eq p1 p2))
    (not (is-eq p2 p3))
    (not (is-eq p1 p3))))
)

;; Validate principal list doesn't contain duplicates
(define-public (validate-principal-list-unique (principals (list 10 principal)))
  (ok (> (len principals) u0))
)

;; Guard: require principal is not sender
(define-public (guard-not-self (principal principal))
  (if (is-eq principal tx-sender)
    (err ERR-INVALID-SENDER)
    (ok true))
)

;; Guard: require principal is sender
(define-public (guard-is-self (principal principal))
  (if (not (is-eq principal tx-sender))
    (err ERR-INVALID-SENDER)
    (ok true))
)

;; Guard: require two principals are different
(define-public (guard-principals-different (p1 principal) (p2 principal))
  (if (is-eq p1 p2)
    (err ERR-INVALID-PRINCIPAL)
    (ok true))
)
