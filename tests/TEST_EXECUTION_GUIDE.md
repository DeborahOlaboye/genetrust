# Test Execution Guide

Comprehensive guide for running, debugging, and managing the GeneTrust smart contract test suite.

## Quick Start

### First Time Setup
```bash
# Install dependencies
npm install

# Verify contracts compile
npm run check:contracts

# Run all tests
npm test
```

### Running Tests
```bash
# Run all tests with coverage
npm test

# Run specific test file
npm test tests/genetic-data.unit.test.ts

# Run tests matching pattern
npm test -- --grep="Error Cases"

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage
```

## Test File Organization

### Unit Tests (Fast, Isolated)
- **`genetic-data.unit.test.ts`** (50+ tests)
  - Dataset registration and parameter validation
  - Access control operations
  - Dataset lifecycle (active/inactive states)
  - All 9 error codes for genetic-data contract

- **`attestations.unit.test.ts`** (40+ tests)
  - Verifier registration and deactivation
  - Proof registration with all types (1-4)
  - Hash and parameter validation
  - All 5 error codes for attestations contract

- **`exchange.unit.test.ts`** (40+ tests)
  - Listing creation and cancellation
  - Purchase operations and payment recording
  - Authorization and duplicate prevention
  - All 6 error codes for exchange contract

### Integration Tests (Moderate, Cross-Contract)
- **`cross-contract.integration.test.ts`** (8+ tests)
  - Register dataset → Create listing → Purchase → Get access flow
  - Multiple buyer scenarios
  - Transaction ordering and state consistency

- **`attestations-proof.integration.test.ts`** (10+ tests)
  - Verifier registration → Proof creation → Verification flow
  - All proof types (1-4) validation
  - Verifier state transitions and access control

- **`data-governance.integration.test.ts`** (14+ tests)
  - Complete access control lifecycle
  - Grant, use, revoke, deactivate workflows
  - State consistency across operations

### Comprehensive Coverage Tests
- **`error-scenarios.test.ts`** (25+ tests)
  - All error codes and error paths
  - Authorization rejection patterns
  - Invalid input handling

- **`access-control-edge-cases.test.ts`** (25+ tests)
  - Authorization boundary conditions
  - Self-operation prevention
  - Duplicate operation prevention
  - Access level validation

- **`multi-contract-workflows.test.ts`** (20+ tests)
  - End-to-end marketplace workflows
  - Multi-resource scenarios
  - Concurrent operation patterns
  - Deactivation lifecycle management

- **`boundary-performance.test.ts`** (35+ tests)
  - String length boundaries
  - Hash format validation
  - Numeric boundaries (prices, expiry)
  - Resource ID handling
  - Performance patterns

- **`state-consistency.test.ts`** (20+ tests)
  - State transitions and consistency
  - Data integrity validation
  - Cross-contract consistency
  - Removal and cleanup operations

## Running Specific Test Categories

### Run Only Unit Tests
```bash
npm test tests/*.unit.test.ts
```

### Run Only Integration Tests
```bash
npm test tests/*.integration.test.ts
```

### Run Only Error Tests
```bash
npm test tests/error-scenarios.test.ts
```

### Run Only Boundary Tests
```bash
npm test tests/boundary-performance.test.ts
```

### Run Only State Consistency Tests
```bash
npm test tests/state-consistency.test.ts
```

## Coverage Reports

### Generate Coverage Report
```bash
npm run test:coverage
```

### View Coverage Locally
```bash
# Generate HTML report
npm run test:coverage

# Open in browser
open coverage/index.html
```

### Coverage Goals by Module
| Module | Line | Branch | Functions | Statements |
|--------|------|--------|-----------|-----------|
| genetic-data | 100% | 95% | 100% | 100% |
| attestations | 100% | 95% | 100% | 100% |
| exchange | 100% | 95% | 100% | 100% |
| data-governance | 100% | 95% | 100% | 100% |

## Debugging Tests

### Run Single Test with Debug Output
```bash
npm test -- --reporter=verbose tests/genetic-data.unit.test.ts
```

### Run with Detailed Error Information
```bash
npm test -- --reporter=detailed
```

### Enable Test Timeout for Long-Running Tests
```bash
npm test -- --testTimeout=10000
```

### Skip Tests Temporarily
```typescript
// In test file
it.skip('should be skipped', () => {
  // test code
});
```

### Run Only Specific Tests
```typescript
// In test file
it.only('should run only this test', () => {
  // test code
});
```

## Common Issues and Solutions

### Tests Failing with "Contract not found"
- Ensure `Clarinet.toml` deployment configuration is correct
- Verify contracts are properly deployed to simnet
- Check contract names match exactly (case-sensitive)

### Hash Validation Errors
- Hash must be exactly 32 bytes (64 hex characters + '0x' prefix = 66 chars)
- Use `Buffer.from('xx'.repeat(32), 'hex')` for valid test hashes
- Verify no leading zeros are missing

