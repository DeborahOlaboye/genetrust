# Test Coverage Configuration
# Comprehensive coverage tracking and reporting for GeneTrust smart contracts

## Coverage Goals

- **Line Coverage**: 100%
- **Branch Coverage**: 95%+
- **Function Coverage**: 100%
- **Error Code Coverage**: 100%
- **State Change Coverage**: 100%

## Test Categories Coverage

### genetic-data.clar Coverage

**Functions**:
- `register-dataset`: ✓ Complete coverage (16 unit tests)
- `grant-access`: ✓ Complete coverage (16 unit tests)
- `revoke-access`: ✓ Complete coverage (8 unit tests)
- `deactivate-dataset`: ✓ Complete coverage (8 unit tests)
- `get-dataset`: ✓ Read-only accessor
- `get-access`: ✓ Read-only accessor
- `has-valid-access`: ✓ Read-only accessor
- `get-next-data-id`: ✓ Read-only accessor

**Error Codes** (12 total):
- 400 (ERR-INVALID-INPUT): ✓ Tested
- 401 (ERR-INVALID-AMOUNT): ✓ Tested
- 403 (ERR-INVALID-HASH): ✓ Tested
- 406 (ERR-INVALID-ACCESS-LEVEL): ✓ Tested
- 407 (ERR-INVALID-STRING-LENGTH): ✓ Tested
- 410 (ERR-NOT-AUTHORIZED): ✓ Tested
- 411 (ERR-NOT-OWNER): ✓ Tested
- 430 (ERR-NOT-FOUND): ✓ Tested
- 431 (ERR-DATASET-NOT-FOUND): ✓ Tested
- 436 (ERR-ACCESS-RIGHT-NOT-FOUND): ✓ Tested
- 450 (ERR-INACTIVE-DATASET): ✓ Tested
- 610 (ERR-SELF-GRANT-NOT-ALLOWED): ✓ Tested

### attestations.clar Coverage

**Functions**:
- `register-verifier`: ✓ Complete coverage (5 unit + 3 integration tests)
- `deactivate-verifier`: ✓ Complete coverage (2 unit + 2 integration tests)
- `register-proof`: ✓ Complete coverage (5 unit + 2 integration tests)
- `verify-proof`: ✓ Integration coverage (multiple scenarios)
- `set-contract-owner`: ✓ Authorization testing
- `get-proof`: ✓ Read-only accessor
- `get-verifier`: ✓ Read-only accessor
- `is-verified`: ✓ Read-only accessor

**Error Codes** (9 total):
- 400 (ERR-INVALID-INPUT): ✓ Tested
- 403 (ERR-INVALID-HASH): ✓ Tested
- 405 (ERR-INVALID-PROOF-TYPE): ✓ Tested
- 407 (ERR-INVALID-STRING-LENGTH): ✓ Tested
- 408 (ERR-INVALID-BUFFER-SIZE): ✓ Tested
- 409 (ERR-INVALID-PARAMETERS): ✓ Tested
- 413 (ERR-NOT-CONTRACT-OWNER): ✓ Tested
- 434 (ERR-VERIFIER-NOT-FOUND): ✓ Tested
- 503 (ERR-VERIFIER-INACTIVE): ✓ Tested

### exchange.clar Coverage

**Functions**:
- `create-listing`: ✓ Complete coverage (7 unit + 2 integration tests)
- `cancel-listing`: ✓ Complete coverage (4 unit + 1 integration test)
- `purchase-listing`: ✓ Complete coverage (7 unit + 3 integration tests)
- `get-listing`: ✓ Read-only accessor
- `get-purchase`: ✓ Read-only accessor
- `get-next-listing-id`: ✓ Read-only accessor

**Error Codes** (11 total):
- 400 (ERR-INVALID-INPUT): ✓ Tested
- 401 (ERR-INVALID-AMOUNT): ✓ Tested
- 406 (ERR-INVALID-ACCESS-LEVEL): ✓ Tested
- 407 (ERR-INVALID-STRING-LENGTH): ✓ Tested
- 410 (ERR-NOT-AUTHORIZED): ✓ Tested
- 411 (ERR-NOT-OWNER): ✓ Tested
- 430 (ERR-NOT-FOUND): ✓ Tested
- 432 (ERR-LISTING-NOT-FOUND): ✓ Tested
- 621 (ERR-INSUFFICIENT-ACCESS-LEVEL): ✓ Tested
- 620 (ERR-PRICE-MISMATCH): ✓ Tested
- 500 (ERR-PAYMENT-FAILED): ✓ Setup for payment testing

