;; segwit-validator.clar
;; Implements Bitcoin native Segwit (P2WPKH / P2WSH) address validation
;; and secp256k1 signature verification using Stacks 2.1+ built-ins.
;;
;; Segwit v0 address types:
;;   P2WPKH  — pay-to-witness-pubkey-hash (20-byte witness program)
;;   P2WSH   — pay-to-witness-script-hash (32-byte witness program)

(impl-trait .bitcoin-validator-trait.bitcoin-validator-trait)

;; Error codes
(define-constant ERR-INVALID-WITNESS-PROGRAM (err u2000))
(define-constant ERR-INVALID-PUBKEY (err u2001))
(define-constant ERR-INVALID-SIGNATURE (err u2002))
(define-constant ERR-INVALID-HEADER (err u2003))
(define-constant ERR-INVALID-VERSION (err u2004))
(define-constant ERR-INVALID-ADDRESS-LENGTH (err u2005))

;; Segwit witness version byte for version 0
(define-constant WITNESS-VERSION-0 0x00)

;; P2WPKH witness program length (20 bytes = HASH160 of compressed pubkey)
(define-constant P2WPKH-PROGRAM-LEN u20)

;; P2WSH witness program length (32 bytes = SHA256 of redeem script)
(define-constant P2WSH-PROGRAM-LEN u32)

;; Bitcoin script opcodes used in segwit scriptPubKey
(define-constant OP-0 0x00)
(define-constant OP-PUSHBYTES-20 0x14)
(define-constant OP-PUSHBYTES-32 0x20)

;; ─── Trait implementation ────────────────────────────────────────────────────

;; Validate a P2WPKH witness program (20-byte pubkey hash)
;; A valid P2WPKH program is exactly 20 bytes (the HASH160 of a pubkey)
(define-public (validate-p2wpkh (witness-program (buff 20)))
    (begin
        (asserts! (is-eq (len witness-program) P2WPKH-PROGRAM-LEN) ERR-INVALID-ADDRESS-LENGTH)
        ;; All 20-byte buffers are structurally valid P2WPKH programs
        (ok true)
    )
)

;; Validate a P2WSH witness program (32-byte script hash)
;; A valid P2WSH program is exactly 32 bytes (SHA256 of the redeem script)
(define-public (validate-p2wsh (witness-program (buff 32)))
    (begin
        (asserts! (is-eq (len witness-program) P2WSH-PROGRAM-LEN) ERR-INVALID-ADDRESS-LENGTH)
        (ok true)
    )
)

;; Verify a secp256k1 Bitcoin signature using Stacks 2.1+ secp256k1-verify
(define-public (verify-bitcoin-signature
    (message-hash (buff 32))
    (signature (buff 65))
    (pubkey (buff 33)))

    (begin
        ;; Pubkey must be 33 bytes (compressed)
        (asserts! (is-eq (len pubkey) u33) ERR-INVALID-PUBKEY)
        ;; Message hash must be 32 bytes
        (asserts! (is-eq (len message-hash) u32) ERR-INVALID-SIGNATURE)

        ;; Use Stacks 2.1 secp256k1-verify built-in
        (if (secp256k1-verify message-hash signature pubkey)
            (ok true)
            ERR-INVALID-SIGNATURE
        )
    )
)

;; Validate a Bitcoin block header against the on-chain header hash
;; Uses Stacks 2.1+ get-burn-block-info? to fetch the header hash
(define-public (validate-block-header
    (block-height uint)
    (header (buff 80)))

    (begin
        (asserts! (is-eq (len header) u80) ERR-INVALID-HEADER)

        (match (get-burn-block-info? header-hash block-height)
            stored-hash
                (if (is-eq (sha256 (sha256 header)) stored-hash)
                    (ok true)
                    ERR-INVALID-HEADER)
            ERR-INVALID-HEADER
        )
    )
)

;; ─── Read-only helpers ───────────────────────────────────────────────────────

;; Build a P2WPKH scriptPubKey from a witness program
;; Format: OP_0 OP_PUSHBYTES_20 <20-byte-hash>
(define-read-only (build-p2wpkh-scriptpubkey (witness-program (buff 20)))
    (concat (concat OP-0 OP-PUSHBYTES-20) witness-program)
)

;; Build a P2WSH scriptPubKey from a witness program
;; Format: OP_0 OP_PUSHBYTES_32 <32-byte-hash>
(define-read-only (build-p2wsh-scriptpubkey (witness-program (buff 32)))
    (concat (concat OP-0 OP-PUSHBYTES-32) witness-program)
)

;; Derive the P2WPKH witness program from a compressed public key
;; witness-program = HASH160(pubkey) = RIPEMD160(SHA256(pubkey))
(define-read-only (pubkey-to-p2wpkh-program (pubkey (buff 33)))
    (hash160 pubkey)
)

;; Derive the P2WSH witness program from a redeem script
;; witness-program = SHA256(redeem-script)
(define-read-only (script-to-p2wsh-program (redeem-script (buff 520)))
    (sha256 redeem-script)
)

;; Check if a given scriptPubKey is a P2WPKH output
;; P2WPKH scriptPubKey is exactly 22 bytes: 0x0014<20-bytes>
(define-read-only (is-p2wpkh-output (script (buff 22)))
    (and
        (is-eq (len script) u22)
        (is-eq (unwrap-panic (element-at script u0)) 0x00)
        (is-eq (unwrap-panic (element-at script u1)) 0x14)
    )
)

;; Check if a given scriptPubKey is a P2WSH output
;; P2WSH scriptPubKey is exactly 34 bytes: 0x0020<32-bytes>
(define-read-only (is-p2wsh-output (script (buff 34)))
    (and
        (is-eq (len script) u34)
        (is-eq (unwrap-panic (element-at script u0)) 0x00)
        (is-eq (unwrap-panic (element-at script u1)) 0x20)
    )
)

;; Compute the Bitcoin double-SHA256 (hash256) of arbitrary data
(define-read-only (hash256 (data (buff 1024)))
    (sha256 (sha256 data))
)
