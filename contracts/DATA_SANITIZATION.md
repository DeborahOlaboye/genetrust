# Data Sanitization and Security Guidelines

## Overview

This document describes data sanitization patterns and security guidelines for GeneTrust smart contracts, ensuring inputs are safe and consistent throughout the system.

## String Sanitization

### UTF-8 String Validation

All string inputs are stored as `(string-utf8 N)` which automatically validates UTF-8 encoding.

```clarity
;;  Automatic UTF-8 validation on assignment
(define-public (register-dataset (...) (description (string-utf8 200)))
    ;; string-utf8 type ensures valid UTF-8
    ;; No additional sanitization needed
    (ok (...))
)
```

### Length Validation

Always validate string lengths are within acceptable bounds:

```clarity
;; MIN restrictions prevent memory waste
;; MAX restrictions prevent DoS attacks
(asserts! (and (>= (len description) MIN-DESCRIPTION-LENGTH) 
               (<= (len description) MAX-DESCRIPTION-LENGTH)) 
          ERR-INVALID-STRING-LENGTH)
```

### Constant Definitions

Define all string length constants for consistency:

```clarity
;; String length boundaries
(define-constant MIN-DESCRIPTION-LENGTH u10)
(define-constant MAX-DESCRIPTION-LENGTH u200)
(define-constant MIN-NAME-LENGTH u1)
(define-constant MAX-NAME-LENGTH u64)
(define-constant MIN-URL-LENGTH u5)
(define-constant MAX-URL-LENGTH u200)
```

## Buffer/Hash Sanitization

### Hash Validation

Hashes must be exact length to ensure consistency:

```clarity
;; Always validate hash is exactly expected length
(asserts! (is-eq (len metadata-hash) HASH-LENGTH) ERR-INVALID-HASH)

;; Never accept hashes of incorrect length
;; This prevents hash collision attacks
```

### Buffer Size Validation

Buffer parameters must be within acceptable ranges:

```clarity
;; Min size prevents empty/meaningless data
;; Max size prevents memory exhaustion
(asserts! (and (> (len parameters) u0) 
               (<= (len parameters) u256)) 
          ERR-INVALID-BUFFER-SIZE)
```

## Principal/Address Sanitization

### Contract Address Prevention

Prevent contract address from being used as user principal:

```clarity
;; Never allow operations with contract itself as principal
(asserts! (not (is-eq verifier-address (as-contract tx-sender))) 
          ERR-INVALID-PARAMETERS)
```

### Self-Operation Prevention

Prevent users from performing operations on themselves:

```clarity
;; Prevent granting access to self
(asserts! (not (is-eq user tx-sender)) 
          ERR-SELF-GRANT-NOT-ALLOWED)

;; Prevent purchasing from self
(asserts! (not (is-eq tx-sender owner)) 
          ERR-INVALID-INPUT)
```

## Numeric Sanitization

### Amount Validation

All monetary amounts must be positive:

```clarity
;; Zero amounts are meaningless
(asserts! (> price u0) ERR-INVALID-AMOUNT)

;; Prevent overflow by checking against max
(asserts! (<= price MAX-PRICE) ERR-INVALID-AMOUNT)
```

### Enum-like Validation

Always validate enum-like numeric fields:

```clarity
;; Access levels must be 1, 2, or 3
(asserts! (and (>= access-level ACCESS-BASIC) 
               (<= access-level ACCESS-FULL)) 
          ERR-INVALID-ACCESS-LEVEL)

;; Proof types must be 1, 2, 3, or 4
(asserts! (or (is-eq proof-type PROOF-GENE-PRESENCE)
              (is-eq proof-type PROOF-GENE-ABSENCE)
              (is-eq proof-type PROOF-GENE-VARIANT)
              (is-eq proof-type PROOF-AGGREGATE))
          ERR-INVALID-PROOF-TYPE)
```

## ID Validation

### State Variable IDs

Always validate IDs are positive:

