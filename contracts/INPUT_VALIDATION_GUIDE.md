# Input Validation Guidelines for GeneTrust Contracts

## Overview

This guide provides standardized patterns and best practices for validating inputs across all GeneTrust smart contracts. Consistent input validation ensures security, prevents edge cases, and improves application reliability.

## Core Principles

1. **Validate Early**: Check inputs at the start of functions before state changes
2. **Be Specific**: Use precise error codes that describe the exact validation failure
3. **Fail Fast**: Stop execution on the first invalid input
4. **Document Constraints**: Clearly document all input requirements
5. **Test Thoroughly**: Test both valid and invalid inputs

## Input Categories

### 1. Numeric Inputs (uint)

#### Zero Validation
```clarity
;; Ensure value is not zero
(asserts! (> value u0) ERR-INVALID-AMOUNT)
```

#### Range Validation
```clarity
;; Ensure value is within bounds
(asserts! (and (>= value min-val) (<= value max-val)) ERR-OUT-OF-RANGE)
```

#### Maximum Cap Validation
```clarity
;; Ensure value does not exceed cap
(asserts! (<= price MAX-PRICE) ERR-PRICE-TOO-HIGH)
```

### 2. Buffer Inputs ((buff N))

#### Length Validation
```clarity
;; Ensure buffer is exactly expected length
(asserts! (is-eq (len hash) u32) ERR-INVALID-HASH)
```

#### Non-Empty Validation
```clarity
;; Ensure buffer is not empty
(asserts! (> (len buffer) u0) ERR-EMPTY-BUFFER)
```

#### Non-Zero Content Validation (for hashes)
```clarity
;; Ensure buffer is not all zeros
(asserts! (not (is-eq hash 0x0000...)) ERR-ZERO-HASH)
```

### 3. String Inputs ((string-utf8 N))

#### Non-Empty Validation
```clarity
;; Ensure string is not empty
(asserts! (> (len string) u0) ERR-EMPTY-STRING)
```

#### Min Length Validation
```clarity
;; Ensure string meets minimum length
(asserts! (>= (len string) MIN-LENGTH) ERR-STRING-TOO-SHORT)
```

#### Max Length Validation
```clarity
;; Ensure string does not exceed maximum length
(asserts! (<= (len string) MAX-LENGTH) ERR-STRING-TOO-LONG)
```

#### Combined Length Validation
```clarity
;; Validate both min and max in one assertion
(asserts! (and (>= (len string) MIN) (<= (len string) MAX)) ERR-INVALID-STRING-LENGTH)
```

### 4. Principal Inputs

#### Self-Operation Prevention
```clarity
;; Prevent operations on self
(asserts! (not (is-eq user tx-sender)) ERR-SELF-NOT-ALLOWED)
```

#### Contract Address Validation
```clarity
;; Ensure principal is not contract
(asserts! (not (is-eq address (as-contract tx-sender))) ERR-CONTRACT-ADDRESS)
```

#### Distinctness Validation
```clarity
;; Ensure two principals are different
(asserts! (not (is-eq principal1 principal2)) ERR-SAME-PRINCIPAL)
```

### 5. Enum-like Inputs (uint with limited valid values)

#### Fixed Range Validation
```clarity
;; Validate access level (1-3)
(asserts! (and (>= level u1) (<= level u3)) ERR-INVALID-ACCESS-LEVEL)
```

#### Explicit Value Validation
```clarity
;; Validate proof type is one of allowed types
(asserts! (or
    (is-eq proof-type TYPE-A)
    (is-eq proof-type TYPE-B)
) ERR-INVALID-TYPE)
```

## Validation Ordering

Follow this recommended sequence for maximum efficiency:

1. **Input Type Validation**: Check basic properties (length, type)
2. **Value Range Validation**: Check min/max bounds
3. **Authorization Validation**: Check permissions
4. **State Validation**: Check resource existence and status
5. **Business Logic Validation**: Check constraints

## Error Code Mapping

| Category | Error Code | When to Use |
|----------|-----------|------------|
| Amount invalid | ERR-INVALID-AMOUNT (u401) | Zero, negative, or invalid amount |
| Hash invalid | ERR-INVALID-HASH (u403) | Wrong length, format, or content |
| String invalid | ERR-INVALID-STRING-LENGTH (u407) | Wrong length or empty |
| Access level invalid | ERR-INVALID-ACCESS-LEVEL (u406) | Out of valid range (1-3) |
| Self-operation | ERR-SELF-GRANT-NOT-ALLOWED (u610) | User operating on self |
| Duplicate | ERR-DUPLICATE-ACCESS-GRANT (u444) | Duplicate record exists |
| Not found | ERR-DATASET-NOT-FOUND (u431) | Resource doesn't exist |
| Inactive | ERR-INACTIVE-DATASET (u450) | Resource is deactivated |

