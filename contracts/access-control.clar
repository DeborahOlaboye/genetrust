;; access-control.clar
;; Role-based access control for GeneTrust smart contracts

(define-constant ERR-NOT-ADMIN (err u100))
(define-constant ERR-NOT-AUTHORIZED (err u101))
(define-constant ERR-ALREADY-ROLE (err u102))
(define-constant ERR-INVALID-ROLE (err u103))

;; Role definitions
(define-constant ROLE-ADMIN 0x0001)
(define-constant ROLE_RESEARCHER 0x0002)
(define-constant ROLE_DATA_PROVIDER 0x0004)
(define-constant ROLE_VERIFIER 0x0008

;; Role management
(define-map roles principal uint)

;; Track contract admins
(define-data-var admins (list 10 principal) (list tx-sender))

;; Events
(define-data-var nonce uint u0)
(define-constant EVENT-ROLE-GRANTED 0x01)
(define-constant EVENT-ROLE-REVOKED 0x02

;; Modifier to restrict access to admins only
(define-private (only-admin)
    (let ((is-admin (contains? (var-get admins) tx-sender)))
        (asserts! is-admin ERR-NOT-ADMIN)
        (ok is-admin)
    )
)

;; Grant a role to an address
(define-public (grant-role (user principal) (role uint))
    (let (
        (is-admin (try! (only-admin)))
        (current-roles (default-to u0 (map-get? roles { user: user })))
    )
        (asserts! (not (is-eq (bitwise-and current-roles role) u0)) ERR-ALREADY-ROLE)
        (map-set roles { user: user } (bitwise-or current-roles role))
        (ok true)
    )
)

;; Revoke a role from an address
(define-public (revoke-role (user principal) (role uint))
    (let (
        (is-admin (try! (only-admin)))
        (current-roles (default-to u0 (map-get? roles { user: user })))
    )
        (asserts! (not (is-eq (bitwise-and current-roles role) u0)) ERR-INVALID-ROLE)
        (map-set roles { user: user } (bitwise-and current-roles (bitwise-not role)))
        (ok true)
    )
)

;; Check if an address has a specific role
(define-read-only (has-role (user principal) (role uint))
    (let ((user-roles (default-to u0 (map-get? roles { user: user }))))
        (ok (not (is-eq (bitwise-and user-roles role) u0)))
    )
)

;; Check if the sender has a specific role
(define-read-only (sender-has-role (role uint))
    (has-role tx-sender role)
)

;; Add a new admin
(define-public (add-admin (admin principal))
    (let ((is-admin (try! (only-admin))))
        (var-set admins (append (var-get admins) admin))
        (ok true)
    )
)

;; Remove an admin
(define-public (remove-admin (admin principal))
    (let ((is-admin (try! (only-admin))))
        (var-set admins (filter (var-get admins) (lambda (x) (not (is-eq x admin)))))
        (ok true)
    )
)

;; Check if address is an admin
(define-read-only (is-admin (user principal))
    (ok (contains? (var-get admins) user))
)