## Integration Test Coverage

### Cross-Contract Workflows
- Dataset registration → Marketplace listing → Purchase → Access grant: ✓
- Verifier registration → Proof submission → Proof verification: ✓
- Multiple buyers purchasing same listing: ✓
- Access level enforcement in purchases: ✓

### Boundary Conditions
- Minimum string lengths (1, 10 chars): ✓
- Maximum string lengths (64, 200, 256 bytes): ✓
- String lengths one char/byte over/under limits: ✓
- Valid numeric ranges (1-3 for access levels, 1-4 for proof types): ✓
- Boundary values for uint amounts: ✓

### Authorization & Access Control
- Non-owner operations rejected: ✓
- Self-grant/self-purchase prevention: ✓
- Active/inactive state validation: ✓
- Contract owner verification: ✓
- Caller verification for verifier operations: ✓

## Running Coverage Reports

```bash
# Generate coverage report with line and branch coverage
npm run test:report

# Run tests with coverage for specific contract
npm run test -- -- --coverage tests/genetic-data.unit.test.ts

# Generate HTML coverage report
npm run test:report && open coverage/index.html
```

## Coverage Thresholds

### By Contract
- genetic-data.clar: 100% line / 95% branch
- attestations.clar: 100% line / 95% branch
- exchange.clar: 100% line / 95% branch

### By Category
- Input validation: 100% line / 95% branch
- Authorization: 100% line / 100% branch
- State changes: 100% line / 95% branch
- Read-only operations: 100% line / 100% branch
- Error handling: 100% line / 100% branch

## Test Execution Order

1. Unit tests (isolated contract functions)
2. Integration tests (cross-contract workflows)
3. Boundary tests (edge cases and limits)
4. Coverage analysis and reporting

## Phase 6 Input Validation Coverage (Issue 1)

The following error codes were added and are fully covered by the new test suites
(`phase6-validation-matrix.test.ts`, `access-control-edge-cases.test.ts`, and per-contract unit/integration tests):

| Code | Constant | Contract | Trigger | Covered |
|------|----------|----------|---------|---------|
| u401 | ERR-INVALID-AMOUNT | dataset-registry | price = 0 | ✓ |
| u402 | ERR-PRICE-TOO-HIGH | dataset-registry, exchange | price > MAX-PRICE | ✓ |
| u404 | ERR-INVALID-STRING-LENGTH | dataset-registry | URL < MIN-URL-LENGTH or > 200 | ✓ |
| u408 | ERR-ZERO-HASH | dataset-registry | hash = 0x000...000 | ✓ |
| u413 | ERR-NOT-CONTRACT-OWNER | dataset-registry, exchange | non-owner calls set-contract-owner | ✓ |
| u446 | ERR-ALREADY-VERIFIED | attestations | re-verifying a verified proof | ✓ |
| u447 | ERR-DUPLICATE-VERIFIER-ADDRESS | attestations | duplicate verifier address | ✓ |
| u621 | ERR-INSUFFICIENT-ACCESS-LEVEL | dataset-registry | grant level > dataset level | ✓ |

**Boundary assertions confirmed:**
- `MAX-PRICE = u1_000_000_000_000_000` — accepted at boundary, rejected one unit above
- `MIN-URL-LENGTH = u5` — 4-char URL rejected, 5-char URL accepted
- Zero-hash (all 32 bytes = 0x00) rejected; any non-zero hash accepted
- `is-eq user (as-contract tx-sender)` guard prevents contract-address grants

## Coverage Metrics

**Total Test Cases**: 180+
- Unit tests: 90+ (genetic-data, attestations, exchange, data-governance)
- Integration tests: 30+ (cross-contract, attestations-proof, phase6-matrix)
- Boundary tests: 40+ (string lengths, numeric ranges, zero-values, max values)
- Edge case tests: 20+ (access-control-edge-cases, error-scenarios)

**Total Error Codes Covered**: 40+
**Total Functions Tested**: 46
**Total State Transitions**: 55+

## Known Coverage Gaps

- Payment execution (requires mock STX transfers in test harness)
- Bitcoin integration (requires separate subnet tests)
- IPFS storage (requires mock integration)

## Future Coverage improvements

1. E2E tests with frontend integration
2. Performance benchmarking tests
3. Gas cost analysis tests
4. Contract upgrade scenarios
5. Multi-contract state consistency
