;; bitcoin-multisig.clar
;; Multi-signature support for institutional Bitcoin purchases.
;; Implements M-of-N threshold signing using secp256k1-verify (Stacks 2.1+).
;; A multisig policy is created with N public keys; M valid signatures are
;; required to authorise a high-value genetic data purchase.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u2200))
(define-constant ERR-POLICY-NOT-FOUND (err u2201))
(define-constant ERR-POLICY-EXISTS (err u2202))
(define-constant ERR-ALREADY-SIGNED (err u2203))
(define-constant ERR-INVALID-SIGNATURE (err u2204))
(define-constant ERR-THRESHOLD-NOT-MET (err u2205))
(define-constant ERR-INVALID-THRESHOLD (err u2206))
(define-constant ERR-TOO-MANY-KEYS (err u2207))
(define-constant ERR-APPROVAL-EXPIRED (err u2208))
(define-constant ERR-APPROVAL-NOT-FOUND (err u2209))
(define-constant ERR-APPROVAL-ALREADY-USED (err u2210))

;; Limits
(define-constant MAX-SIGNERS u15)
(define-constant APPROVAL-EXPIRY-BLOCKS u144) ;; ~1 day

;; Admin
(define-data-var multisig-admin principal tx-sender)
(define-data-var next-policy-id uint u1)
(define-data-var next-approval-id uint u1)

;; Multisig policies (M-of-N)
(define-map multisig-policies
    { policy-id: uint }
    {
        name: (string-utf8 64),
        threshold: uint,                    ;; M — minimum signatures required
        total-signers: uint,                ;; N — total signers
        pubkeys: (list 15 (buff 33)),       ;; Compressed public keys of all signers
        owner: principal,                   ;; Who created this policy
        is-active: bool,
        created-at: uint,
        min-amount-sats: uint               ;; Minimum BTC amount requiring multisig
    }
)

;; Per-purchase multisig approval requests
(define-map approval-requests
    { approval-id: uint }
    {
        policy-id: uint,
        listing-id: uint,
        buyer: principal,
        amount-sats: uint,
        message-hash: (buff 32),          ;; Hash of (listing-id + buyer + amount-sats)
        signatures: (list 15 (buff 65)),  ;; Collected valid signatures
        signers: (list 15 (buff 33)),     ;; Collected pubkeys to prevent duplicate signing
        signature-count: uint,
        is-approved: bool,
        is-used: bool,
        created-at: uint,
        expires-at: uint
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-policy (policy-id uint))
    (map-get? multisig-policies { policy-id: policy-id })
)

(define-read-only (get-approval (approval-id uint))
    (map-get? approval-requests { approval-id: approval-id })
)

(define-read-only (is-approval-valid (approval-id uint))
    (match (map-get? approval-requests { approval-id: approval-id })
        a (and
            (get is-approved a)
            (not (get is-used a))
            (< stacks-block-height (get expires-at a)))
        false
    )
)

;; ─── Policy management ───────────────────────────────────────────────────────

(define-public (create-policy
    (name (string-utf8 64))
    (threshold uint)
    (pubkeys (list 15 (buff 33)))
    (min-amount-sats uint))

    (let ((n (len pubkeys)))
        (asserts! (> n u0) ERR-INVALID-THRESHOLD)
        (asserts! (<= n MAX-SIGNERS) ERR-TOO-MANY-KEYS)
        (asserts! (and (>= threshold u1) (<= threshold n)) ERR-INVALID-THRESHOLD)

        (let ((policy-id (var-get next-policy-id)))
            (map-set multisig-policies { policy-id: policy-id }
                {
                    name: name,
                    threshold: threshold,
                    total-signers: n,
                    pubkeys: pubkeys,
                    owner: tx-sender,
                    is-active: true,
                    created-at: stacks-block-height,
                    min-amount-sats: min-amount-sats
                }
            )
            (var-set next-policy-id (+ policy-id u1))
            (ok policy-id)
        )
    )
)

(define-public (deactivate-policy (policy-id uint))
    (let ((p (unwrap! (map-get? multisig-policies { policy-id: policy-id }) ERR-POLICY-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (get owner p)) (is-eq tx-sender (var-get multisig-admin)))
            ERR-NOT-AUTHORIZED)
        (map-set multisig-policies { policy-id: policy-id }
            (merge p { is-active: false }))
        (ok true)
    )
)

