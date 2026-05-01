;; validation-utils.clar
;; @title Reusable Validation Functions for GeneTrust Contracts
;; @version 1.2.0
;; @author GeneTrust
;; @notice Comprehensive validation utility library with standardized error codes,
;;         validation functions, and composite validators for all contract inputs.
;; @dev This module provides a centralized location for all validation logic,
;;      ensuring consistency and maintainability across GeneTrust contracts.

;; Error codes for validation
(define-constant ERR-INVALID-AMOUNT (err u401))
(define-constant ERR-INVALID-ADDRESS (err u402))
(define-constant ERR-INVALID-HASH (err u403))
(define-constant ERR-INVALID-STRING-LENGTH (err u407))
(define-constant ERR-INVALID-BUFFER-SIZE (err u408))
(define-constant ERR-INVALID-UINT-BOUNDS (err u400))
(define-constant ERR-ZERO-VALUE (err u401))
(define-constant ERR-NEGATIVE-VALUE (err u401))

;; Validation constants
(define-constant MIN-DESCRIPTION-LENGTH u10)
(define-constant MAX-DESCRIPTION-LENGTH u200)
(define-constant MIN-NAME-LENGTH u1)
(define-constant MAX-NAME-LENGTH u64)
(define-constant MIN-URL-LENGTH u5)
(define-constant MAX-URL-LENGTH u200)
(define-constant HASH-LENGTH u32)
(define-constant MIN-PRICE u1)
(define-constant MAX-PRICE u340282366920938463463374607431768211455) ;; u128 max

;; Validate non-zero uint amount
(define-read-only (validate-amount (amount uint))
    (ok (> amount u0))
)

;; Validate string length is within bounds
(define-read-only (validate-string-length (s (string-utf8 400)) (min-len uint) (max-len uint))
    (let ((len (len s)))
        (if (and (>= len min-len) (<= len max-len))
            (ok true)
            (err ERR-INVALID-STRING-LENGTH)
        )
    )
)

;; Validate description length (10-200 chars)
(define-read-only (validate-description (description (string-utf8 200)))
    (let ((len (len description)))
        (if (and (>= len MIN-DESCRIPTION-LENGTH) (<= len MAX-DESCRIPTION-LENGTH))
            (ok true)
            (err ERR-INVALID-STRING-LENGTH)
        )
    )
)

;; Validate name length (1-64 chars)
(define-read-only (validate-name (name (string-utf8 64)))
    (let ((len (len name)))
        (if (and (>= len MIN-NAME-LENGTH) (<= len MAX-NAME-LENGTH))
            (ok true)
            (err ERR-INVALID-STRING-LENGTH)
        )
    )
)

;; Validate storage URL (5-200 chars)
(define-read-only (validate-storage-url (url (string-utf8 200)))
    (let ((len (len url)))
        (if (and (>= len MIN-URL-LENGTH) (<= len MAX-URL-LENGTH))
            (ok true)
            (err ERR-INVALID-STRING-LENGTH)
        )
    )
)

;; Validate hash is exactly 32 bytes
(define-read-only (validate-hash (hash (buff 32)))
    (if (is-eq (len hash) HASH-LENGTH)
        (ok true)
        (err ERR-INVALID-HASH)
    )
)

;; Validate price is within acceptable range
(define-read-only (validate-price (price uint))
    (if (and (>= price MIN-PRICE) (<= price MAX-PRICE))
        (ok true)
        (err ERR-INVALID-AMOUNT)
    )
)

;; Validate access level (1=basic, 2=detailed, 3=full)
(define-read-only (validate-access-level (level uint))
    (if (and (>= level u1) (<= level u3))
        (ok true)
        (err u406) ;; ERR-INVALID-ACCESS-LEVEL
    )
)

;; Validate buffer size is within bounds
(define-read-only (validate-buffer-size (buf (buff 256)) (min-size uint) (max-size uint))
    (let ((size (len buf)))
        (if (and (>= size min-size) (<= size max-size))
            (ok true)
            (err ERR-INVALID-BUFFER-SIZE)
        )
    )
)

;; Validate principal is not contract sender (prevents self-operations)
(define-read-only (validate-not-self (address principal))
    (if (not (is-eq address tx-sender))
        (ok true)
        (err u610) ;; ERR-SELF-GRANT-NOT-ALLOWED
    )
)

