;; segwit-validator.clar
;; Implements Bitcoin native Segwit (P2WPKH / P2WSH) address validation
;; Optimized for Clarity 2.x

(impl-trait .bitcoin-validator-trait.bitcoin-validator-trait)

;; Error codes
(define-constant ERR-INVALID-WITNESS-PROGRAM (err u2000))
(define-constant ERR-INVALID-PUBKEY (err u2001))
(define-constant ERR-INVALID-SIGNATURE (err u2002))
(define-constant ERR-INVALID-HEADER (err u2003))
(define-constant ERR-INVALID-VERSION (err u2004))
(define-constant ERR-INVALID-ADDRESS-LENGTH (err u2005))

;; Constants
(define-constant WITNESS-VERSION-0 0x00)
(define-constant P2WPKH-PROGRAM-LEN u20)
(define-constant P2WSH-PROGRAM-LEN u32)
(define-constant OP-0 0x00)
(define-constant OP-PUSHBYTES-20 0x14)
(define-constant OP-PUSHBYTES-32 0x20)

;; --- Trait implementation ---

(define-public (validate-p2wpkh (witness-program (buff 20)))
    (begin
        (asserts! (is-eq (len witness-program) P2WPKH-PROGRAM-LEN) ERR-INVALID-ADDRESS-LENGTH)
        (ok true)
    )
)

(define-public (validate-p2wsh (witness-program (buff 32)))
    (begin
        (asserts! (is-eq (len witness-program) P2WSH-PROGRAM-LEN) ERR-INVALID-ADDRESS-LENGTH)
        (ok true)
    )
)

(define-public (verify-bitcoin-signature
    (message-hash (buff 32))
    (signature (buff 65))
    (pubkey (buff 33)))

    (begin
        (asserts! (is-eq (len pubkey) u33) ERR-INVALID-PUBKEY)
        (asserts! (is-eq (len message-hash) u32) ERR-INVALID-SIGNATURE)

        (if (secp256k1-verify message-hash signature pubkey)
            (ok true)
            ERR-INVALID-SIGNATURE
        )
    )
)

(define-public (validate-block-header
    (block-height uint)
    (header (buff 80)))

    (begin
        (asserts! (is-eq (len header) u80) ERR-INVALID-HEADER)
        (let ((stored-hash (unwrap! (get-burn-block-info? header-hash block-height) ERR-INVALID-HEADER)))
            (if (is-eq (sha256 (sha256 header)) stored-hash)
                (ok true)
                ERR-INVALID-HEADER
            )
        )
    )
)

;; --- Read-only helpers ---

(define-read-only (build-p2wpkh-scriptpubkey (witness-program (buff 20)))
    (concat 0x0014 witness-program)
)

(define-read-only (build-p2wsh-scriptpubkey (witness-program (buff 32)))
    (concat 0x0020 witness-program)
)

(define-read-only (pubkey-to-p2wpkh-program (pubkey (buff 33)))
    (hash160 pubkey)
)

(define-read-only (script-to-p2wsh-program (redeem-script (buff 520)))
    (sha256 redeem-script)
)

(define-read-only (is-p2wpkh-output (script (buff 22)))
    (is-eq script (concat 0x0014 (unwrap-panic (as-max-len? (unwrap-panic (slice? script u2 u22)) u20))))
)

(define-read-only (is-p2wsh-output (script (buff 34)))
    (is-eq script (concat 0x0020 (unwrap-panic (as-max-len? (unwrap-panic (slice? script u2 u34)) u32))))
)

(define-read-only (hash256 (data (buff 1024)))
    (sha256 (sha256 data))
)
