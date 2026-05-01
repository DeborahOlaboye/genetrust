# Error Recovery and Handling Strategies

## Overview

This document describes approved patterns for error handling and recovery in GeneTrust contracts, ensuring that errors don't leave the system in an inconsistent state.

## Error Recovery Strategy

### 1. Early Validation Pattern (Fail-Fast)

Validate all inputs before making any state changes. This ensures failed operations don't corrupt state.

```clarity
(define-public (transfer-access (data-id uint) (from principal) (to principal) (level uint))
    ;; Validate ALL inputs first (before any state changes)
    (asserts! (> data-id u0) ERR-INVALID-INPUT)
    (asserts! (not (is-eq from to)) ERR-SELF-GRANT-NOT-ALLOWED)
    (asserts! (and (>= level u1) (<= level u3)) ERR-INVALID-ACCESS-LEVEL)
    
    ;; Get and validate resources
    (let ((access (unwrap! (map-get? access-rights { data-id: data-id, user: from }) 
                          ERR-ACCESS-RIGHT-NOT-FOUND)))
        ;; Only NOW make state changes
        (map-delete access-rights { data-id: data-id, user: from })
        (map-set access-rights { data-id: data-id, user: to }
            (merge access { granted-by: tx-sender })
        )
        (ok true)
    )
)
```

### 2. Atomic Operations

Use `try!` macro to ensure related operations either all succeed or all fail:

```clarity
(define-public (purchase-with-escrow (listing-id uint) (access-level uint))
    (let ((listing (unwrap! (map-get? listings { listing-id: listing-id }) ERR-LISTING-NOT-FOUND)))
        ;; Validate everything first
        (asserts! (get active listing) ERR-NOT-FOUND)
        (asserts! (<= access-level (get access-level listing)) ERR-INSUFFICIENT-ACCESS-LEVEL)
        
        ;; Use try! to ensure both succeed
        (try! (stx-transfer? (get price listing) tx-sender (get owner listing)))
        (try! (record-purchase listing-id (get owner listing) access-level))
        
        (ok { listing-id: listing-id, access-level: access-level, paid: (get price listing) })
    )
)
```

### 3. Idempotency Checks (Prevention of Double-Operations)

Before state-modifying operations, check if state change is redundant:

```clarity
;; Prevent double-deactivation
(define-public (deactivate-dataset (data-id uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        ;; Only proceed if currently active
        (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
        
        ;; State change
        (map-set datasets { data-id: data-id } (merge dataset { is-active: false }))
        (ok true)
    )
)
```

### 4. State Validation Before Modification

Check that resource is in expected state before modifications:

```clarity
;; Verify verifier exists and is active before creating proof
(define-public (create-verified-proof
    (data-id uint)
    (proof-hash (buff 32))
    (verifier-id uint))
    (let ((verifier (unwrap! (map-get? verifiers { verifier-id: verifier-id }) ERR-VERIFIER-NOT-FOUND)))
        ;; Check verifier is active BEFORE processing proof
        (asserts! (get active verifier) ERR-VERIFIER-INACTIVE)
        
        ;; Now safe to create proof
        (create-proof-internal data-id proof-hash (some verifier-id))
    )
)
```

### 5. Consistency Validation

Validate that all related data remains consistent:

```clarity
;; When updating access level, verify it doesn't exceed dataset limits
(define-public (grant-elevated-access (data-id uint) (user principal) (level uint))
    (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
        ;; Ensure requested level doesn't exceed dataset max level
        (asserts! (<= level (get access-level dataset)) ERR-INSUFFICIENT-ACCESS-LEVEL)
        
        (map-set access-rights { data-id: data-id, user: user }
            {
                access-level: level,
                expires-at: (+ stacks-block-height ACCESS-EXPIRY-BLOCKS),
                granted-by: tx-sender
            }
        )
        (ok true)
    )
)
```

## Error Handling Patterns by Category

### Authorization Errors

**Pattern:** Fail early with clear error code

```clarity
(asserts! (is-eq tx-sender (get owner resource)) ERR-NOT-OWNER)
(asserts! (is-eq tx-sender contract-owner) ERR-NOT-CONTRACT-OWNER)
```

### Resource Not Found Errors

**Pattern:** Use unwrap! for required resources, alternative handling for optional

```clarity
;; Required resource
(unwrap! (map-get? resources { id: id }) ERR-NOT-FOUND)

;; Optional lookup
(match (map-get? optional-resources { id: id })
    resource (ok resource)
    (err ERR-NOT-FOUND)
)
```

### Conflicting State Errors

**Pattern:** Check for conflicts before proceeding

```clarity
;; Prevent duplicate grants
(asserts! (is-none (map-get? access-rights { data-id: data-id, user: user })) 
          ERR-DUPLICATE-ACCESS-GRANT)

;; Prevent operations on inactive resources
(asserts! (get is-active resource) ERR-INACTIVE-RESOURCE)
```

### Transaction Failure Recovery

**Pattern:** Use try! for operations that can fail

```clarity
;; If payment fails, entire function fails (atomic)
(try! (stx-transfer? amount payer payee))

;; Alternative: check balance before attempting
(match (as-contract (stx-account tx-sender))
    account (if (>= (get balance account) amount)
        (try! (stx-transfer? amount tx-sender recipient))
        (err ERR-INSUFFICIENT-BALANCE)
    )
    (err ERR-INSUFFICIENT-BALANCE)
)
```

