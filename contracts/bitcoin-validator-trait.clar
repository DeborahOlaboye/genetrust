;; bitcoin-validator-trait.clar
;; Trait defining the interface for Bitcoin address and transaction validation.
;; All Bitcoin validator contracts must implement this trait.

(define-trait bitcoin-validator-trait
    (
        ;; Validate a P2WPKH (native segwit) address witness program
        ;; Returns ok true if valid 20-byte hash
        (validate-p2wpkh
            ((buff 20))           ;; witness-program (20-byte pubkey hash)
            (response bool uint))

        ;; Validate a P2WSH (native segwit script hash) witness program
        ;; Returns ok true if valid 32-byte script hash
        (validate-p2wsh
            ((buff 32))           ;; witness-program (32-byte script hash)
            (response bool uint))

        ;; Verify a secp256k1 Bitcoin signature over a message hash
        ;; Returns ok true if the signature is valid for the given pubkey
        (verify-bitcoin-signature
            ((buff 32)            ;; message-hash
             (buff 65)            ;; signature (DER encoded, up to 72 bytes, padded)
             (buff 33))           ;; compressed public key
            (response bool uint))

        ;; Validate a bitcoin-header-hash against a known block height
        ;; Returns ok true if the header hash matches on-chain data
        (validate-block-header
            (uint                 ;; block-height
             (buff 80))           ;; serialised block header
            (response bool uint))
    )
)