```clarity
;; Zero IDs are invalid
(asserts! (> data-id u0) ERR-INVALID-INPUT)
(asserts! (> listing-id u0) ERR-INVALID-INPUT)
```

## Complex Data Sanitization

### Composite Input Validation

For functions with multiple parameters, validate combinations:

```clarity
(define-read-only (validate-listing-creation
    (price uint)
    (access-level uint)  
    (description (string-utf8 200)))
    (begin
        ;; Validate each field
        (try! (validate-price price))
        (try! (validate-access-level access-level))
        (try! (validate-description description))
        ;; No cross-field conflicts in this case
        (ok true)
    )
)
```

### Access Level Constraint Validation

Ensure requested levels don't exceed maximums:

```clarity
;; When updating access, never grant more than available
(asserts! (<= desired-access-level (get access-level listing)) 
          ERR-INSUFFICIENT-ACCESS-LEVEL)
```

## Prevention Patterns

### SQL Injection Prevention (Not Applicable)
Smart contracts don't use SQL, so SQL injection is not a concern.

### Integer Overflow Prevention

Clarity uses arbitrary-precision integers, but we still validate ranges:

```clarity
;; Prevent prices exceeding u128 max
(define-constant MAX-PRICE u340282366920938463463374607431768211455)
(asserts! (<= price MAX-PRICE) ERR-INVALID-AMOUNT)
```

### Authorization Bypass Prevention

Always verify caller before granting privileges:

```clarity
;; Multiple checks ensure only owner can deactivate
(asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
(asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
```

### State Collision Prevention

Prevent invalid state transitions:

```clarity
;; Cannot deactivate already-deactivated dataset
(asserts! (get is-active dataset) ERR-INACTIVE-DATASET)

;; Cannot grant duplicate access
(asserts! (is-none (map-get? access-rights {...})) ERR-DUPLICATE-ACCESS-GRANT)
```

## Logging and Monitoring Readiness

### Meaningful Error Codes

Use semantically meaningful error codes for debugging:

```clarity
;; Instead of generic ERR-INVALID-INPUT
ERR-DATASET-NOT-FOUND      ;; Specific error for missing resource
ERR-NOT-OWNER              ;; Specific error for authorization
ERR-INVALID-ACCESS-LEVEL   ;; Specific error for constraint violation
```

### Error Documentation

Document what each error means and how to recover:

```markdown
## ERR-INVALID-ACCESS-LEVEL (u406)
- **Meaning**: The provided access level is outside valid range (1-3)
- **Causes**: Input validation failed
- **Fix**: Provide access level between 1 and 3
- **Example**: Calling grant-access with access-level=5
```

## Sanitization Checklist

When adding a new function, verify:

- [ ] All string parameters have length bounds
- [ ] All numeric parameters are validated
- [ ] Hash parameters are exactly expected length
- [ ] Buffer parameters have size bounds
- [ ] Enum-like fields validate against allowed values
- [ ] Principal parameters check for self-operations where needed
- [ ] All numeric amounts validate non-zero/positive
- [ ] Access levels don't exceed maximum available
- [ ] Authorization checks before operations
- [ ] State checks before modifications
- [ ] Specific error codes used instead of generic ones
- [ ] Function documentation includes all constraints
- [ ] Test cases cover all validation paths

## Auto-Sanitization by Language

### Clarity Built-in Protections

1. **Integer Overflow**: Arbitrary precision, no overflow
2. **Type Safety**: Strict type checking at compile time
3. **UTF-8 Strings**: `(string-utf8 N)` validates UTF-8
4. **Map Safety**: Maps can't overflow, no hash collisions
5. **Fixed-Size Buffers**: `(buff N)` is fixed-size

### Required Manual Validation

1. **String Length**: Validate `(len s)` against bounds
2. **Numeric Amounts**: Validate amounts are positive/reasonable
3. **Buffer Content**: Validate hash correctness externally
4. **Principal Validity**: Validate self-operations and permissions
5. **State Consistency**: Validate objects in correct state

## Testing Sanitization

Create tests for boundary conditions:

