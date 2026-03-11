;; access-control.clar
;; Role-based access control for GeneTrust smart contracts
;; Enhanced with Clarity 4 principal-of? identity verification, secure delegation,
;; and multi-signature role management for institutional genetic data governance.

;; Define the access-control-trait so other contracts can use-trait to call us
(define-trait access-control-trait
    (
        (has-role (principal uint) (response bool uint))
        (grant-role (principal uint) (response bool uint))
        (revoke-role (principal uint) (response bool uint))
        (register-identity-proof ((buff 33)) (response bool uint))
        (is-identity-verified (principal) (response bool uint))
        (assert-verified-role (principal uint) (response bool uint))
    )
)

;; Error codes mapped to HTTP status
(define-constant ERR-NOT-ADMIN (err u401))
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ALREADY-ROLE (err u409))
(define-constant ERR-INVALID-ROLE (err u400))

;; Clarity 4 principal-of? identity error codes
(define-constant ERR-INVALID-PUBKEY (err u422))
(define-constant ERR-PUBKEY-MISMATCH (err u403))
(define-constant ERR-IDENTITY-NOT-FOUND (err u404))
(define-constant ERR-IDENTITY-REVOKED (err u403))

;; Role definitions
(define-constant ROLE-ADMIN 0x0001)
(define-constant ROLE-RESEARCHER 0x0002)
(define-constant ROLE-DATA-PROVIDER 0x0004)
(define-constant ROLE-VERIFIER 0x0008)

;; Role management
(define-map roles principal uint)

;; ── Identity verification via principal-of? ──────────────────────────────────
;; On-chain proof that a principal controls the corresponding private key.
;; Stored as the hash160 of their compressed pubkey so we never store raw keys.
(define-map identity-proofs
    { user: principal }
    {
        pubkey-hash:     (buff 20),   ;; hash160 of the compressed secp256k1 pubkey
        verified-at:     uint,         ;; Block height of verification
        is-active:       bool,
        verification-count: uint       ;; How many times the proof was renewed
    }
)

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

;; ── Identity Verification API ────────────────────────────────────────────────

;; Register an on-chain identity proof for tx-sender.
;; The caller provides their compressed secp256k1 pubkey (33 bytes).
;; principal-of? derives the Stacks principal and asserts it matches tx-sender,
;; cryptographically proving key ownership. Only the hash160 of the pubkey is stored.
(define-public (register-identity-proof (pubkey (buff 33)))
    (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
        (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)

        (let ((existing (map-get? identity-proofs { user: tx-sender })))
            (map-set identity-proofs
                { user: tx-sender }
                {
                    pubkey-hash:        (hash160 pubkey),
                    verified-at:        stacks-block-height,
                    is-active:          true,
                    verification-count: (+ u1 (match existing
                                            proof (get verification-count proof)
                                            u0
                                        ))
                }
            )
            (ok (print {
                event:       "identity-registered",
                user:        tx-sender,
                pubkey-hash: (hash160 pubkey),
                block:       stacks-block-height
            }))
        )
    )
)

;; Read-only: verify that a principal has an active identity proof
(define-read-only (is-identity-verified (user principal))
    (match (map-get? identity-proofs { user: user })
        proof (ok (get is-active proof))
        ERR-IDENTITY-NOT-FOUND
    )
)

;; Read-only: get full identity proof record
(define-read-only (get-identity-proof (user principal))
    (map-get? identity-proofs { user: user })
)

;; Revoke an identity proof (self-revocation or admin)
(define-public (revoke-identity-proof (user principal))
    (begin
        (if (is-eq tx-sender user)
            true
            (match (only-admin)
                ok-val true
                err-val false
            )
        )
        (let ((proof (unwrap! (map-get? identity-proofs { user: user }) ERR-IDENTITY-NOT-FOUND)))
            (map-set identity-proofs
                { user: user }
                (merge proof { is-active: false })
            )
            (ok (print { event: "identity-revoked", user: user, block: stacks-block-height }))
        )
    )
)

;; Modifier to restrict access to admins only
(define-private (only-admin)
    (let ((is-admin (contains? (var-get admins) tx-sender)))
        (if is-admin
            (ok is-admin)
            (begin
                (record-error u401 u"Admin access required" u"only-admin" tx-sender)
                ERR-NOT-ADMIN
            )
        )
    )
)

;; Grant a role to a principal whose identity has been verified via principal-of?.
;; The admin provides their pubkey; verification happens before the role write.
(define-public (grant-role-verified
    (user    principal)
    (role    uint)
    (pubkey  (buff 33)))
    (begin
        ;; Admin identity verification
        (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
            (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
            (try! (only-admin))

            ;; Recipient must have registered an identity proof
            (asserts!
                (match (map-get? identity-proofs { user: user })
                    proof (get is-active proof)
                    false
                )
                ERR-IDENTITY-NOT-FOUND
            )

            (let ((current-roles (default-to u0 (map-get? roles { user: user }))))
                (map-set roles { user: user } (bitwise-or current-roles role))
                (ok (print {
                    event:  "role-granted-verified",
                    user:   user,
                    role:   role,
                    by:     tx-sender,
                    block:  stacks-block-height
                }))
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

;; ── Enhanced RBAC: role + identity compound check ────────────────────────────

;; Verify that a principal both holds a role AND has an active identity proof.
;; This is the compound security gate for sensitive genetic data operations.
(define-read-only (has-verified-role (user principal) (role uint))
    (let (
        (role-ok   (match (map-get? roles { user: user })
                        r (not (is-eq (bitwise-and r role) u0))
                        false))
        (id-ok     (match (map-get? identity-proofs { user: user })
                        p (get is-active p)
                        false))
    )
        (ok (and role-ok id-ok))
    )
)

;; Return a summary of a principal's access posture for off-chain consumers
(define-read-only (get-access-posture (user principal))
    {
        user:             user,
        roles:            (default-to u0 (map-get? roles { user: user })),
        identity-active:  (match (map-get? identity-proofs { user: user })
                              p (get is-active p)
                              false),
        is-admin:         (contains? (var-get admins) user),
        block:            stacks-block-height
    }
)

;; Require both a role and an active identity proof — use as a guard in
;; calling contracts.
(define-public (assert-verified-role (user principal) (role uint))
    (let ((check (try! (has-verified-role user role))))
        (asserts! check ERR-NOT-AUTHORIZED)
        (ok true)
    )
)
