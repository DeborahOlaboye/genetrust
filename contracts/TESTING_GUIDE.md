# Testing Guide for Error Handling and Validations

## Overview

This document provides a comprehensive testing strategy for all error codes and validation patterns in GeneTrust contracts, ensuring robust error handling across the system.

## Test Organization

### By Function
Create test suites for each public function:
- `register-dataset.test.ts`
- `grant-access.test.ts`
- `create-listing.test.ts`
- `purchase-listing.test.ts`
- etc.

### By Error Code
Alternative organization (cross-function):
- `error-401-invalid-input.test.ts`
- `error-410-not-authorized.test.ts`
- etc.

## Test Categories for Each Function

### 1. Valid Input Tests
Verify function succeeds with correct inputs.

```typescript
describe("register-dataset - Valid Inputs", () => {
    it("should register dataset with valid parameters", async () => {
        const tx = chain.txMapSet(
            "genetic-data", 
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),  // metadata-hash
                types.utf8("https://example.com/data"),  // storage-url
                types.utf8("DNA sequence dataset"),       // description
                types.uint(2),                           // access-level
                types.uint(1000000)                      // price
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].success).toEqual(true);
        expect(result.receipts[0].result).toContainEqual(types.ok(types.uint(1)));
    });
});
```

### 2. Invalid Input Tests
Verify function fails with specific error codes for each invalid input.

```typescript
describe("register-dataset - Invalid Inputs", () => {
    it("should reject hash with incorrect length", async () => {
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(16, 0x01)),  // WRONG: 16 bytes instead of 32
                types.utf8("https://example.com/data"),
                types.utf8("DNA sequence dataset"),
                types.uint(2),
                types.uint(1000000)
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].success).toEqual(false);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(403))); // ERR-INVALID-HASH
    });

    it("should reject empty storage URL", async () => {
        // Test with empty string
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),
                types.utf8(""),  // EMPTY: violates min length
                types.utf8("DNA sequence dataset"),
                types.uint(2),
                types.uint(1000000)
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(407))); // ERR-INVALID-STRING-LENGTH
    });

    it("should reject storage URL exceeding max length", async () => {
        const longUrl = "x".repeat(201);  // 201 chars > 200 max
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),
                types.utf8(longUrl),
                types.utf8("DNA sequence dataset"),
                types.uint(2),
                types.uint(1000000)
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(407))); // ERR-INVALID-STRING-LENGTH
    });

    it("should reject zero price", async () => {
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),
                types.utf8("https://example.com/data"),
                types.utf8("DNA sequence dataset"),
                types.uint(2),
                types.uint(0)  // INVALID: price must be > 0
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(401))); // ERR-INVALID-AMOUNT
    });

    it("should reject invalid access level", async () => {
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),
                types.utf8("https://example.com/data"),
                types.utf8("DNA sequence dataset"),
                types.uint(5),  // INVALID: must be 1-3
                types.uint(1000000)
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(406))); // ERR-INVALID-ACCESS-LEVEL
    });
});
```

### 3. Authorization Tests
Verify authorization checks work correctly.

```typescript
describe("deactivate-dataset - Authorization", () => {
    let datasetId: number;

    beforeEach(() => {
        // Register dataset with wallet1
        const registerTx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [/*...*/],
            wallet1.getAddress()
        );
        chain.processBlock([registerTx]);
        datasetId = 1;
    });

    it("should reject deactivation by non-owner", async () => {
        const tx = chain.txMapSet(
            "genetic-data",
            "deactivate-dataset",
            [types.uint(datasetId)],
            wallet2.getAddress()  // Different wallet
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(411))); // ERR-NOT-OWNER
    });

    it("should allow deactivation by owner", async () => {
        const tx = chain.txMapSet(
            "genetic-data",
            "deactivate-dataset",
            [types.uint(datasetId)],
            wallet1.getAddress()  // Same wallet
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].success).toEqual(true);
    });
});
```

### 4. Resource Not Found Tests
Verify proper handling of missing resources.

```typescript
describe("get-dataset - Not Found", () => {
    it("should return null for non-existent dataset", async () => {
        const tx = chain.txMapGet(
            "genetic-data",
            "get-dataset",
            [types.uint(9999)]  // Non-existent ID
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toEqual(types.none());
    });
});

describe("grant-access - Dataset Not Found", () => {
    it("should fail if dataset doesn't exist", async () => {
        const tx = chain.txMapSet(
            "genetic-data",
            "grant-access",
            [types.uint(9999), types.principal(user), types.uint(1)],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(431))); // ERR-DATASET-NOT-FOUND
    });
});
```

### 5. State Conflict Tests
Verify proper handling of state conflicts.

```typescript
describe("grant-access - Duplicate Prevention", () => {
    let datasetId: number;

    beforeEach(() => {
        // Register dataset and grant initial access
        // ... setup code ...
        datasetId = 1;
    });

    it("should prevent duplicate access grant", async () => {
        const user = wallet2.getAddress();
        
        // First grant should succeed
        const grant1 = chain.txMapSet(
            "genetic-data",
            "grant-access",
            [types.uint(datasetId), types.principal(user), types.uint(1)],
            wallet1.getAddress()
        );
        chain.processBlock([grant1]);
        
        // Second grant to same user should fail
        const grant2 = chain.txMapSet(
            "genetic-data",
            "grant-access",
            [types.uint(datasetId), types.principal(user), types.uint(2)],
            wallet1.getAddress()
        );
        const result = chain.processBlock([grant2]);
        
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(444))); // ERR-DUPLICATE-ACCESS-GRANT
    });
});
```