## Composite Validation Functions

For complex inputs, use composite validators that check all parameters:

```clarity
(define-read-only (validate-dataset-input
    (metadata-hash (buff 32))
    (price uint)
    (description (string-utf8 200)))
    (begin
        (asserts! (is-eq (len metadata-hash) u32) ERR-INVALID-HASH)
        (asserts! (> price u0) ERR-INVALID-AMOUNT)
        (asserts! (> (len description) u0) ERR-INVALID-STRING-LENGTH)
        (ok true)
    )
)
```

Users can then call with `try!`:

```clarity
(try! (validate-dataset-input hash price desc))
```

## Testing Input Validation

For each validated input, create tests:

1. **Valid Input Test**: Verify success with correct input
2. **Boundary Test**: Test edge cases (empty, max length, zero, max value)
3. **Invalid Type Test**: Test with wrong data types
4. **Out-of-Range Test**: Test min-1, max+1

### Test Example

```typescript
// Valid case
test("registers dataset with valid price", () => {
  const result = registerDataset(hash, url, desc, level, 1000000);
  assert(result.isOk);
});

// Boundary case
test("rejects dataset with price at MAX-PRICE+1", () => {
  const result = registerDataset(hash, url, desc, level, MAX-PRICE + 1);
  assert(result.isErr);
  assert(result.err === ERR-PRICE-TOO-HIGH);
});

// Invalid case
test("rejects dataset with zero price", () => {
  const result = registerDataset(hash, url, desc, level, 0);
  assert(result.isErr);
  assert(result.err === ERR-INVALID-AMOUNT);
});

// Edge case
test("rejects dataset with empty description", () => {
  const result = registerDataset(hash, url, "", level, 1000000);
  assert(result.isErr);
  assert(result.err === ERR-INVALID-STRING-LENGTH);
});
```

## Common Validation Errors to Avoid

### ❌ Forgetting to validate buffer length
```clarity
;; BAD
(map-set data { id: id } { hash: hash })

;; GOOD
(asserts! (is-eq (len hash) u32) ERR-INVALID-HASH)
(map-set data { id: id } { hash: hash })
```

### ❌ Combining too many conditions
```clarity
;; HARD TO READ
(asserts! (and (> amount u0) (<= amount MAX) (> (len desc) u0) (<= (len desc) u200)) ERR-INVALID)

;; BETTER
(asserts! (> amount u0) ERR-INVALID-AMOUNT)
(asserts! (<= amount MAX) ERR-PRICE-TOO-HIGH)
(asserts! (> (len desc) u0) ERR-INVALID-STRING-LENGTH)
(asserts! (<= (len desc) u200) ERR-INVALID-STRING-LENGTH)
```

### ❌ Validating after state changes
```clarity
;; BAD - validation after change
(map-set resource { id: id } data)
(asserts! (> amount u0) ERR-INVALID-AMOUNT)

;; GOOD - validation before change
(asserts! (> amount u0) ERR-INVALID-AMOUNT)
(map-set resource { id: id } data)
```

### ❌ Using generic error codes
```clarity
;; BAD
(asserts! (> amount u0) ERR-INVALID-INPUT)

;; GOOD
(asserts! (> amount u0) ERR-INVALID-AMOUNT)
```

## Validation Checklist for New Functions

- [ ] Document all input parameter constraints
- [ ] Validate types and lengths
- [ ] Validate value ranges
- [ ] Check for self-operations where applicable
- [ ] Verify authorization before resource access
- [ ] Check resource existence
- [ ] Verify resource state (active, not expired)
- [ ] Check for duplicates or conflicts
- [ ] Use specific error codes
- [ ] Test with valid inputs
- [ ] Test with invalid inputs
- [ ] Test edge/boundary cases

## Performance Tips

1. **Order validations by likelihood**: Put most common failures first
2. **Reuse lookups**: Don't call map-get? multiple times
3. **Combine simple checks**: Group related assertions
4. **Fail early**: Return on first error

## References

- [Error Codes Reference](./ERROR_CODES.md)
- [Validation Patterns](./VALIDATION_PATTERNS.md)
- [Data Sanitization Guide](./DATA_SANITIZATION.md)
