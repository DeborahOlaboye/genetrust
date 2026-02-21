;; bitcoin-escrow.clar
;; Bitcoin-backed escrow for genetic data purchases.
;; Buyers lock a Bitcoin payment (verified via segwit-tx-parser), and the
;; seller receives confirmation + access is granted on the Stacks side.
;; Supports both standard P2WPKH purchases and M-of-N multisig institutional
;; purchases via the bitcoin-multisig contract.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u2300))
(define-constant ERR-ESCROW-NOT-FOUND (err u2301))
(define-constant ERR-ESCROW-EXISTS (err u2302))
(define-constant ERR-INVALID-STATE (err u2303))
(define-constant ERR-TX-NOT-VERIFIED (err u2304))
(define-constant ERR-TX-ALREADY-SPENT (err u2305))
(define-constant ERR-AMOUNT-INSUFFICIENT (err u2306))
(define-constant ERR-MULTISIG-REQUIRED (err u2307))
(define-constant ERR-MULTISIG-NOT-APPROVED (err u2308))
(define-constant ERR-ADDRESS-MISMATCH (err u2309))
(define-constant ERR-ESCROW-EXPIRED (err u2310))
(define-constant ERR-CHALLENGE-ACTIVE (err u2311))

;; Escrow status constants
(define-constant STATUS-AWAITING-BTC u0)     ;; Waiting for Bitcoin payment proof
(define-constant STATUS-BTC-CONFIRMED u1)    ;; Bitcoin payment confirmed on-chain
(define-constant STATUS-RELEASING u2)        ;; Access is being granted
(define-constant STATUS-COMPLETED u3)        ;; Access granted, escrow done
(define-constant STATUS-REFUNDED u4)         ;; Buyer refunded
(define-constant STATUS-DISPUTED u5)         ;; Under dispute

;; Challenge period before escrow can be finalised (~1 day)
(define-constant CHALLENGE-PERIOD-BLOCKS u144)

;; Multisig threshold for high-value purchases (in satoshis, ~0.01 BTC)
(define-constant MULTISIG-THRESHOLD-SATS u1000000)

;; Escrow expiry if BTC payment not received (~7 days)
(define-constant ESCROW-EXPIRY-BLOCKS u1008)

;; Admin / counters
(define-data-var escrow-admin principal tx-sender)
(define-data-var next-escrow-id uint u1)
(define-data-var platform-witness-program (buff 20) 0x0000000000000000000000000000000000000000)

;; Bitcoin escrows
(define-map btc-escrows
    { escrow-id: uint }
    {
        listing-id: uint,
        buyer: principal,
        seller: principal,
        amount-sats: uint,                    ;; Expected BTC amount in satoshis
        access-level: uint,
        btc-txid: (optional (buff 32)),       ;; Set when BTC payment proof submitted
        witness-program: (buff 20),           ;; Buyer's P2WPKH program (payment source)
        recipient-witness-program: (buff 20), ;; Platform's P2WPKH program (payment dest)
        requires-multisig: bool,
        multisig-policy-id: uint,             ;; 0 if no multisig required
        multisig-approval-id: uint,           ;; 0 until approval is created
        status: uint,
        created-at: uint,
        btc-confirmed-at: uint,
        completed-at: uint,
        challenge-deadline: uint
    }
)

;; Dispute records
(define-map disputes
    { escrow-id: uint }
    {
        raised-by: principal,
        reason: (string-utf8 256),
        evidence-txid: (optional (buff 32)),
        raised-at: uint,
        resolved: bool
    }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-escrow (escrow-id uint))
    (map-get? btc-escrows { escrow-id: escrow-id })
)

(define-read-only (get-dispute (escrow-id uint))
    (map-get? disputes { escrow-id: escrow-id })
)

(define-read-only (get-platform-witness-program)
    (var-get platform-witness-program)
)

;; ─── Escrow creation ─────────────────────────────────────────────────────────

