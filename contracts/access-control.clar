;; access-control.clar
;; Role-based access control for GeneTrust smart contracts

;; Error codes mapped to HTTP status
(define-constant ERR-NOT-ADMIN (err u401))
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ALREADY-ROLE (err u409))
(define-constant ERR-INVALID-ROLE (err u400))

;; Role definitions
(define-constant ROLE-ADMIN 0x0001)
(define-constant ROLE-RESEARCHER 0x0002)
(define-constant ROLE-DATA-PROVIDER 0x0004)
(define-constant ROLE-VERIFIER 0x0008)

;; Role management
(define-map roles principal uint)

;; Track contract admins
(define-data-var admins (list 10 principal) (list tx-sender))

;; Error context tracking
(define-map error-context 
    { error-id: uint }
    {
        error-code: uint,
        message: (string-utf8 256),
        context-data: (string-utf8 512),
        timestamp: uint,
        user: principal
    }
)
(define-data-var error-counter uint u0)

;; Events
(define-data-var nonce uint u0)
(define-constant EVENT-ROLE-GRANTED 0x01)
(define-constant EVENT-ROLE-REVOKED 0x02)

;; Error context helper: Record error with context for debugging
(define-private (record-error (error-code uint) (message (string-utf8 256)) (context (string-utf8 512)) (user principal))
    (let ((error-id (var-get error-counter)))
        (begin
            (var-set error-counter (+ error-id u1))
            (map-set error-context
                { error-id: error-id }
                {
                    error-code: error-code,
                    message: message,
                    context-data: context,
                    timestamp: stacks-block-height,
                    user: user
                }
            )
            error-id
        )
    )
)

;; Error helper: Get error context
(define-read-only (get-error-context (error-id uint))
    (map-get? error-context { error-id: error-id })
)

;; Modifier to restrict access to admins only
(define-private (only-admin)
    (let ((is-admin (contains? (var-get admins) tx-sender)))
        (if is-admin
            (ok is-admin)
            (begin
                (record-error u401 (string-utf8 "Admin access required") (string-utf8 "only-admin") tx-sender)
                ERR-NOT-ADMIN
            )
        )
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
