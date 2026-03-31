;; cross-subnet-bridge.clar
;; Main chain bridge contract implementing the subnet-bridge-trait.

(impl-trait .subnet-bridge-trait.subnet-bridge-trait)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-SUBNET-NOT-FOUND (err u301))
(define-constant ERR-SUBNET-INACTIVE (err u302))
(define-constant ERR-INVALID-PROOF (err u303))
(define-constant ERR-DUPLICATE-MESSAGE (err u304))
(define-constant ERR-INVALID-SIGNATURE (err u305))
(define-constant ERR-NONCE-MISMATCH (err u306))
(define-constant ERR-STATE-ROOT-NOT-FOUND (err u307))
(define-constant ERR-MESSAGE-NOT-FOUND (err u308))

;; Message status constants
(define-constant MSG-STATUS-PENDING u0)
(define-constant MSG-STATUS-DELIVERED u1)

;; Admin
(define-data-var bridge-admin principal tx-sender)
(define-data-var next-message-id uint u1)

;; Outbound messages (main chain → subnet)
(define-map outbound-messages
    { message-id: uint }
    {
        subnet-id: uint,
        sender: principal,
        message-hash: (buff 32),
        payload: (buff 512),
        nonce: uint,
        status: uint,
        created-at: uint
    }
)

;; Inbound messages (subnet → main chain)
(define-map inbound-messages
    { message-hash: (buff 32) }
    {
        subnet-id: uint,
        payload: (buff 512),
        nonce: uint,
        received-at: uint,
        relayer: principal
    }
)

;; Latest verified state roots per subnet
(define-map subnet-state-roots
    { subnet-id: uint }
    {
        state-root: (buff 32),
        block-height: uint,
        updated-at: uint
    }
)

;; Nonce tracking per subnet
(define-map subnet-nonces
    { subnet-id: uint }
    { inbound: uint, outbound: uint }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-outbound-message (message-id uint))
    (map-get? outbound-messages { message-id: message-id })
)

(define-read-only (get-inbound-message (message-hash (buff 32)))
    (map-get? inbound-messages { message-hash: message-hash })
)

(define-read-only (get-subnet-nonces (subnet-id uint))
    (default-to { inbound: u0, outbound: u0 }
        (map-get? subnet-nonces { subnet-id: subnet-id }))
)

;; ─── Trait implementation ────────────────────────────────────────────────────

(define-public (submit-to-subnet
    (subnet-id uint)
    (message-hash (buff 32))
    (payload (buff 512))
    (nonce uint))

    (let (
        (message-id (var-get next-message-id))
        (nonces (get-subnet-nonces subnet-id))
    )
        ;; Verify subnet is active via registry
        (asserts! (contract-call? .subnet-registry is-subnet-active subnet-id) ERR-SUBNET-INACTIVE)

        ;; Enforce strict outbound nonce ordering
        (asserts! (is-eq nonce (+ (get outbound nonces) u1)) ERR-NONCE-MISMATCH)

        (map-set outbound-messages
            { message-id: message-id }
            {
                subnet-id: subnet-id,
                sender: tx-sender,
                message-hash: message-hash,
                payload: payload,
                nonce: nonce,
                status: MSG-STATUS-PENDING,
                created-at: stacks-block-height
            }
        )

        (map-set subnet-nonces { subnet-id: subnet-id }
            (merge nonces { outbound: nonce }))

        (var-set next-message-id (+ message-id u1))
        (ok message-id)
    )
)

(define-public (receive-from-subnet
    (subnet-id uint)
    (message-hash (buff 32))
    (payload (buff 512))
    (signature (buff 80)) ;; Note: Should be verified against subnet validator pubkeys
    (nonce uint))

    (let ((nonces (get-subnet-nonces subnet-id)))
        (asserts!
            (contract-call? .subnet-registry is-authorized-relayer subnet-id tx-sender)
            ERR-NOT-AUTHORIZED)

        ;; Signature verification logic would go here (e.g., secp256k1-verify)
        ;; For now, we rely on the relayer authorization check.

        (asserts! (is-none (map-get? inbound-messages { message-hash: message-hash }))
            ERR-DUPLICATE-MESSAGE)

        (asserts! (is-eq nonce (+ (get inbound nonces) u1)) ERR-NONCE-MISMATCH)

        (map-set inbound-messages
            { message-hash: message-hash }
            {
                subnet-id: subnet-id,
                payload: payload,
                nonce: nonce,
                received-at: stacks-block-height,
                relayer: tx-sender
            }
        )

        (map-set subnet-nonces { subnet-id: subnet-id }
            (merge nonces { inbound: nonce }))

        (ok true)
    )
)

(define-public (verify-subnet-proof
    (subnet-id uint)
    (state-root (buff 32))
    (leaf (buff 32))
    (proof-path (list 20 (buff 32))))

    (let ((stored (unwrap! (map-get? subnet-state-roots { subnet-id: subnet-id }) ERR-STATE-ROOT-NOT-FOUND)))
        (asserts! (is-eq state-root (get state-root stored)) ERR-INVALID-PROOF)

        (let ((computed-root (fold merkle-combine proof-path leaf)))
            (asserts! (is-eq computed-root state-root) ERR-INVALID-PROOF)
            (ok true)
        )
    )
)

;; ─── State root management ───────────────────────────────────────────────────

(define-public (update-state-root
    (subnet-id uint)
    (new-state-root (buff 32))
    (subnet-block-height uint))

    (begin
        (asserts!
            (contract-call? .subnet-registry is-authorized-relayer subnet-id tx-sender)
            ERR-NOT-AUTHORIZED)

        (map-set subnet-state-roots { subnet-id: subnet-id }
            {
                state-root: new-state-root,
                block-height: subnet-block-height,
                updated-at: stacks-block-height
            }
        )
        (ok true)
    )
)

;; ─── Private helpers ─────────────────────────────────────────────────────────

(define-private (merkle-combine (sibling (buff 32)) (current (buff 32)))
    (if (< current sibling)
        (sha256 (concat current sibling))
        (sha256 (concat sibling current)))
)

(define-public (set-bridge-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get bridge-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set bridge-admin new-admin))
    )
)