;; ─── Approval request lifecycle ──────────────────────────────────────────────

;; Buyer creates an approval request for a purchase
(define-public (create-approval-request
    (policy-id uint)
    (listing-id uint)
    (amount-sats uint))

    (let ((p (unwrap! (map-get? multisig-policies { policy-id: policy-id }) ERR-POLICY-NOT-FOUND)))
        (asserts! (get is-active p) ERR-POLICY-NOT-FOUND)

        ;; Compute the message hash: sha256(listing-id || buyer || amount-sats)
        (let (
            (msg-hash (sha256 (concat
                (concat (unwrap-panic (to-consensus-buff? listing-id))
                        (unwrap-panic (to-consensus-buff? tx-sender)))
                (unwrap-panic (to-consensus-buff? amount-sats)))))
            (approval-id (var-get next-approval-id))
        )
            (map-set approval-requests { approval-id: approval-id }
                {
                    policy-id: policy-id,
                    listing-id: listing-id,
                    buyer: tx-sender,
                    amount-sats: amount-sats,
                    message-hash: msg-hash,
                    signatures: (list),
                    signers: (list),
                    signature-count: u0,
                    is-approved: false,
                    is-used: false,
                    created-at: stacks-block-height,
                    expires-at: (+ stacks-block-height APPROVAL-EXPIRY-BLOCKS)
                }
            )
            (var-set next-approval-id (+ approval-id u1))
            (ok approval-id)
        )
    )
)

;; Submit a signature for an approval request
;; The caller provides their signature over the stored message hash.
(define-public (submit-signature
    (approval-id uint)
    (signature (buff 65))
    (pubkey (buff 33)))

    (let (
        (req (unwrap! (map-get? approval-requests { approval-id: approval-id }) ERR-APPROVAL-NOT-FOUND))
        (policy (unwrap! (map-get? multisig-policies { policy-id: (get policy-id req) }) ERR-POLICY-NOT-FOUND))
    )
        ;; Validations
        (asserts! (not (get is-used req)) ERR-APPROVAL-ALREADY-USED)
        (asserts! (< stacks-block-height (get expires-at req)) ERR-APPROVAL-EXPIRED)
        
        ;; Verify pubkey is authorized in the policy
        (asserts! (is-some (index-of (get pubkeys policy) pubkey)) ERR-NOT-AUTHORIZED)
        
        ;; Prevent same key signing twice
        (asserts! (is-none (index-of (get signers req) pubkey)) ERR-ALREADY-SIGNED)

        ;; Verify the signature: secp256k1-verify returns true/false
        (asserts! (secp256k1-verify (get message-hash req) signature pubkey) ERR-INVALID-SIGNATURE)

        (let (
            (new-sigs (unwrap-panic (as-max-len? (append (get signatures req) signature) u15)))
            (new-signers (unwrap-panic (as-max-len? (append (get signers req) pubkey) u15)))
            (new-count (+ (get signature-count req) u1))
            (now-approved (>= new-count (get threshold policy)))
        )
            (map-set approval-requests { approval-id: approval-id }
                (merge req {
                    signatures: new-sigs,
                    signers: new-signers,
                    signature-count: new-count,
                    is-approved: now-approved
                })
            )
            (ok now-approved)
        )
    )
)

;; Mark an approval as used (called by bitcoin-escrow on purchase)
(define-public (consume-approval (approval-id uint))
    (let ((req (unwrap! (map-get? approval-requests { approval-id: approval-id }) ERR-APPROVAL-NOT-FOUND)))
        (asserts! (get is-approved req) ERR-THRESHOLD-NOT-MET)
        (asserts! (not (get is-used req)) ERR-APPROVAL-ALREADY-USED)
        (asserts! (< stacks-block-height (get expires-at req)) ERR-APPROVAL-EXPIRED)
        (map-set approval-requests { approval-id: approval-id }
            (merge req { is-used: true }))
        (ok true)
    )
)

;; Admin
(define-public (set-multisig-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get multisig-admin)) ERR-NOT-AUTHORIZED)
        (var-set multisig-admin new-admin)
        (ok true)
    )
)