;; Validate principal is not zero address
(define-read-only (validate-principal-not-zero (address principal))
    (if (not (is-eq address (as-contract tx-sender)))
        (ok true)
        (err ERR-INVALID-ADDRESS)
    )
)

;; Validate proof type is one of allowed types (1-4)
(define-read-only (validate-proof-type (proof-type uint))
    (if (and (>= proof-type u1) (<= proof-type u4))
        (ok true)
        (err u405) ;; ERR-INVALID-PROOF-TYPE
    )
)

;; Composite validation: all dataset registration inputs
(define-read-only (validate-dataset-registration
    (metadata-hash (buff 32))
    (storage-url (string-utf8 200))
    (description (string-utf8 200))
    (price uint))
    (begin
        (try! (validate-hash metadata-hash))
        (try! (validate-storage-url storage-url))
        (try! (validate-description description))
        (try! (validate-price price))
        (ok true)
    )
)

;; Composite validation: all listing creation inputs
(define-read-only (validate-listing-creation
    (price uint)
    (access-level uint)
    (description (string-utf8 200)))
    (begin
        (try! (validate-price price))
        (try! (validate-access-level access-level))
        (try! (validate-description description))
        (ok true)
    )
)

;; Composite validation: all proof registration inputs
(define-read-only (validate-proof-registration
    (data-id uint)
    (proof-type uint)
    (proof-hash (buff 32))
    (parameters (buff 256))
    (metadata (string-utf8 200)))
    (begin
        (asserts! (> data-id u0) u400) ;; ERR-INVALID-INPUT
        (try! (validate-proof-type proof-type))
        (try! (validate-hash proof-hash))
        (try! (validate-buffer-size parameters u1 u256))
        (try! (validate-string-length metadata u0 u200))
        (ok true)
    )
)

;; Validate that a uint is strictly positive (> 0)
(define-read-only (validate-positive-uint (value uint))
    (if (> value u0)
        (ok true)
        (err ERR-ZERO-VALUE)
    )
)

;; Validate that a uint falls within a specific range [min, max] inclusive
(define-read-only (validate-uint-range (value uint) (min-val uint) (max-val uint))
    (if (and (>= value min-val) (<= value max-val))
        (ok true)
        (err ERR-INVALID-UINT-BOUNDS)
    )
)

;; Validate buffer is not empty
(define-read-only (validate-buffer-not-empty (buf (buff 256)))
    (if (> (len buf) u0)
        (ok true)
        (err ERR-INVALID-BUFFER-SIZE)
    )
)

;; Validate that a hash is not all zero bytes (meaningless sentinel)
(define-read-only (validate-hash-not-zero (hash (buff 32)))
    (if (not (is-eq hash 0x0000000000000000000000000000000000000000000000000000000000000000))
        (ok true)
        (err u408) ;; ERR-ZERO-HASH
    )
)

;; Validate that two principals are different
(define-read-only (validate-principals-differ (principal1 principal) (principal2 principal))
    (if (not (is-eq principal1 principal2))
        (ok true)
        (err u610) ;; ERR-SELF-GRANT-NOT-ALLOWED
    )
)

;; Validate that a principal is not the contract itself
(define-read-only (validate-principal-not-contract (address principal))
    (if (not (is-eq address (as-contract tx-sender)))
        (ok true)
        (err ERR-INVALID-ADDRESS)
    )
)

;; Validate price is within acceptable range and not zero
(define-read-only (validate-price-strict (price uint))
    (begin
        (try! (validate-positive-uint price))
        (if (<= price MAX-PRICE)
            (ok true)
            (err u402) ;; ERR-PRICE-TOO-HIGH
        )
    )
)

;; Validate access level and that it's within bounds
(define-read-only (validate-access-level-strict (level uint))
    (begin
        (try! (validate-positive-uint level))
        (if (<= level u3)
            (ok true)
            (err u406) ;; ERR-INVALID-ACCESS-LEVEL
        )
    )
)

;; Validate description exists and has appropriate length
(define-read-only (validate-description-strict (description (string-utf8 200)))
    (let ((len (len description)))
        (begin
            (asserts! (> len u0) u407) ;; ERR-INVALID-STRING-LENGTH (empty)
            (asserts! (<= len u200) u407) ;; ERR-INVALID-STRING-LENGTH (too long)
            (ok true)
        )
    )
)
