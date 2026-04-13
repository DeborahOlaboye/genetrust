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
