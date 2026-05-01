;; boundary-validators.clar
;; Common boundary validation utilities for GeneTrust contracts

;; Boundary constants
(define-constant ZERO u0)
(define-constant ONE u1)
(define-constant TRUE true)
(define-constant FALSE false)

;; Validate ID is within reasonable bounds
(define-read-only (validate-id (id uint))
    (if (> id u0)
        (ok true)
        (err u400) ;; ERR-INVALID-INPUT
    )
)

;; Validate positive uint
(define-read-only (is-positive (value uint))
    (> value u0)
)

;; Validate non-negative uint  
(define-read-only (is-non-negative (value uint))
    (>= value u0)
)

;; Validate value is within range (inclusive)
(define-read-only (in-range (value uint) (min-val uint) (max-val uint))
    (and (>= value min-val) (<= value max-val))
)

;; Validate access level is valid (1-3)
(define-read-only (is-valid-access-level (level uint))
    (in-range level u1 u3)
)

;; Validate proof type is valid (1-4)
(define-read-only (is-valid-proof-type (ptype uint))
    (in-range ptype u1 u4)
)

;; Validate price is positive and not excessive
(define-read-only (is-reasonable-price (price uint))
    (and (> price u0) 
         (<= price u340282366920938463463374607431768211455))
)

;; Validate string is not empty
(define-read-only (is-non-empty-string (s (string-utf8 400)))
    (> (len s) u0)
)

;; Validate string is within length bounds
(define-read-only (is-string-length-valid (s (string-utf8 400)) (min-len uint) (max-len uint))
    (let ((len (len s)))
        (and (>= len min-len) (<= len max-len))
    )
)

;; Validate buffer is not empty
(define-read-only (is-non-empty-buffer (b (buff 256)))
    (> (len b) u0)
)

;; Validate buffer is within size bounds
(define-read-only (is-buffer-size-valid (b (buff 256)) (min-size uint) (max-size uint))
    (let ((size (len b)))
        (and (>= size min-size) (<= size max-size))
    )
)

;; Validate hash is exactly 32 bytes
(define-read-only (is-valid-hash (h (buff 32)))
    (is-eq (len h) u32)
)

;; Validate two principals are different
(define-read-only (not-same-principal (p1 principal) (p2 principal))
    (not (is-eq p1 p2))
)

;; Validate principal is not zero/contract address
(define-read-only (is-valid-principal (p principal) (contract-addr principal))
    (not (is-eq p contract-addr))
)

;; Validate boolean is in expected state
(define-read-only (is-expected-state (actual bool) (expected bool))
    (is-eq actual expected)
)

;; Validate access level meets minimum
(define-read-only (meets-minimum-access (required-level uint) (available-level uint))
    (>= available-level required-level)
)

;; Validate timestamp is in past (value <= current block height)
(define-read-only (is-in-past (timestamp-block uint))
    (<= timestamp-block stacks-block-height)
)

;; Validate timestamp is in future
(define-read-only (is-in-future (timestamp-block uint))
    (> timestamp-block stacks-block-height)
)

;; Validate expiration hasn't occurred
(define-read-only (is-not-expired (expiration-block uint))
    (< stacks-block-height expiration-block)
)

;; Validate value increased (useful for versioning)
(define-read-only (has-increased (old-value uint) (new-value uint))
    (> new-value old-value)
)

;; Validate value hasn't decreased
(define-read-only (has-not-decreased (old-value uint) (new-value uint))
    (>= new-value old-value)
)

;; Composite: Validate dataset registration inputs are all valid
(define-read-only (all-dataset-params-valid
    (hash (buff 32))
    (url (string-utf8 200))
    (desc (string-utf8 200))
    (level uint)
    (price uint))
    (and (is-valid-hash hash)
         (is-string-length-valid url u5 u200)
         (is-string-length-valid desc u10 u200)
         (is-valid-access-level level)
         (is-reasonable-price price))
)

;; Composite: Validate listing parameters are all valid
(define-read-only (all-listing-params-valid
    (price uint)
    (level uint)
    (desc (string-utf8 200)))
    (and (is-reasonable-price price)
         (is-valid-access-level level)
         (is-string-length-valid desc u10 u200))
)

;; Composite: Validate proof registration inputs are all valid
(define-read-only (all-proof-params-valid
    (data-id uint)
    (ptype uint)
    (hash (buff 32))
    (params (buff 256))
    (meta (string-utf8 200)))
    (and (is-positive data-id)
         (is-valid-proof-type ptype)
         (is-valid-hash hash)
         (is-buffer-size-valid params u1 u256)
         (is-string-length-valid meta u0 u200))
)

;; Validate timestamp is in future (value > current block height)
(define-read-only (is-in-future (timestamp-block uint))
    (> timestamp-block stacks-block-height)
)

;; Validate timestamp is current or future
(define-read-only (is-current-or-future (timestamp-block uint))
    (>= timestamp-block stacks-block-height)
)

;; Validate that two uints are different
(define-read-only (not-equal (val1 uint) (val2 uint))
    (not (is-eq val1 val2))
)

;; Validate uint is exactly a specific value
(define-read-only (is-exact-match (actual uint) (expected uint))
    (is-eq actual expected)
)

;; Validate price does not exceed MAX-PRICE constant
(define-read-only (price-within-cap (price uint) (max-price uint))
    (<= price max-price)
)

;; Validate amount is within acceptable range with minimum and maximum
(define-read-only (amount-in-bounds (amount uint) (min-amount uint) (max-amount uint))
    (and (>= amount min-amount) (<= amount max-amount))
)

;; Validate string is not empty and within max length
(define-read-only (validate-string-presence (s (string-utf8 400)) (max-len uint))
    (and (> (len s) u0) (<= (len s) max-len))
)

;; Validate that both conditions are true (safety check)
(define-read-only (both-true (cond1 bool) (cond2 bool))
    (and cond1 cond2)
)

;; Validate that either condition is true
(define-read-only (either-true (cond1 bool) (cond2 bool))
    (or cond1 cond2)
)

;; Validate buffer exists and is not all zeros
(define-read-only (is-non-zero-buffer (buf (buff 32)))
    (and (> (len buf) u0)
         (not (is-eq buf 0x0000000000000000000000000000000000000000000000000000000000000000)))
)

;; Validate hash is valid length and not all zeros
(define-read-only (is-valid-metadata-hash (h (buff 32)))
    (is-non-zero-buffer h)
)

;; Validate multiple conditions all pass
(define-read-only (all-conditions-pass (c1 bool) (c2 bool) (c3 bool))
    (and c1 c2 c3)
)

;; Validate all four conditions pass
(define-read-only (all-four-conditions-pass (c1 bool) (c2 bool) (c3 bool) (c4 bool))
    (and c1 c2 c3 c4)
)
