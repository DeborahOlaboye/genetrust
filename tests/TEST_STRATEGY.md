# Test Strategy and Framework

## Testing Goals

- 100% line coverage
- 100% error code coverage
- 95%+ branch coverage
- Test all edge cases and boundary conditions
- Ensure no security vulnerabilities
- Verify error recovery mechanisms
- Validate cross-contract interactions

## Test Categories

### 1. Unit Tests - genetic-data.clar

#### register-dataset
- ✓ Valid registration with all parameters
- ✓ Valid registration with various access levels (1, 2, 3)
- ✓ Valid registration with different price points
- ✗ Invalid: empty metadata hash
- ✗ Invalid: empty storage URL
- ✗ Invalid: empty description
- ✗ Invalid: description too short (< 10 chars)
- ✗ Invalid: description too long (> 200 chars)
- ✗ Invalid: storage URL too long (> 200 chars)
- ✗ Invalid: price = 0
- ✗ Invalid: access-level = 0
- ✗ Invalid: access-level = 4
- ✗ Error: ERR-INVALID-HASH
- ✗ Error: ERR-INVALID-STRING-LENGTH
- ✗ Error: ERR-INVALID-AMOUNT
- ✗ Error: ERR-INVALID-ACCESS-LEVEL

#### grant-access
- ✓ Owner grants access to valid user
- ✓ Multiple grant levels (1, 2, 3)
- ✓ Grant with different data-id values
- ✗ Invalid: data-id = 0
- ✗ Invalid: grant to self
- ✗ Invalid: non-owner caller
- ✗ Invalid: access-level = 0
- ✗ Invalid: access-level = 4
- ✗ Error: ERR-DATASET-NOT-FOUND
- ✗ Error: ERR-SELF-GRANT-NOT-ALLOWED
- ✗ Error: ERR-NOT-OWNER
- ✗ Error: ERR-INACTIVE-DATASET
- ✗ Error: ERR-DUPLICATE-ACCESS-GRANT
- ✗ Boundary: max datasets with access granted

#### revoke-access
- ✓ Owner revokes existing access
- ✓ Revoke multiple users
- ✗ Invalid: data-id = 0
- ✗ Invalid: revoke self
- ✗ Invalid: non-owner caller
- ✗ Error: ERR-DATASET-NOT-FOUND
- ✗ Error: ERR-ACCESS-RIGHT-NOT-FOUND
- ✗ Error: ERR-NOT-OWNER
- ✗ Error: ERR-CANNOT-REVOKE-OWN-ACCESS

#### deactivate-dataset
- ✓ Owner deactivates active dataset
- ✓ Deactivate multiple datasets
- ✗ Invalid: data-id = 0
- ✗ Invalid: non-owner caller
- ✗ Error: ERR-DATASET-NOT-FOUND
- ✗ Error: ERR-NOT-OWNER
- ✗ Error: ERR-INACTIVE-DATASET (double deactivate)

#### has-valid-access (read-only)
- ✓ Valid access returns true
- ✓ Expired access returns false
- ✓ Non-existent access returns false

### 2. Unit Tests - attestations.clar

#### register-verifier
- ✓ Admin registers verifier
- ✓ Register multiple verifiers
- ✗ Invalid: non-admin caller
- ✗ Invalid: empty verifier name
- ✗ Invalid: verifier name too long (> 64 chars)
- ✗ Invalid: contract as verifier address
- ✗ Error: ERR-NOT-CONTRACT-OWNER
- ✗ Error: ERR-INVALID-STRING-LENGTH
- ✗ Error: ERR-INVALID-PARAMETERS

#### deactivate-verifier
- ✓ Admin deactivates verifier
- ✓ Deactivate multiple verifiers
- ✗ Invalid: non-admin caller
- ✗ Invalid: verifier-id = 0
- ✗ Error: ERR-VERIFIER-NOT-FOUND
- ✗ Error: ERR-NOT-CONTRACT-OWNER
- ✗ Error: ERR-VERIFIER-INACTIVE (double deactivate)

#### register-proof
- ✓ Valid proof registration
- ✓ All proof types (1-4)
- ✓ Various parameter sizes
- ✗ Invalid: data-id = 0
- ✗ Invalid: proof-type = 0
- ✗ Invalid: proof-type = 5
- ✗ Invalid: hash wrong length
- ✗ Invalid: empty parameters
- ✗ Invalid: metadata too long (> 200 chars)
- ✗ Error: ERR-INVALID-INPUT
- ✗ Error: ERR-INVALID-PROOF-TYPE
- ✗ Error: ERR-INVALID-HASH
- ✗ Error: ERR-INVALID-BUFFER-SIZE
- ✗ Error: ERR-INVALID-STRING-LENGTH