(define-public (create-btc-escrow
    (listing-id uint)
    (amount-sats uint)
    (access-level uint)
    (buyer-witness-program (buff 20))
    (multisig-policy-id uint))

    (let (
        (escrow-id (var-get next-escrow-id))
        (needs-multisig (>= amount-sats MULTISIG-THRESHOLD-SATS))
    )
        (asserts! (> amount-sats u0) ERR-AMOUNT-INSUFFICIENT)

        ;; High-value purchases must specify a valid multisig policy
        (when needs-multisig
            (asserts! (> multisig-policy-id u0) ERR-MULTISIG-REQUIRED)
            (asserts! (is-some (contract-call? .bitcoin-multisig get-policy multisig-policy-id))
                ERR-MULTISIG-REQUIRED)
        )

        ;; Resolve listing seller from the exchange contract
        (let ((listing (unwrap! (contract-call? .exchange get-listing listing-id) ERR-ESCROW-NOT-FOUND)))
            (map-set btc-escrows { escrow-id: escrow-id }
                {
                    listing-id: listing-id,
                    buyer: tx-sender,
                    seller: (get owner listing),
                    amount-sats: amount-sats,
                    access-level: access-level,
                    btc-txid: none,
                    witness-program: buyer-witness-program,
                    recipient-witness-program: (var-get platform-witness-program),
                    requires-multisig: needs-multisig,
                    multisig-policy-id: multisig-policy-id,
                    multisig-approval-id: u0,
                    status: STATUS-AWAITING-BTC,
                    created-at: stacks-block-height,
                    btc-confirmed-at: u0,
                    completed-at: u0,
                    challenge-deadline: u0
                }
            )
            (var-set next-escrow-id (+ escrow-id u1))
            (ok escrow-id)
        )
    )
)

;; ─── Bitcoin payment confirmation ────────────────────────────────────────────