```clarity
;; Test empty string (too short)
;; Test max-length string
;; Test string longer than max (should fail)
;; Test zero amount (should fail)
;; Test max amount
;; Test amount exceeding max (should fail)
;; Test access level 0 (too low)
;; Test access level 4 (too high)
;; Test self-operations (should fail)
```

## References

- [ERROR_CODES.md](ERROR_CODES.md) - All error codes
- [VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md) - Validation patterns
- [ERROR_RECOVERY.md](ERROR_RECOVERY.md) - Error recovery strategies

## Hardened Validation Rules (Phase 6)

### Price Sanitization
All price inputs must pass two checks:
1. `price > 0` — zero prices are meaningless and blocked by `ERR-INVALID-AMOUNT (u401)`
2. `price <= MAX-PRICE` — prices above `u1000000000000000` (1 quadrillion microSTX) are blocked by `ERR-PRICE-TOO-HIGH (u402)` to prevent uint-range exploitation

### Metadata Hash Sanitization
The 32-byte `metadata-hash` field must pass two checks:
1. `len(hash) == 32` — enforced by type system but also checked explicitly
2. `hash != 0x000...000` — all-zero hash is a sentinel/placeholder and is rejected with `ERR-ZERO-HASH (u408)`

### Storage URL Sanitization
Storage URLs must be at least `MIN-URL-LENGTH` (5) characters. This eliminates single-char or empty URL registrations while remaining flexible for various URL schemes (ipfs://, ar://, https://).

### Access Level Cap Sanitization
When granting access, the requested level cannot exceed the dataset's own configured level. This prevents owners from accidentally granting more access than the dataset is classified for.

## Advanced Sanitization Patterns

### Principal/Address Sanitization

#### Prevent Self-Operations
```clarity
;; Always validate that user ≠ caller
(asserts! (not (is-eq user tx-sender)) ERR-SELF-GRANT-NOT-ALLOWED)
```

#### Prevent Contract Address Usage
```clarity
;; Ensure address is not the contract itself
(asserts! (not (is-eq address (as-contract tx-sender))) ERR-INVALID-ADDRESS)
```

#### Validate Principal Distinctness
```clarity
;; Ensure two principals are different
(asserts! (not (is-eq principal1 principal2)) ERR-DIFFERENT-PRINCIPALS-REQUIRED)
```

### Numeric Sanitization Patterns

#### Price Range Validation
```clarity
;; Ensure price is positive and within cap
(asserts! (> price u0) ERR-INVALID-AMOUNT)
(asserts! (<= price MAX-PRICE) ERR-PRICE-TOO-HIGH)
```

#### Access Level Enumeration Validation
```clarity
;; Ensure level is in valid enum range (1-3)
(asserts! (and (>= level ACCESS-BASIC) (<= level ACCESS-FULL)) ERR-INVALID-ACCESS-LEVEL)
```

#### Block Height Validation
```clarity
;; Ensure expiry is in the future
(asserts! (< stacks-block-height (get expires-at resource)) ERR-EXPIRED-RESOURCE)
```

## Sanitization Testing

### String Input Tests
- Test minimum boundary (exactly MIN length)
- Test maximum boundary (exactly MAX length)
- Test below minimum (MIN - 1)
- Test above maximum (MAX + 1)
- Test empty string
- Test valid UTF-8 content

### Numeric Input Tests
- Test smallest positive amount
- Test amount at MAX constant
- Test zero amount
- Test amount exceeding MAX
- Test all enum boundary values

### Principal Tests
- Test self-grant prevention
- Test contract address rejection
- Test valid principal acceptance
- Test principal distinctness

### Hash/Buffer Tests
- Test exact length (32 bytes)
- Test wrong length
- Test all-zero hash (sentinel)
- Test non-zero content

## Sanitization Best Practices

1. **Validate Early**: Check inputs at function entry
2. **Fail Fast**: Stop on first validation failure
3. **Be Specific**: Use precise error codes
4. **Document Constants**: Clearly document all bounds
5. **Test Boundaries**: Test min, max, and beyond edge cases
