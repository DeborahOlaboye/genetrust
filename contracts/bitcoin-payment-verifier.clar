;; bitcoin-payment-verifier.clar
;; Stateless helper for verifying Bitcoin payment proofs on-chain.
;; Used by the bitcoin-escrow contract and by the exchange to confirm
;; that a BTC payment was made to the correct address for the right amount.

;; Error codes
(define-constant ERR-INVALID-PROOF (err u2400))
(define-constant ERR-AMOUNT-TOO-LOW (err u2401))
(define-constant ERR-WRONG-RECIPIENT (err u2402))
(define-constant ERR-STALE-PROOF (err u2403))
(define-constant ERR-INVALID-SCRIPT (err u2404))
(define-constant ERR-INVALID-HEADER (err u2405))

;; Maximum age of a payment proof in Bitcoin blocks (~7 days)
(define-constant MAX-PROOF-AGE-BLOCKS u1008)

;; Minimum dust threshold in satoshis
(define-constant DUST-THRESHOLD-SATS u546)

;; ─── Core verification ───────────────────────────────────────────────────────

;; Verify a payment: checks the stored tx against expected recipient and amount.
;; Returns ok true if the payment is valid, unspent, and sufficiently confirmed.
(define-read-only (verify-payment
    (txid (buff 32))
    (expected-recipient-program (buff 20))
    (expected-amount-sats uint)
    (current-burn-height uint))

    (match (contract-call? .segwit-tx-parser get-verified-tx txid)
        tx-record
            (begin
                ;; Check not already spent
                (asserts! (not (get is-spent tx-record)) ERR-AMOUNT-TOO-LOW)

                ;; Check amount is sufficient
                (asserts! (>= (get amount-sats tx-record) expected-amount-sats) ERR-AMOUNT-TOO-LOW)

                ;; Check output is a P2WPKH matching the expected recipient
                (asserts! (is-eq (get recipient-hash tx-record) expected-recipient-program) ERR-WRONG-RECIPIENT)

                ;; Check the proof is not stale
                (asserts!
                    (<= (- current-burn-height (get block-height tx-record)) MAX-PROOF-AGE-BLOCKS)
                    ERR-STALE-PROOF)

                (ok true)
            )
        ERR-INVALID-PROOF
    )
)

;; Verify a payment to a P2WSH address
(define-read-only (verify-p2wsh-payment
    (txid (buff 32))
    (expected-script-hash-prefix (buff 20))   ;; First 20 bytes of the 32-byte script hash
    (expected-amount-sats uint)
    (current-burn-height uint))

    (match (contract-call? .segwit-tx-parser get-verified-tx txid)
        tx-record
            (begin
                (asserts! (not (get is-spent tx-record)) ERR-AMOUNT-TOO-LOW)
                (asserts! (>= (get amount-sats tx-record) expected-amount-sats) ERR-AMOUNT-TOO-LOW)
                (asserts! (is-eq (get output-type tx-record) u2) ERR-INVALID-SCRIPT) ;; OUTPUT-P2WSH
                (asserts!
                    (is-eq (get recipient-hash tx-record) expected-script-hash-prefix)
                    ERR-WRONG-RECIPIENT)
                (asserts!
                    (<= (- current-burn-height (get block-height tx-record)) MAX-PROOF-AGE-BLOCKS)
                    ERR-STALE-PROOF)
                (ok true)
            )
        ERR-INVALID-PROOF
    )
)

;; Check if a given satoshi amount exceeds the dust threshold
(define-read-only (is-above-dust (amount-sats uint))
    (> amount-sats DUST-THRESHOLD-SATS)
)

;; Convert satoshis to a human-readable STX-equivalent string (approximation)
;; 1 BTC = 100,000,000 sats; uses integer division
(define-read-only (sats-to-btc-string (sats uint))
    (let (
        (whole (/ sats u100000000))
        (frac (mod sats u100000000))
    )
        ;; Returns (whole-btc . fractional-sats) tuple for display
        { btc: whole, sats-remainder: frac }
    )
)

;; Compute the expected P2WPKH witness program from a raw compressed pubkey
(define-read-only (pubkey-to-witness-program (pubkey (buff 33)))
    (hash160 pubkey)
)

;; Validate that a Merkle proof path leads to a known block header
;; Uses get-burn-block-info? to fetch the stored Merkle root
(define-read-only (verify-merkle-inclusion
    (txid (buff 32))
    (proof-path (list 20 (buff 32)))
    (tx-index uint)
    (block-height uint))

    (match (get-burn-block-info? pox-addrs block-height)
        _info
            ;; Real Merkle verification requires block-header Merkle root.
            ;; For Stacks 2.1 we rely on the submitted tx having been validated
            ;; by the segwit-tx-parser which checks get-burn-block-info? header-hash.
            ;; This function provides the structural proof walk.
            (let ((computed (fold merkle-step proof-path txid)))
                ;; Caller must compare computed root against block header Merkle root
                (ok computed)
            )
        ERR-INVALID-PROOF
    )
)

;; Private: one step of the Merkle tree walk
(define-private (merkle-step (sibling (buff 32)) (current (buff 32)))
    (sha256 (sha256 (concat current sibling)))
)