### "Resource not found" Errors
- Check that resource ID exists before accessing
- Common issue: Dataset ID 0 (first ID is 1)
- For non-existent resources, expect error code 404

### Type Mismatch in Assertions
- Use `Cl.uint()` for uint values
- Use `Cl.stringAscii()` for strings
- Use `Cl.principal()` for principal addresses
- Use `Cl.buffer()` for byte buffers

### Performance/Timeout Issues
- Increase timeout: `npm test -- --testTimeout=30000`
- Reduce number of iterations in performance tests
- Check for infinite loops in test setup

## Test Data and Fixtures

### Using Test Fixtures
```typescript
import { generateDatasetParams, MOCK_WALLET_1 } from './test-fixtures';

// Generate parameters
const params = generateDatasetParams({
  name: 'Custom Name',
  owner: MOCK_WALLET_1,
});
```

### Common Mock Values
```typescript
import {
  MOCK_WALLET_1,    // Principal 1
  MOCK_WALLET_2,    // Principal 2
  MOCK_WALLET_3,    // Principal 3
  MOCK_DEPLOYER,    // Deployer principal
  VALID_HASH_32,    // Valid 32-byte hash
  INVALID_HASH,     // Invalid hash for testing
} from './test-fixtures';
```

## Writing New Tests

### Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

describe('Feature Name', () => {
  let simnet: any;

  beforeEach(() => {
    simnet = initSimnet();
  });

  describe('Valid scenarios', () => {
    it('should do something correctly', () => {
      // Arrange - setup test data
      const result = simnet.callPublicFn(
        'contract-name',
        'function-name',
        [/* args */],
        caller
      );

      // Assert
      expect(result.result).toBeOk(expect.anything());
    });
  });

  describe('Error scenarios', () => {
    it('should reject invalid input', () => {
      const result = simnet.callPublicFn(
        'contract-name',
        'function-name',
        [/* invalid args */],
        caller
      );

      expect(result.result).toBeErr(Cl.uint(ERROR_CODE));
    });
  });
});
```

### Best Practices
1. Use descriptive test names
2. Follow Arrange-Act-Assert pattern
3. Group related tests with describe blocks
4. Use fixtures for consistency
5. Test both success and failure cases
6. Include boundary value tests
7. Verify state changes after operations
8. Always test authorization checks

## Continuous Integration

### GitHub Actions Workflow
Tests run automatically on:
- Push to `main`, `develop`, or feature branches
- Pull requests to `main` or `develop`
- Manual trigger via GitHub UI

### Pre-Commit Checks
```bash
# Run before committing
npm test && npm run check:contracts
```

### Coverage Tracking
- Coverage reports uploaded to Codecov
- PR comments show coverage metrics
- Failed builds prevent merging

## Performance Benchmarking

### Run Performance Tests
```bash
npm test tests/boundary-performance.test.ts
```

### Generate Performance Report
```bash
npm test -- --reporter=benchmark
```

### Benchmarking Guidelines
- Test with realistic data sizes
- Run multiple iterations for averaging
- Monitor memory usage
- Check gas costs where applicable

## Test Suite Metrics

### Current Coverage
- **Total Tests**: 200+
- **Unit Tests**: 130+
- **Integration Tests**: 30+
- **Edge Case Tests**: 40+
- **Error Code Coverage**: 32/32 (100%)
- **Function Coverage**: 20+ functions
- **Line Coverage**: 95%+
- **Branch Coverage**: 90%+

### Recent Improvements
- Added comprehensive error scenario testing
- Extended boundary condition coverage
- Improved access control testing
- Added state consistency validation
- Enhanced multi-contract workflows

## Contributing to the Test Suite

### Adding a New Test
1. Choose appropriate test file or create new one
2. Follow test template structure
3. Use existing fixtures and utilities
4. Run tests locally before committing
5. Ensure all tests pass: `npm test`
6. Update COVERAGE_REPORT.md if adding new coverage

### Test Review Checklist
- [ ] Test name clearly describes what is tested
- [ ] Follows Arrange-Act-Assert pattern
- [ ] Uses appropriate error code assertions
- [ ] Includes boundary value tests
- [ ] Tests both success and failure paths
- [ ] Uses test fixtures for mock data
- [ ] Verifies state after operations
- [ ] Includes authorization checks where applicable
- [ ] All tests pass locally
- [ ] Coverage increased or maintained

## Support and Resources

- **Test Strategy**: [TEST_STRATEGY.md](./TEST_STRATEGY.md)
- **Coverage Report**: [COVERAGE_REPORT.md](./COVERAGE_REPORT.md)
- **Test Utilities**: [test-utils.ts](./test-utils.ts)
- **Test Fixtures**: [test-fixtures.ts](./test-fixtures.ts)
- **Test Helpers**: [test-helpers.ts](./test-helpers.ts)

## Useful Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test tests/error-scenarios.test.ts

# Run tests matching pattern
npm test -- --grep="authorization"

# Check TypeScript
npm run check:types

# Check contracts
npm run check:contracts

# Full validation suite
npm test && npm run check:contracts && npm run check:types
```