### 3. Unit Tests - exchange.clar

#### create-listing
- ✓ Create listing with valid parameters
- ✓ Various access levels (1-3)
- ✓ Different price points
- ✓ Valid descriptions
- ✗ Invalid: data-id = 0
- ✗ Invalid: price = 0
- ✗ Invalid: access-level = 0
- ✗ Invalid: access-level = 4
- ✗ Invalid: description too short
- ✗ Invalid: description too long
- ✗ Error: ERR-INVALID-INPUT
- ✗ Error: ERR-INVALID-AMOUNT
- ✗ Error: ERR-INVALID-ACCESS-LEVEL
- ✗ Error: ERR-INVALID-STRING-LENGTH

#### cancel-listing
- ✓ Owner cancels active listing
- ✓ Cancel multiple listings
- ✗ Invalid: listing-id = 0
- ✗ Invalid: non-owner caller
- ✗ Error: ERR-LISTING-NOT-FOUND
- ✗ Error: ERR-NOT-OWNER
- ✗ Error: ERR-NOT-FOUND (double cancel)

#### purchase-listing
- ✓ Valid purchase by non-owner
- ✓ Purchase with various access levels
- ✓ Purchase with different price points
- ✗ Invalid: listing-id = 0
- ✗ Invalid: owner purchases own listing
- ✗ Invalid: access-level = 0
- ✗ Invalid: access-level exceeds listing level
- ✗ Error: ERR-LISTING-NOT-FOUND
- ✗ Error: ERR-NOT-FOUND (inactive listing)
- ✗ Error: ERR-INVALID-ACCESS-LEVEL
- ✗ Error: ERR-INSUFFICIENT-ACCESS-LEVEL
- ✗ Error: ERR-PAYMENT-FAILED

### 4. Integration Tests

#### Cross-Contract Flow
- Dataset created → Access granted → Proof registered → Listing created → Purchase made
- Verify data consistency across contracts
- Test state transitions

#### Authorization Chain
- Verify access levels respected through system
- Test cascading permission revocations
- Verify payment flow completeness

#### Error Propagation
- Errors bubble up correctly from contract calls
- Specific error codes preserved
- try! macro catches external failures

### 5. E2E Tests (if using playwright)

#### Critical User Workflows
1. User registers dataset
   - Fill form with valid data
   - Submit registration
   - Verify dataset appears in list

2. User grants data access
   - Select dataset
   - Specify access level
   - Grant to another user
   - Verify access granted

3. User lists dataset for sale
   - Create marketplace listing
   - Set pricing
   - Verify listing visible

4. User purchases access
   - Browse listings
   - Select access level
   - Complete purchase
   - Verify access granted

5. Admin manages verifiers
   - Register new verifier
   - Verify can register proofs
   - Deactivate verifier
   - Verify proofs rejected

## Test Execution Workflow

```
Unit Tests (genetic-data)
    ↓
Unit Tests (attestations)
    ↓
Unit Tests (exchange)
    ↓
Integration Tests
    ↓
E2E Tests
    ↓
Coverage Report Generation
    ↓
Coverage Analysis
```

## Coverage Targets

| Category | Target |
|----------|--------|
| Line Coverage | 100% |
| Branch Coverage | 95%+ |
| Function Coverage | 100% |
| Error Code Coverage | 100% |
| Statement Coverage | 100% |

## Tools & Setup

### Unit Testing
- Clarinet test framework (built-in)
- Test files: `tests/*.test.ts`
- Run: `clarinet test`

### Coverage Reporting
- Clarinet coverage (built-in)
- Report: HTML + JSON
- Output: `coverage/`

### E2E Testing
- Playwright (if frontend testing needed)
- Test files: `e2e/*.spec.js`
- Run: `npm run test:e2e`

## Test File Structure

```
tests/
  ├── genetic-data.test.ts
  ├── attestations.test.ts
  ├── exchange.test.ts
  ├── integration.test.ts
  └── README.md (this file)
```

## Running Tests

```bash
# Unit tests only
clarinet test

# With coverage
clarinet test --coverage

# Specific test file
clarinet test tests/genetic-data.test.ts

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Continuous Integration

All tests run on:
- Pull requests
- Commits to main
- Pre-deployment

Requirements:
- 100% line coverage maintained
- All tests passing
- No security warnings
- No performance regressions

## Next Steps

1. Create unit test files for each contract
2. Implement tests for all functions
3. Set up coverage reporting
4. Document test patterns
5. Create GitHub Actions CI workflow
