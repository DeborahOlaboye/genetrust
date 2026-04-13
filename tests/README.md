# Smart Contract Test Suite

Comprehensive testing framework for GeneTrust smart contracts with 80+ test cases covering unit tests, integration tests, and boundary conditions.

## Overview

This test suite provides complete coverage of the three core GeneTrust contracts:
- **genetic-data.clar** - Dataset registry and access control
- **attestations.clar** - Medical lab attestations and proof verification
- **exchange.clar** - Marketplace for genetic data listings and purchases

## Test Files

### Unit Tests
- [`genetic-data.unit.test.ts`](./genetic-data.unit.test.ts) - 50+ test cases for dataset operations
  - Register dataset validation and boundary tests
  - Grant/revoke access with authorization checks
  - Deactivate dataset functionality
  - All error codes for genetic-data contract

- [`attestations.unit.test.ts`](./attestations.unit.test.ts) - 40+ test cases for attestation operations
  - Verifier registration and deactivation
  - Proof registration with all proof types (1-4)
  - Hash validation (exactly 32 bytes)
  - Parameter and metadata size validation

- [`exchange.unit.test.ts`](./exchange.unit.test.ts) - 40+ test cases for marketplace operations
  - Listing creation with price and access level validation
  - Listing cancellation with authorization
  - Purchase operations and payment recording
  - Access level enforcement

### Integration Tests
- [`cross-contract.integration.test.ts`](./cross-contract.integration.test.ts) - Dataset → Exchange workflow
  - Dataset registration leading to marketplace listing
  - Buyer purchase and payment recording
  - Self-purchase prevention
  - Cancelled listing rejection
  - Access grant after purchase
  - Multiple buyer purchases on same listing

- [`attestations-proof.integration.test.ts`](./attestations-proof.integration.test.ts) - Verifier → Proof workflow
  - Verifier registration for proof verification
  - Proof verification with active/inactive verifier states
  - Multiple verifiers with distinct proofs
  - Invalid proof type and hash length rejection
  - All four proof types coverage

- [`data-governance.integration.test.ts`](./data-governance.integration.test.ts) - Access control workflows
  - Dataset lifecycle management (active → deactivated)
  - Access grant/revoke with ownership verification
  - Non-owner authorization prevention
  - Double-deactivation prevention
  - Access record fields validation (level, expiry)
  - Self-grant and self-revoke prevention

## Test Helpers & Utilities

### Fixtures
- [`test-fixtures.ts`](./test-fixtures.ts) - Mock data and test parameter generators
  - Mock principal addresses
  - 32-byte hash fixtures
  - Storage URL fixtures
  - Parameter generators for all contract operations
  - Boundary test data (min/max strings, numeric boundaries)
  - Error expectation mappings
  - Expected state patterns

### Utilities
- [`test-utils.ts`](./test-utils.ts) - Common test assertions and patterns
  - Clarity value assertions (Ok, Err, Some, None)
  - Contract call wrappers with validation
  - Numeric conversion utilities
  - State transition validators
  - Data validators (string lengths, access levels, hash formats)
  - Result extraction and type checking
  - Common test patterns (happy path, error, boundary)

### Helpers
- [`test-helpers.ts`](./test-helpers.ts) - Extended test utilities (from clarinet-sdk template)
  - State utils for state validation
  - Boundary utils for testing edge cases
  - Mock state generators
  - Transaction helper utilities
  - Coverage tracking

## Strategy Documentation

- [`TEST_STRATEGY.md`](./TEST_STRATEGY.md) - Comprehensive test strategy and framework design
  - Test categories and goals
  - Coverage tracking methodology
  - Test execution workflow
  - Cross-contract testing approach
  - Integration test patterns

- [`COVERAGE_REPORT.md`](./COVERAGE_REPORT.md) - Coverage tracking and metrics
  - Coverage goals (100% line, 95%+ branch)
  - Function coverage details for each contract
  - Error code coverage mapping
  - Integration test coverage matrix
  - Coverage thresholds by category
  - Known gaps and future improvements

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm run test tests/genetic-data.unit.test.ts
```

### Run unit tests only
```bash
npm run test tests/**/*.unit.test.ts
```

### Run integration tests only
```bash
npm run test tests/**/*.integration.test.ts
```

### Generate coverage report
```bash
npm run test:report
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Test Coverage