## Transaction Lifecycle Pattern

Apply this pattern for complex multi-step operations:

```clarity
(define-public (complex-operation (input-1 type-1) (input-2 type-2))
    ;; PHASE 1: Validation (no state changes)
    (asserts! (validate-input-1 input-1) ERR-INVALID-INPUT)
    (asserts! (validate-input-2 input-2) ERR-INVALID-INPUT)
    
    ;; PHASE 2: Resource Acquisition (read-only)
    (let ((resource-1 (unwrap! (map-get? map-1 { id: id-1 }) ERR-NOT-FOUND))
          (resource-2 (unwrap! (map-get? map-2 { id: id-2 }) ERR-NOT-FOUND)))
        
        ;; PHASE 3: Authorization checks
        (asserts! (is-authorized tx-sender resource-1) ERR-NOT-AUTHORIZED)
        
        ;; PHASE 4: State validation
        (asserts! (is-valid-state resource-1) ERR-INVALID-STATE)
        
        ;; PHASE 5: Business logic validation
        (asserts! (business-rule-satisfied resource-1 resource-2) ERR-BUSINESS-RULE-VIOLATION)
        
        ;; PHASE 6: External transactions (with try!)
        (try! (external-transaction resource-1))
        
        ;; PHASE 7: State mutations
        (map-set map-1 { id: id-1 } (update-resource resource-1))
        (map-set map-2 { id: id-2 } (update-resource resource-2))
        
        ;; PHASE 8: Return result
        (ok { result: "success", state: "updated" })
    )
)
```

## Monitoring and Debugging Patterns

### Adding Error Context

Include helpful information in error messages where possible:

```clarity
;; Instead of just ERR-NOT-FOUND
(unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)

;; Instead of just ERR-INVALID-INPUT
(asserts! (> (len description) u10) ERR-INVALID-STRING-LENGTH)
```

### Error Code Documentation

All errors should be documented in ERROR_CODES.md with:
- Error code number and meaning
- When it's raised
- How to fix it
- Example scenarios

## Common Pitfalls

### ❌ Modifying state before validation
```clarity
WRONG:
(map-set dataset { id: id } new-data)  ;; Change state
(asserts! (valid-data new-data) ERR-INVALID)  ;; Then validate
```

✅ Correct:
```clarity
(asserts! (valid-data new-data) ERR-INVALID)  ;; Validate first
(map-set dataset { id: id } new-data)  ;; Then change state
```

### ❌ Not checking active/inactive state
```clarity
WRONG:
(map-set dataset { id: id } (merge old { is-active: false }))
;; Someone calls this again without checking is-active first
```

✅ Correct:
```clarity
(asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
(map-set dataset { id: id } (merge dataset { is-active: false }))
```

### ❌ Ignoring try! failures
```clarity
WRONG:
(stx-transfer? amount sender recipient)  ;; Ignoring result
(map-set purchases...)  ;; Proceeds even if payment failed
```

✅ Correct:
```clarity
(try! (stx-transfer? amount sender recipient))  ;; Must succeed
(map-set purchases...)  ;; Only executes on success
```

## Testing Error Paths

Create tests for each error scenario:

```clarity
;; Test: Invalid amount
;;   call register-dataset with price=0
;;   expect ERR-INVALID-AMOUNT

;; Test: Dataset not found  
;;   call deactivate-dataset with non-existent data-id
;;   expect ERR-DATASET-NOT-FOUND

;; Test: Authorization failure
;;   call deactivate-dataset with different caller
;;   expect ERR-NOT-OWNER

;; Test: State conflict
;;   deactivate dataset
;;   call deactivate-dataset again
;;   expect ERR-INACTIVE-DATASET
```

## Guidelines for Error Recovery

1. **Fail fast**: Validate all inputs before state changes
2. **Be atomic**: Use `try!` for related operations
3. **Be idempotent**: Prevent duplicate operations
4. **Check state**: Verify resources exist and are in correct state
5. **Validate consistency**: Ensure related data remains consistent
6. **Document errors**: Use specific, descriptive error codes
7. **Test edges**: Test all error paths thoroughly

## Phase 6 Recovery Patterns

### ERR-PRICE-TOO-HIGH (u402) Recovery
- **Cause**: `price > MAX-PRICE (u1000000000000000)`
- **Recovery**: Reduce price to be within `[1, MAX-PRICE]` and retry

### ERR-ZERO-HASH (u408) Recovery
- **Cause**: `metadata-hash` is all zero bytes
- **Recovery**: Provide the actual SHA-256 hash of the dataset metadata

### ERR-ALREADY-VERIFIED (u446) Recovery
- **Cause**: Calling `verify-proof` on an already-verified proof
- **Recovery**: No action needed — proof is already verified. Check `is-verified` before calling `verify-proof`

### ERR-INSUFFICIENT-ACCESS-LEVEL (u621) in grant-access
- **Cause**: Requested grant level exceeds the dataset's configured access level
- **Recovery**: Either grant a lower level, or first use `update-dataset-price` to upgrade the dataset's own access level
