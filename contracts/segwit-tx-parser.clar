;; segwit-tx-parser.clar
;; Parses and validates Bitcoin Segwit (BIP-141) transaction proofs on-chain.
;; Stores verified transaction records that can be referenced by the Bitcoin
;; escrow contract to confirm payment.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u2100))
(define-constant ERR-TX-NOT-FOUND (err u2101))
(define-constant ERR-TX-EXISTS (err u2102))
(define-constant ERR-INVALID-TX (err u2103))
(define-constant ERR-INVALID-OUTPUT (err u2104))
(define-constant ERR-INVALID-PROOF (err u2105))
(define-constant ERR-OUTPUT-NOT-SEGWIT (err u2106))
(define-constant ERR-AMOUNT-MISMATCH (err u2107))
(define-constant ERR-ALREADY-SPENT (err u2108))

;; Output type constants
(define-constant OUTPUT-P2WPKH u1)
(define-constant OUTPUT-P2WSH u2)
(define-constant OUTPUT-P2TR u3)   ;; Taproot (future)
(define-constant OUTPUT-OTHER u99)

;; Confirmation depth required before a tx is considered final
(define-constant REQUIRED-CONFIRMATIONS u6)

;; Admin
(define-data-var parser-admin principal tx-sender)

;; Verified segwit transaction records
(define-map verified-txs
    { txid: (buff 32) }
    {
        txid: (buff 32),
        block-height: uint,          ;; Bitcoin block height
        block-header-hash: (buff 32),
        output-index: uint,
        output-type: uint,           ;; OUTPUT-P2WPKH | OUTPUT-P2WSH
        witness-program: (buff 32),  ;; 20 or 32-byte witness program (zero-padded to 32)
        amount-sats: uint,           ;; Satoshi value of the output
        recipient-hash: (buff 20),   ;; P2WPKH: pubkey hash; P2WSH: first 20 bytes of script hash
        confirmed-at: uint,          ;; Stacks block height when recorded
        is-spent: bool,
        spent-by: (optional (buff 32)) ;; Escrow ID that consumed this tx
    }
)

;; Index by recipient witness program for fast lookups
(define-map txs-by-recipient
    { witness-program: (buff 32) }
    { txids: (list 20 (buff 32)) }
)

;; Authorised relayers / parsers who can submit tx proofs
(define-map authorized-parsers
    { parser: principal }
    { active: bool }
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

(define-read-only (get-verified-tx (txid (buff 32)))
    (map-get? verified-txs { txid: txid })
)

(define-read-only (get-txs-for-recipient (witness-program (buff 32)))
    (map-get? txs-by-recipient { witness-program: witness-program })
)

(define-read-only (is-tx-confirmed (txid (buff 32)) (current-burn-height uint))
    (match (map-get? verified-txs { txid: txid })
        tx (>= (- current-burn-height (get block-height tx)) REQUIRED-CONFIRMATIONS)
        false
    )
)

(define-read-only (is-tx-spendable (txid (buff 32)) (current-burn-height uint))
    (match (map-get? verified-txs { txid: txid })
        tx (and
            (not (get is-spent tx))
            (>= (- current-burn-height (get block-height tx)) REQUIRED-CONFIRMATIONS))
        false
    )
)

(define-read-only (is-authorized-parser (parser principal))
    (match (map-get? authorized-parsers { parser: parser })
        p (get active p)
        false
    )
)

;; ─── Parser management ───────────────────────────────────────────────────────

(define-public (add-parser (parser principal))
    (begin
        (asserts! (is-eq tx-sender (var-get parser-admin)) ERR-NOT-AUTHORIZED)
        (map-set authorized-parsers { parser: parser } { active: true })
        (ok true)
    )
)

(define-public (remove-parser (parser principal))
    (begin
        (asserts! (is-eq tx-sender (var-get parser-admin)) ERR-NOT-AUTHORIZED)
        (map-set authorized-parsers { parser: parser } { active: false })
        (ok true)
    )
)

;; ─── Transaction submission ──────────────────────────────────────────────────

;; Submit a verified segwit transaction proof
;; The parser (relayer) is responsible for verifying the Merkle inclusion proof
;; off-chain before calling this function with the confirmed data.
(define-public (submit-verified-tx
    (txid (buff 32))
    (block-height uint)
    (block-header-hash (buff 32))
    (output-index uint)
    (output-type uint)
    (witness-program (buff 32))
    (amount-sats uint)
    (recipient-hash (buff 20)))

    (begin
        (asserts! (is-authorized-parser tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (map-get? verified-txs { txid: txid })) ERR-TX-EXISTS)
        (asserts! (> amount-sats u0) ERR-INVALID-TX)
        (asserts! (or (is-eq output-type OUTPUT-P2WPKH) (is-eq output-type OUTPUT-P2WSH))
            ERR-OUTPUT-NOT-SEGWIT)

        ;; Validate block header hash against burn chain
        (match (get-burn-block-info? header-hash block-height)
            stored-hash
                (asserts! (is-eq stored-hash block-header-hash) ERR-INVALID-PROOF)
            (asserts! false ERR-INVALID-PROOF)
        )

        ;; Store transaction record
        (map-set verified-txs { txid: txid }
            {
                txid: txid,
                block-height: block-height,
                block-header-hash: block-header-hash,
                output-index: output-index,
                output-type: output-type,
                witness-program: witness-program,
                amount-sats: amount-sats,
                recipient-hash: recipient-hash,
                confirmed-at: stacks-block-height,
                is-spent: false,
                spent-by: none
            }
        )

        ;; Update recipient index
        (let ((existing (default-to { txids: (list) }
                (map-get? txs-by-recipient { witness-program: witness-program }))))
            (map-set txs-by-recipient { witness-program: witness-program }
                { txids: (unwrap-panic (as-max-len? (append (get txids existing) txid) u20)) })
        )

        (ok true)
    )
)

;; Mark a transaction output as spent by an escrow
(define-public (mark-tx-spent (txid (buff 32)) (escrow-id (buff 32)))
    (let ((tx (unwrap! (map-get? verified-txs { txid: txid }) ERR-TX-NOT-FOUND)))
        (asserts! (is-authorized-parser tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (not (get is-spent tx)) ERR-ALREADY-SPENT)
        (map-set verified-txs { txid: txid }
            (merge tx { is-spent: true, spent-by: (some escrow-id) }))
        (ok true)
    )
)

;; Admin
(define-public (set-parser-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender (var-get parser-admin)) ERR-NOT-AUTHORIZED)
        (ok (var-set parser-admin new-admin))
    )
)