;; Submit the Bitcoin transaction ID to confirm payment
;; The tx must already be in segwit-tx-parser (submitted by a relayer)
(define-public (confirm-btc-payment
    (escrow-id uint)
    (btc-txid (buff 32))
    (current-burn-height uint))

    (let ((escrow (unwrap! (map-get? btc-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND)))
        (asserts! (is-eq (get status escrow) STATUS-AWAITING-BTC) ERR-INVALID-STATE)
        (asserts! (< stacks-block-height (+ (get created-at escrow) ESCROW-EXPIRY-BLOCKS))
            ERR-ESCROW-EXPIRED)

        ;; Verify tx is confirmed on Bitcoin chain
        (asserts!
            (contract-call? .segwit-tx-parser is-tx-spendable btc-txid current-burn-height)
            ERR-TX-NOT-VERIFIED)

        ;; Verify the tx output amount is sufficient
        (let ((btc-tx (unwrap! (contract-call? .segwit-tx-parser get-verified-tx btc-txid)
                ERR-TX-NOT-VERIFIED)))
            (asserts! (>= (get amount-sats btc-tx) (get amount-sats escrow)) ERR-AMOUNT-INSUFFICIENT)

            ;; If multisig required, check approval is in place
            (when (get requires-multisig escrow)
                (asserts! (> (get multisig-approval-id escrow) u0) ERR-MULTISIG-NOT-APPROVED)
                (asserts!
                    (contract-call? .bitcoin-multisig is-approval-valid (get multisig-approval-id escrow))
                    ERR-MULTISIG-NOT-APPROVED)
            )

            ;; Mark tx as spent
            (try! (contract-call? .segwit-tx-parser mark-tx-spent btc-txid
                (unwrap-panic (to-consensus-buff? escrow-id))))

            ;; Update escrow state
            (map-set btc-escrows { escrow-id: escrow-id }
                (merge escrow {
                    btc-txid: (some btc-txid),
                    status: STATUS-BTC-CONFIRMED,
                    btc-confirmed-at: stacks-block-height,
                    challenge-deadline: (+ stacks-block-height CHALLENGE-PERIOD-BLOCKS)
                })
            )
            (ok true)
        )
    )
)

;; ─── Multisig approval linking ───────────────────────────────────────────────

;; Attach a multisig approval request to an escrow
(define-public (attach-multisig-approval (escrow-id uint) (approval-id uint))
    (let ((escrow (unwrap! (map-get? btc-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get buyer escrow)) ERR-NOT-AUTHORIZED)
        (asserts! (get requires-multisig escrow) ERR-INVALID-STATE)
        (map-set btc-escrows { escrow-id: escrow-id }
            (merge escrow { multisig-approval-id: approval-id }))
        (ok true)
    )
)

;; ─── Release and completion ──────────────────────────────────────────────────

;; Finalise the escrow and grant dataset access after challenge period
(define-public (finalise-escrow (escrow-id uint))
    (let ((escrow (unwrap! (map-get? btc-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND)))
        (asserts! (is-eq (get status escrow) STATUS-BTC-CONFIRMED) ERR-INVALID-STATE)
        (asserts! (>= stacks-block-height (get challenge-deadline escrow)) ERR-CHALLENGE-ACTIVE)

        ;; Consume multisig approval if required
        (when (get requires-multisig escrow)
            (try! (contract-call? .bitcoin-multisig consume-approval (get multisig-approval-id escrow)))
        )

        ;; Grant access in the exchange / dataset-registry
        (try! (contract-call? .exchange grant-access
            (get listing-id escrow)
            (get buyer escrow)
            (get access-level escrow)))

        (map-set btc-escrows { escrow-id: escrow-id }
            (merge escrow { status: STATUS-COMPLETED, completed-at: stacks-block-height }))
        (ok true)
    )
)

;; ─── Dispute and refund ──────────────────────────────────────────────────────

(define-public (raise-dispute
    (escrow-id uint)
    (reason (string-utf8 256))
    (evidence-txid (optional (buff 32))))

    (let ((escrow (unwrap! (map-get? btc-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND)))
        (asserts!
            (or (is-eq tx-sender (get buyer escrow)) (is-eq tx-sender (get seller escrow)))
            ERR-NOT-AUTHORIZED)
        (asserts!
            (or (is-eq (get status escrow) STATUS-AWAITING-BTC)
                (is-eq (get status escrow) STATUS-BTC-CONFIRMED))
            ERR-INVALID-STATE)

        (map-set disputes { escrow-id: escrow-id }
            { raised-by: tx-sender, reason: reason, evidence-txid: evidence-txid,
              raised-at: stacks-block-height, resolved: false })
        (map-set btc-escrows { escrow-id: escrow-id }
            (merge escrow { status: STATUS-DISPUTED }))
        (ok true)
    )
)

;; Admin resolves a dispute
(define-public (resolve-dispute (escrow-id uint) (favour-buyer bool))
    (let ((escrow (unwrap! (map-get? btc-escrows { escrow-id: escrow-id }) ERR-ESCROW-NOT-FOUND)))
        (asserts! (is-eq tx-sender (var-get escrow-admin)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status escrow) STATUS-DISPUTED) ERR-INVALID-STATE)

        (match (map-get? disputes { escrow-id: escrow-id })
            d (map-set disputes { escrow-id: escrow-id } (merge d { resolved: true }))
            false
        )

        (if favour-buyer
            (map-set btc-escrows { escrow-id: escrow-id }
                (merge escrow { status: STATUS-REFUNDED }))
            (begin
                (try! (contract-call? .exchange grant-access
                    (get listing-id escrow) (get buyer escrow) (get access-level escrow)))
                (map-set btc-escrows { escrow-id: escrow-id }
                    (merge escrow { status: STATUS-COMPLETED, completed-at: stacks-block-height }))
            )
        )
        (ok true)
    )
)

;; Admin
(define-public (set-platform-witness-program (program (buff 20)))
    (begin
        (asserts! (is-eq tx-sender (var-get escrow-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set platform-witness-program program))
    )
)

(define-public (set-escrow-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get escrow-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set escrow-admin new-admin))
    )
)