### By Contract
| Contract | Unit Tests | Integration | Coverage |
|----------|-----------|-------------|----------|
| genetic-data.clar | 50+ | 9+ | 100% line / 95% branch |
| attestations.clar | 40+ | 10+ | 100% line / 95% branch |
| exchange.clar | 40+ | 12+ | 100% line / 95% branch |
| **Total** | **130+** | **30+** | **Overall** |

### Error Codes Tested
- 32 distinct error codes covered
- 100% error code path coverage

### Functions Tested
- 20+ public functions
- All read-only accessors
- All state-changing operations

### Boundary Conditions
- Min/max string lengths
- Min/max numeric ranges
- Access level boundaries (1-3)
- Proof type boundaries (1-4)
- Zero and negative value rejection

## GitHub Actions CI/CD

Tests automatically run on:
- Push to main, develop, or issue branches
- Pull requests to main or develop
- Changes to contracts, tests, or configuration files

Coverage reports are:
- Generated automatically with each test run
- Uploaded to Codecov for tracking
- Posted as PR comments with metrics table

## Writing New Tests

### Test Structure
```typescript
describe('contract name - function name', () => {
  describe('Valid inputs', () => {
    it('should succeed with valid parameters', () => {
      // Arrange
      const params = generateTestParams();
      
      // Act
      const result = simnet.callPublicFn(
        'contract-name',
        'function-name',
        params,
        sender,
      );
      
      // Assert
      expect(result.result).toBeOk(expect.anything());
    });
  });

  describe('Invalid inputs', () => {
    it('should reject with error code 400', () => {
      // Arrange, Act, Assert
    });
  });

  describe('Boundary conditions', () => {
    it('should accept minimum value', () => {
      // Test minimum accepted value
    });

    it('should reject maximum+1', () => {
      // Test value just over maximum
    });
  });
});
```

### Using Test Fixtures
```typescript
import { generateDatasetParams, errorExpectations } from './test-fixtures';
import { stateValidators } from './test-utils';

// Use generator
const params = generateDatasetParams({
  price: 500000,
});

// Use error expectation
expect(result).toBeErr(
  Cl.uint(errorExpectations.invalidInput.code)
);

// Use validator
stateValidators.validateDatasetCreated(dataset);
```

## Best Practices

1. **Test Names** - Use descriptive names that explain what is being tested
2. **Arrange-Act-Assert** - Structure tests with clear setup, execution, and verification
3. **Isolation** - Each test should be independent and not rely on other tests
4. **Coverage** - Test both happy paths and error cases
5. **Boundary Testing** - Include min/max value tests
6. **Authorization** - Always test permission checks
7. **State Validation** - Verify state changes after operations
8. **Use Fixtures** - Leverage predefined test data for consistency

## Contributing Tests

When adding new tests:

1. Choose the appropriate test file (unit vs integration)
2. Use `test-fixtures.ts` for mock data
3. Use `test-utils.ts` for common assertions
4. Follow the test structure pattern
5. Ensure tests pass locally: `npm test`
6. Add new error codes to error expectations if needed
7. Update COVERAGE_REPORT.md with new coverage metrics

## Troubleshooting

### Tests fail to compile
- Check TypeScript syntax: `npm run check-types`
- Verify imports are correct
- Ensure clarity values are used with `Cl.` prefix

### Coverage report not generated
- Ensure tests completed successfully
- Check coverage output: `ls coverage/`
- Try: `npm run test:report`

### Tests timeout
- Increase timeout in vitest.config.js
- Reduce number of iterations in performance tests
- Check for infinite loops in test logic

## See Also

- [TEST_STRATEGY.md](./TEST_STRATEGY.md) - Test framework design
- [COVERAGE_REPORT.md](./COVERAGE_REPORT.md) - Coverage metrics
- [../../DEVELOPMENT.md](../../DEVELOPMENT.md) - Development guide
- [../../README.md](../../README.md) - Project overview
