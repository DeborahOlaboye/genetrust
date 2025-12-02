# E2E Testing Documentation

## Overview

This document provides comprehensive instructions for running end-to-end (E2E) tests for the GeneTrust application. The E2E tests validate critical user flows to ensure the application works as expected across different browsers and devices.

## Framework

We use **Playwright** as our E2E testing framework. Playwright provides:
- Cross-browser testing (Chromium, Firefox, WebKit)
- Mobile device emulation
- Automatic waiting and intelligent test execution
- Rich debugging capabilities
- Screenshot and video capture on failures

## Prerequisites

Before running E2E tests, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** (v9 or higher)
3. All project dependencies installed:
   ```bash
   npm install
   ```

4. Playwright browsers installed:
   ```bash
   npx playwright install
   ```

## Test Structure

```
genetrust/
├── e2e/                          # E2E test directory
│   ├── 01-landing-page.spec.js   # Landing page tests
│   ├── 02-wallet-connection.spec.js # Wallet authentication tests
│   ├── 03-dataset-creation.spec.js  # Dataset creation tests
│   ├── 04-marketplace.spec.js    # Marketplace functionality tests
│   └── helpers/                  # Helper functions and utilities
│       ├── wallet-helpers.js     # Wallet interaction helpers
│       └── test-data.js          # Test data and fixtures
├── playwright.config.js          # Playwright configuration
└── .github/workflows/
    └── e2e-tests.yml            # CI/CD configuration
```

## Running Tests

### Run All Tests (Headless)

```bash
npm run test:e2e
```

This runs all E2E tests in headless mode across all configured browsers.

### Run Tests in Headed Mode (UI Visible)

```bash
npm run test:e2e:headed
```

This opens browser windows so you can watch the tests execute in real-time.

### Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI mode, which allows you to:
- Step through tests
- Debug failures
- View test execution in real-time
- Replay tests with time-travel debugging

### Run Tests for Specific Browser

```bash
# Chromium only
npm run test:e2e:chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit
```

### Run Specific Test File

```bash
# Run landing page tests only
npx playwright test e2e/01-landing-page.spec.js

# Run wallet connection tests only
npx playwright test e2e/02-wallet-connection.spec.js

# Run dataset creation tests only
npx playwright test e2e/03-dataset-creation.spec.js

# Run marketplace tests only
npx playwright test e2e/04-marketplace.spec.js
```

### Run Tests on Mobile Devices

