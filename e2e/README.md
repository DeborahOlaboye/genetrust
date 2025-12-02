# E2E Tests

This directory contains end-to-end tests for the GeneTrust application using Playwright.

## Directory Structure

```
e2e/
├── 01-landing-page.spec.js       # Tests for landing page
├── 02-wallet-connection.spec.js  # Tests for wallet authentication
├── 03-dataset-creation.spec.js   # Tests for dataset creation flow
├── 04-marketplace.spec.js        # Tests for marketplace functionality
├── helpers/                      # Helper functions and utilities
│   ├── wallet-helpers.js         # Wallet interaction helpers
│   └── test-data.js              # Test data and fixtures
└── README.md                     # This file
```

## Test Files

### 01-landing-page.spec.js
Tests the main landing page functionality:
- Page loads and renders correctly
- 3D DNA visualization appears
- Navigation elements are present
- Wallet connection button is visible
- Mobile responsiveness

### 02-wallet-connection.spec.js
Tests wallet authentication and connection flow:
- Connect/disconnect wallet functionality
- Wallet state persistence
- Address display
- Error handling

### 03-dataset-creation.spec.js
Tests the data provider workflow:
- Dataset creation form
- Form validation
- Dataset listing display
- Error handling

### 04-marketplace.spec.js
Tests marketplace functionality:
- Listing creation (provider side)
- Marketplace browsing (researcher side)
- Filtering and search
- Purchase flow
- Error handling

## Helper Modules

### helpers/wallet-helpers.js
Utility functions for wallet interactions:
- `mockWalletConnection()` - Mock wallet connection for testing
- `clearWalletConnection()` - Clear wallet state
- `waitForWalletUI()` - Wait for wallet UI elements
- `isWalletConnected()` - Check wallet connection status

### helpers/test-data.js
Test data and fixtures:
- `TEST_WALLET_ADDRESSES` - Predefined wallet addresses
- `TEST_DATASET` - Sample dataset configuration
- `TEST_LISTING` - Sample marketplace listing
- `ACCESS_LEVELS` - Access level constants
- `ROUTES` - Application routes
- `generateMockGeneticData()` - Generate mock genetic data

## Running Tests

See the main [E2E Testing Documentation](../E2E_TESTING.md) for comprehensive instructions.

Quick commands:
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/01-landing-page.spec.js

# Run in headed mode (watch tests execute)
npm run test:e2e:headed
```

## Writing New Tests

When adding new E2E tests:

1. **Name tests sequentially:** Use the pattern `XX-feature-name.spec.js`
2. **Use helpers:** Leverage existing helper functions from `helpers/`
3. **Follow patterns:** Review existing tests for consistent patterns
4. **Add test data:** Add new fixtures to `helpers/test-data.js`
5. **Document tests:** Add descriptions to test blocks
6. **Test critical paths:** Focus on user-facing functionality

Example test structure:
```javascript
import { test, expect } from '@playwright/test';
import { mockWalletConnection } from './helpers/wallet-helpers.js';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test code
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

## Best Practices

1. **Independent tests:** Each test should be able to run independently
2. **Clean state:** Use `beforeEach` to ensure clean state
3. **Mock external services:** Use mock data instead of real API calls
4. **Descriptive names:** Use clear, descriptive test names
5. **Proper assertions:** Use appropriate Playwright assertions
6. **Error handling:** Test both success and error scenarios

## Debugging

```bash
# Debug specific test
npx playwright test e2e/01-landing-page.spec.js --debug

# Run with verbose logging
DEBUG=pw:api npx playwright test

# Slow down execution
npx playwright test --headed --slow-mo=1000
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Main E2E Testing Documentation](../E2E_TESTING.md)