### 6. Idempotency Tests
Verify operations handle double-operations correctly.

```typescript
describe("deactivate-dataset - Idempotency", () => {
    it("should prevent double-deactivation", async () => {
        const datasetId = 1;
        
        // First deactivation should succeed
        const deactivate1 = chain.txMapSet(
            "genetic-data",
            "deactivate-dataset",
            [types.uint(datasetId)],
            wallet.getAddress()
        );
        chain.processBlock([deactivate1]);
        
        // Second deactivation should fail
        const deactivate2 = chain.txMapSet(
            "genetic-data",
            "deactivate-dataset",
            [types.uint(datasetId)],
            wallet.getAddress()
        );
        const result = chain.processBlock([deactivate2]);
        
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(450))); // ERR-INACTIVE-DATASET
    });
});
```

### 7. Boundary Tests
Verify edge cases and boundaries.

```typescript
describe("register-dataset - Boundaries", () => {
    it("should accept minimum valid description length", async () => {
        const minDescription = "x".repeat(10);  // Exactly 10 chars (minimum)
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),
                types.utf8("https://example.com/data"),
                types.utf8(minDescription),
                types.uint(2),
                types.uint(1000000)
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].success).toEqual(true);
    });

    it("should accept maximum valid description length", async () => {
        const maxDescription = "x".repeat(200);  // Exactly 200 chars (maximum)
        const tx = chain.txMapSet(
            "genetic-data",
            "register-dataset",
            [
                types.buffer(Buffer.alloc(32, 0x01)),
                types.utf8("https://example.com/data"),
                types.utf8(maxDescription),
                types.uint(2),
                types.uint(1000000)
            ],
            wallet.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].success).toEqual(true);
    });
});
```

### 8. Payment Safety Tests (for marketplace functions)
Verify payment operations fail safely.

```typescript
describe("purchase-listing - Payment Safety", () => {
    it("should prevent owner from purchasing own listing", async () => {
        const listingId = 1;
        const owner = wallet1.getAddress();
        
        const tx = chain.txMapSet(
            "exchange",
            "purchase-listing",
            [types.uint(listingId), types.uint(1)],
            owner  // Owner trying to purchase own listing
        );
        
        const result = chain.processBlock([tx]);
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(400))); // ERR-INVALID-INPUT
    });

    it("should enforce access level constraints", async () => {
        const listingId = 1;
        
        const tx = chain.txMapSet(
            "exchange",
            "purchase-listing",
            [types.uint(listingId), types.uint(3)],  // Requesting level 3
            buyer.getAddress()
        );
        
        const result = chain.processBlock([tx]);
        // If listing only offers level 1, should fail
        expect(result.receipts[0].result).toContainEqual(types.err(types.uint(621))); // ERR-INSUFFICIENT-ACCESS-LEVEL
    });
});
```

## Test Checklist

### For Every Public Function

- [ ] Test with all valid parameter combinations
- [ ] Test with each invalid parameter value
- [ ] Test with authorization failures (wrong caller)
- [ ] Test with missing resources (not found)
- [ ] Test with state conflicts
- [ ] Test boundary conditions (min/max values)
- [ ] Test double-operations (idempotency)
- [ ] Test side effects (state changes)
- [ ] Document expected error codes

### For Every Error Code

- [ ] Test that error is raised with correct code
- [ ] Test that function fails (no state change)
- [ ] Document error scenario
- [ ] Add recovery recommendation

## Coverage Goals

- 100% line coverage
- 100% error path coverage
- 95%+ branch coverage
- All error codes tested

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test register-dataset.test.ts

# Run with coverage
npm test -- --coverage

# Run specific error code tests
npm test error-410
```

## Continuous Quality

- Run tests on every commit (pre-commit hook)
- Run tests in CI/CD pipeline
- Maintain coverage above 95%
- Review coverage reports weekly
- Add tests for any new error codes

## Phase 6 Test Cases (Input Validation Hardening)

Run phase 6 specific tests with:
```bash
npm test -- --reporter=verbose genetic-data.unit
npm test -- --reporter=verbose exchange.unit
npm test -- --reporter=verbose attestations.unit
npm test -- --reporter=verbose data-governance
npm test -- --reporter=verbose access-control-edge-cases
```

### Critical Test Scenarios to Verify

| Scenario | Expected Error | Contract |
|---|---|---|
| `price > MAX-PRICE` | `u402 ERR-PRICE-TOO-HIGH` | genetic-data, exchange |
| `metadata-hash == 0x00...00` | `u408 ERR-ZERO-HASH` | genetic-data |
| `storage-url.length < 5` | `u407 ERR-INVALID-STRING-LENGTH` | genetic-data |
| `grant-access level > dataset level` | `u621 ERR-INSUFFICIENT-ACCESS-LEVEL` | genetic-data |
| `grant-access to contract address` | `u400 ERR-INVALID-INPUT` | genetic-data |
| `verify-proof on already-verified` | `u446 ERR-ALREADY-VERIFIED` | attestations |
| `transfer-dataset-ownership to self` | `u400 ERR-INVALID-INPUT` | genetic-data |
| `reactivate an active dataset` | `u440 ERR-ALREADY-EXISTS` | genetic-data |