```bash
# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

### View Test Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

This opens a detailed HTML report with:
- Test execution results
- Screenshots of failures
- Videos of test runs (for failed tests)
- Execution traces

## Test Coverage

### 1. Landing Page Tests (`01-landing-page.spec.js`)

Tests the main landing page functionality:
- Page loads successfully
- 3D DNA visualization renders
- Navigation menu is present
- Wallet connection button is visible
- Dashboard navigation works
- Mobile responsiveness
- Footer links are present
- No critical console errors

### 2. Wallet Connection Tests (`02-wallet-connection.spec.js`)

Tests wallet authentication flow:
- Connect wallet button displays when not connected
- Mock wallet connection works
- Connection persists across page reloads
- Disconnect functionality
- Dashboard access after connection
- Wallet address display (truncated format)
- Error handling for invalid connections
- UI state updates on connection

### 3. Dataset Creation Tests (`03-dataset-creation.spec.js`)

Tests data provider workflow:
- Dataset creation form displays
- Create new dataset successfully
- Required field validation
- Created datasets display in list
- Dataset details are shown
- Error handling for rapid submissions
- Navigation functionality

### 4. Marketplace Tests (`04-marketplace.spec.js`)

Tests marketplace functionality:
- **Listing Creation:**
  - Marketplace listing form displays
  - Create listing successfully
  - Created listings display

- **Browsing and Purchase:**
  - Researcher dashboard displays
  - Available listings display
  - Filter by access level
  - Listing details shown
  - Purchase button available
  - Purchase flow handling
  - Empty state display
  - Mobile responsiveness

- **Error Handling:**
  - Network error handling
  - Purchase validation

## Configuration

### Playwright Configuration (`playwright.config.js`)

Key configuration options:

```javascript
{
  testDir: './e2e',              // Test directory
  fullyParallel: true,           // Run tests in parallel
  retries: process.env.CI ? 2 : 0, // Retry failed tests on CI
  use: {
    baseURL: 'http://localhost:5173', // Dev server URL
    trace: 'on-first-retry',     // Capture trace on retry
    screenshot: 'only-on-failure', // Screenshot on failure
    video: 'retain-on-failure',  // Video on failure
  },
  webServer: {
    command: 'cd frontend && npm run dev', // Start dev server
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
}
```

### Environment Variables

No environment variables are required for basic test execution. The tests use mock wallet connections and in-memory data.

## Helper Functions

### Wallet Helpers (`e2e/helpers/wallet-helpers.js`)

- `mockWalletConnection(page, address)` - Mock wallet connection with specified address
- `clearWalletConnection(page)` - Clear wallet connection from localStorage
- `waitForWalletUI(page)` - Wait for wallet UI elements to load
- `isWalletConnected(page)` - Check if wallet is connected

### Test Data (`e2e/helpers/test-data.js`)

- `TEST_WALLET_ADDRESSES` - Predefined wallet addresses for testing
- `TEST_DATASET` - Sample dataset configuration
- `TEST_LISTING` - Sample marketplace listing configuration
- `ACCESS_LEVELS` - Access level constants
- `ROUTES` - Application routes
- `generateMockGeneticData(count)` - Generate mock genetic variants

## CI/CD Integration

The E2E tests are integrated with GitHub Actions via `.github/workflows/e2e-tests.yml`.

### Triggers

Tests run automatically on:
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Test Matrix

Tests run across:
- **Desktop browsers:** Chromium, Firefox, WebKit
- **Mobile devices:** Mobile Chrome, Mobile Safari

### Artifacts

On test completion or failure:
- HTML reports are uploaded (retained for 30 days)
- Screenshots of failures are uploaded (retained for 30 days)
- Test results are available in GitHub Actions artifacts

## Debugging Tests

### Debug Single Test

```bash
npx playwright test e2e/01-landing-page.spec.js --debug
```

This opens the Playwright Inspector for step-by-step debugging.

### View Traces

When a test fails, a trace is captured. View it with:

```bash
npx playwright show-trace trace.zip
```

### Enable Verbose Logging

```bash
DEBUG=pw:api npx playwright test
```

### Slow Motion (Watch Tests Execute)

```bash
npx playwright test --headed --slow-mo=1000
```

This slows down test execution by 1 second between actions.

## Best Practices

1. **Use Mock Data:** Tests use mock wallet connections and in-memory data to avoid dependencies on external services.

2. **Parallel Execution:** Tests run in parallel by default for faster execution.

3. **Automatic Waiting:** Playwright automatically waits for elements to be ready, reducing flaky tests.

4. **Isolated Tests:** Each test is independent and can run in any order.

5. **Visual Feedback:** Use headed mode during development to watch tests execute.

6. **CI Integration:** Tests run automatically on every PR to catch regressions early.

## Troubleshooting

### Tests Fail with "Target Closed" Error

This usually means the dev server isn't running. Ensure:
```bash
cd frontend && npm run dev
```
Or let Playwright start it automatically (configured in `playwright.config.js`).

### Tests Fail with Timeout Errors

Increase timeout in test or config:
```javascript
test('my test', async ({ page }) => {
  // ...
}, { timeout: 60000 }); // 60 seconds
```

### Browser Installation Issues

Reinstall browsers:
```bash
npx playwright install --with-deps
```

### Port Already in Use

If port 5173 is in use, either:
1. Stop the existing dev server
2. Change the port in `playwright.config.js`

## Contributing

When adding new features:

1. **Write E2E tests** for critical user flows
2. **Run tests locally** before pushing
3. **Ensure CI passes** before merging
4. **Update documentation** for new test cases

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Playwright Tests](https://playwright.dev/docs/debug)
- [CI/CD with Playwright](https://playwright.dev/docs/ci)

## Support

For issues or questions:
1. Check the [Playwright Documentation](https://playwright.dev/docs/intro)
2. Review test logs and screenshots in `playwright-report/`
3. Open an issue on the [GeneTrust GitHub repository](https://github.com/DeborahOlaboye/genetrust/issues)
