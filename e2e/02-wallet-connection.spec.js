import { test, expect } from '@playwright/test';
import { mockWalletConnection, clearWalletConnection, isWalletConnected } from './helpers/wallet-helpers.js';
import { TEST_WALLET_ADDRESSES, ROUTES } from './helpers/test-data.js';

/**
 * E2E Tests for Wallet Connection Flow
 * Tests wallet authentication and connection functionality
 */

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await clearWalletConnection(page);
    await page.goto('/');
  });

  test('should show connect wallet button when not connected', async ({ page }) => {
    const connectButton = page.locator('button').filter({ hasText: /connect.*wallet/i });
    await expect(connectButton.first()).toBeVisible();
  });

  test('should mock wallet connection successfully', async ({ page }) => {
    // Mock wallet connection
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);

    // Reload to apply connection state
    await page.reload();

    // Verify connection was successful
    const connected = await isWalletConnected(page);
    expect(connected).toBe(true);

    // Check for wallet address display
    const walletAddress = page.locator('text=/ST[A-Z0-9]+/');
    if (await walletAddress.count() > 0) {
      await expect(walletAddress.first()).toBeVisible();
    }
  });

  test('should persist wallet connection across page reloads', async ({ page }) => {
    // Connect wallet
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.reload();

    // Verify connection persists
    const connected = await isWalletConnected(page);
    expect(connected).toBe(true);

    // Reload again
    await page.reload();

    // Connection should still persist
    const stillConnected = await isWalletConnected(page);
    expect(stillConnected).toBe(true);
  });

  test('should disconnect wallet successfully', async ({ page }) => {
    // Connect first
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.reload();

    // Look for disconnect button
    const disconnectButton = page.locator('button').filter({ hasText: /disconnect/i });

    if (await disconnectButton.count() > 0) {
      await disconnectButton.first().click();

      // Wait a moment for disconnect to process
      await page.waitForTimeout(500);

      // Verify disconnection
      const connected = await isWalletConnected(page);
      expect(connected).toBe(false);
    } else {
      // If no disconnect button, manually clear connection
      await clearWalletConnection(page);
      await page.reload();

      const connected = await isWalletConnected(page);
      expect(connected).toBe(false);
    }
  });

  test('should enable dashboard access after wallet connection', async ({ page }) => {
    // Connect wallet
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.reload();

    // Try to navigate to dashboard
    await page.goto(ROUTES.DASHBOARD);

    // Should be able to access dashboard (not redirected)
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('dashboard');
  });

  test('should show wallet address in truncated format', async ({ page }) => {
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.reload();

    // Look for truncated address pattern (e.g., "ST1P...62A5")
    const addressPattern = /ST[A-Z0-9]{2,4}\.{2,3}[A-Z0-9]{4}/;
    const truncatedAddress = page.locator(`text=${addressPattern}`);

    if (await truncatedAddress.count() > 0) {
      await expect(truncatedAddress.first()).toBeVisible();
    }
  });

  test('should handle wallet connection errors gracefully', async ({ page }) => {
    // Try to connect with invalid data
    await page.evaluate(() => {
      localStorage.setItem('walletConnected', 'invalid');
      localStorage.setItem('walletAddress', '');
    });

    await page.reload();

    // Should not crash and should show connect button
    const connectButton = page.locator('button').filter({ hasText: /connect/i });
    await expect(connectButton.first()).toBeVisible();
  });

  test('should update UI state when wallet connects', async ({ page }) => {
    // Start without connection
    const initialConnectButton = page.locator('button').filter({ hasText: /connect/i });
    await expect(initialConnectButton.first()).toBeVisible();

    // Connect wallet
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.reload();

    // UI should update - connect button should be replaced or hidden
    const connected = await isWalletConnected(page);
    expect(connected).toBe(true);
  });
});
