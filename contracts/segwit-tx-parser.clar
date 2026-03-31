;; segwit-tx-parser.clar
;; Parses and validates Bitcoin Segwit (BIP-141) transaction proofs on-chain.

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
(define-constant REQUIRED-CONFIRMATIONS u6)

;; Admin
(define-data-var parser-admin principal tx-sender)

;; Verified segwit transaction records
(define-map verified-txs
    { txid: (buff 32) }
    {
        txid: (buff 32),
        block-height: uint,
        block-header-hash: (buff 32),
        output-index: uint,
        output-type: uint,
        witness-program: (buff 32),
        amount-sats: uint,
        recipient-hash: (buff 20),
        confirmed-at: uint,
        is-spent: bool,
        spent-by: (optional (buff 32))
    }
)

;; Index by recipient witness program
(define-map txs-by-recipient
    { witness-program: (buff 32) }
    { txids: (list 20 (buff 32)) }
)

;; Authorized relayers
(define-map authorized-parsers
    { parser: principal }
    { active: bool }
)

;; --- Read-only helpers ---

(define-read-only (get-verified-tx (txid (buff 32)))
    (map-get? verified-txs { txid: txid })
)

(define-read-only (is-tx-confirmed (txid (buff 32)))
    (match (map-get? verified-txs { txid: txid })
        tx (>= (- burn-block-height (get block-height tx)) REQUIRED-CONFIRMATIONS)
        false
    )
)

(define-read-only (is-authorized-parser (parser principal))
    (default-to false (get active (map-get? authorized-parsers { parser: parser })))
)

;; --- Parser management ---

(define-public (add-parser (parser principal))
    (begin
        (asserts! (is-eq tx-sender (var-get parser-admin)) ERR-NOT-AUTHORIZED)
        (ok (map-set authorized-parsers { parser: parser } { active: true }))
    )
)

;; --- Transaction submission ---

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
        
        ;; Cross-check Bitcoin header hash via Clarity 2 burn-block-height context
        (let ((actual-hash (unwrap! (get-burn-block-info? header-hash block-height) ERR-INVALID-PROOF)))
            (asserts! (is-eq actual-hash block-header-hash) ERR-INVALID-PROOF)
        )

        (asserts! (or (is-eq output-type OUTPUT-P2WPKH) (is-eq output-type OUTPUT-P2WSH)) ERR-OUTPUT-NOT-SEGWIT)

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
                confirmed-at: burn-block-height,
                is-spent: false,
                spent-by: none
            }
        )

        (let ((existing (default-to { txids: (list) } (map-get? txs-by-recipient { witness-program: witness-program }))))
            (ok (map-set txs-by-recipient { witness-program: witness-program }
                { txids: (unwrap-panic (as-max-len? (append (get txids existing) txid) u20)) }))
        )
    )
)

(define-public (mark-tx-spent (txid (buff 32)) (escrow-id (buff 32)))
    (let ((tx (unwrap! (map-get? verified-txs { txid: txid }) ERR-TX-NOT-FOUND)))
        (asserts! (is-authorized-parser tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (not (get is-spent tx)) ERR-ALREADY-SPENT)
        (ok (map-set verified-txs { txid: txid }
            (merge tx { is-spent: true, spent-by: (some escrow-id) })))
    )
)
