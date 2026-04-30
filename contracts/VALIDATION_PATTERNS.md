# Validation Patterns for GeneTrust Smart Contracts

## Overview

This document describes the standardized validation patterns used throughout GeneTrust contracts to ensure consistency, security, and maintainability.

## Validation Hierarchy

All validations follow this order:

1. **Authorization checks** (who is calling?)
2. **Input validation** (is input valid?)
3. **State validation** (does resource exist and is it in right state?)
4. **Business logic validation** (do business rules allow this?)
5. **Side effects** (make state changes)

## Error Code Categories

### 400-409: Input Validation Errors
Used when function arguments are invalid or out of acceptable ranges.

```clarity
;; Validate non-empty hash
(asserts! (is-eq (len hash) u32) ERR-INVALID-HASH)

;; Validate hash is not all-zero (meaningless sentinel)
(asserts! (not (is-eq hash 0x0000000000000000000000000000000000000000000000000000000000000000)) ERR-ZERO-HASH)

;; Validate amount is positive
(asserts! (> amount u0) ERR-INVALID-AMOUNT)

;; Validate amount does not exceed maximum cap
(asserts! (<= amount MAX-PRICE) ERR-PRICE-TOO-HIGH)

;; Validate string length bounds (including minimum URL length)
(asserts! (and (>= (len s) MIN-LEN) (<= (len s) MAX-LEN)) ERR-INVALID-STRING-LENGTH)
```

### 410-414: Authorization Errors
Used when caller doesn't have necessary permissions.

```clarity
(asserts! (is-eq tx-sender owner) ERR-NOT-OWNER)
(asserts! (is-eq tx-sender contract-owner) ERR-NOT-CONTRACT-OWNER)
```

### 430-439: Not Found Errors
Used when required resource doesn't exist.

```clarity
(unwrap! (map-get? datasets { id: id }) ERR-DATASET-NOT-FOUND)
```

### 440-449: Conflict Errors
Used when resource already exists or state conflicts prevent operation.

```clarity
(asserts! (is-none (map-get? access-rights {...})) ERR-DUPLICATE-ACCESS-GRANT)
```

### 450-459: Inactive/Gone Errors
Used when resource exists but is inactive or deleted.

```clarity
(asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
```

### 500-519: Server/Internal Errors
Used for failed external operations or internal state issues.

```clarity
(try! (stx-transfer? amount sender recipient))
```

## Common Validation Patterns

### Pattern 1: Positive Number Validation
```clarity
(asserts! (> amount u0) ERR-INVALID-AMOUNT)
```

### Pattern 2: String Length Validation
```clarity
(asserts! (and (>= (len name) MIN-NAME-LENGTH) 
               (<= (len name) MAX-NAME-LENGTH)) 
          ERR-INVALID-STRING-LENGTH)
```

### Pattern 3: Buffer Size Validation
```clarity
(asserts! (is-eq (len hash) EXPECTED-HASH-LENGTH) ERR-INVALID-HASH)
```

### Pattern 4: Range Validation (Enum-like)
```clarity
(asserts! (and (>= level u1) (<= level u3)) ERR-INVALID-ACCESS-LEVEL)
```

### Pattern 5: Self-Operation Prevention
```clarity
(asserts! (not (is-eq address tx-sender)) ERR-SELF-GRANT-NOT-ALLOWED)
```

### Pattern 6: Resource Existence Check
```clarity
(let ((resource (unwrap! (map-get? resources { id: id }) ERR-RESOURCE-NOT-FOUND)))
  ;; resource operations
)
```

### Pattern 7: Resource State Check
```clarity
(asserts! (get is-active resource) ERR-INACTIVE-RESOURCE)
(asserts! (get active verifier) ERR-VERIFIER-INACTIVE)
```

### Pattern 8: Authorization Check
```clarity
(asserts! (is-eq tx-sender (get owner resource)) ERR-NOT-OWNER)
```

### Pattern 9: Uniqueness Check
```clarity
(asserts! (is-none (map-get? existing-records { key: value })) ERR-DUPLICATE)
```

### Pattern 10: Business Rule Validation
```clarity
(asserts! (<= desired-access-level listing-access-level) ERR-INSUFFICIENT-ACCESS-LEVEL)
```

## Documentation Standard

Every public function should include documentation:

```clarity
;; @param name: Parameter description
;; @param amount: Parameter description
;; @returns: ok with result on success, error otherwise
;; @requires: Authorization requirement
;; @requires: Input requirement
;; @requires: State requirement
```

## Testing Validation

For each validation pattern, create tests:

1. **Valid input test**: Verify function succeeds with valid inputs
2. **Invalid input test**: Verify function fails with specific error code
3. **Edge case tests**: Boundary values (min/max lengths, amounts, etc.)
4. **Authorization tests**: Verify ownership/permission checks
5. **State conflict tests**: Verify state-dependent validations

## Adding New Validations

When adding new validations:

1. Choose appropriate error code from ERROR_CODES.md
2. Add validation in correct position in validation hierarchy
3. Use existing validation utility functions where applicable
4. Document the validation with a comment
5. Add test cases for the validation
6. Update ERROR_CODES.md if defining new error codes

## Common Mistakes to Avoid

1. ❌ Using generic ERR-INVALID-INPUT for all validation errors
   - ✅ Use specific error codes (ERR-INVALID-AMOUNT, ERR-INVALID-HASH, etc.)

2. ❌ Validating after state changes
   - ✅ Validate all inputs before any state modifications

3. ❌ Missing self-operation checks  
   - ✅ Use ERR-SELF-GRANT-NOT-ALLOWED pattern

4. ❌ Not checking resource is active
   - ✅ Add is-active checks for operations on inactive resources

5. ❌ Forgetting duplicate prevention
   - ✅ Check with is-none before creating duplicate entries

6. ❌ Poor error message clarity
   - ✅ Use specific, descriptive error codes

## Performance Considerations

- Validations are fast and should be done eagerly
- Avoid unnecessary lookups (use map-get? early and reuse results)
- Error early and often to save gas
- Combine related assertions where possible

## Migration Guide

When refactoring existing validation:

1. Identify all uses of generic error codes
2. Map to appropriate specific error codes
3. Update validation logic to match patterns
4. Add missing validation where appropriate
5. Update documentation
6. Test thoroughly
