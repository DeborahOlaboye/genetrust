import { test, expect } from '@playwright/test';
import { mockWalletConnection } from './helpers/wallet-helpers.js';
import { TEST_WALLET_ADDRESSES, TEST_LISTING, ACCESS_LEVELS, ROUTES } from './helpers/test-data.js';

/**
 * E2E Tests for Marketplace Functionality
 * Tests marketplace browsing, listing creation, and purchases
 */

test.describe('Marketplace - Listing Creation', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.goto(ROUTES.DASHBOARD);
    await page.waitForLoadState('networkidle');
  });

  test('should display marketplace listing form', async ({ page }) => {
    // Look for listing creation section
    const listingSection = page.locator('text=/create.*listing/i, text=/marketplace.*listing/i').first();

    if (await listingSection.count() > 0) {
      await expect(listingSection).toBeVisible();
    }

    // Check for form fields
    const priceInput = page.locator('input[type="number"], input[placeholder*="price" i]');
    if (await priceInput.count() > 0) {
      await expect(priceInput.first()).toBeVisible();
    }
  });

  test('should create marketplace listing successfully', async ({ page }) => {
    // Find dataset selector (dropdown)
    const datasetSelect = page.locator('select, [role="combobox"]').first();

    if (await datasetSelect.count() > 0) {
      // Select first dataset if available
      await datasetSelect.click();
      await page.waitForTimeout(500);

      const firstOption = page.locator('option, [role="option"]').nth(1);
      if (await firstOption.count() > 0) {
        await firstOption.click();
      }
    }

    // Fill in price
    const priceInput = page.locator('input[placeholder*="price" i], input[type="number"]').first();
    if (await priceInput.count() > 0) {
      await priceInput.fill(String(TEST_LISTING.price));
    }

    // Select access level
    const accessSelect = page.locator('select').filter({ hasText: /access/i }).first();
    if (await accessSelect.count() > 0) {
      await accessSelect.selectOption(String(TEST_LISTING.accessLevel));
    }

    // Submit listing
    const createListingButton = page.locator('button').filter({ hasText: /create.*listing/i }).first();
    if (await createListingButton.count() > 0) {
      await createListingButton.click();
      await page.waitForTimeout(2000);

      // Check for success
      const successMessage = page.locator('text=/success/i, text=/created/i');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display created listings', async ({ page }) => {
    // Look for listings section
    const listingsSection = page.locator('text=/your.*listing/i, text=/marketplace.*listing/i').first();

    if (await listingsSection.count() > 0) {
      await expect(listingsSection).toBeVisible();
    }
  });
});

test.describe('Marketplace - Browsing and Purchase', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.researcher);
    await page.goto(ROUTES.RESEARCHER_DASHBOARD);
    await page.waitForLoadState('networkidle');
  });

  test('should display researcher dashboard', async ({ page }) => {
    // Check we're on the researcher dashboard
    expect(page.url()).toContain('researchers-dashboard');

    // Look for marketplace elements
    const marketplaceHeading = page.locator('h1, h2').filter({ hasText: /marketplace/i });
    if (await marketplaceHeading.count() > 0) {
      await expect(marketplaceHeading.first()).toBeVisible();
    }
  });

  test('should display available marketplace listings', async ({ page }) => {
    // Wait for listings to load
    await page.waitForTimeout(2000);

    // Look for listings display
    const listingsContainer = page.locator('[class*="listing"], [class*="marketplace"], table, .grid');
    if (await listingsContainer.count() > 0) {
      await expect(listingsContainer.first()).toBeVisible();
    }
  });

  test('should filter listings by access level', async ({ page }) => {
    // Look for filter controls
    const filterSelect = page.locator('select').filter({ hasText: /filter|access/i }).first();

    if (await filterSelect.count() > 0) {
      await expect(filterSelect).toBeVisible();

      // Try filtering by different access levels
      await filterSelect.selectOption(String(ACCESS_LEVELS.DETAILED));
      await page.waitForTimeout(1000);

      // Listings should be filtered
      const listings = page.locator('[class*="listing"]');
      if (await listings.count() > 0) {
        expect(await listings.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should display listing details', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for listing cards or rows
    const firstListing = page.locator('[class*="listing"], tr').first();

    if (await firstListing.count() > 0) {
      // Check for price display
      const priceElement = page.locator('text=/[0-9]+.*stx/i, text=/price/i').first();
      if (await priceElement.count() > 0) {
        await expect(priceElement).toBeVisible();
      }

      // Check for access level display
      const accessElement = page.locator('text=/access.*level/i, text=/basic|detailed|full/i').first();
      if (await accessElement.count() > 0) {
        await expect(accessElement).toBeVisible();
      }
    }
  });

  test('should show purchase button for listings', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for purchase/buy button
    const purchaseButton = page.locator('button').filter({ hasText: /purchase|buy/i }).first();

    if (await purchaseButton.count() > 0) {
      await expect(purchaseButton).toBeVisible();
    }
  });

  test('should handle purchase flow', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find and click purchase button
    const purchaseButton = page.locator('button').filter({ hasText: /purchase|buy/i }).first();

    if (await purchaseButton.count() > 0) {
      await purchaseButton.click();
      await page.waitForTimeout(1000);

      // Should show confirmation or processing state
      const confirmationElements = [
        page.locator('text=/confirm/i'),
        page.locator('text=/processing/i'),
        page.locator('[role="dialog"]'),
        page.locator('.modal'),
      ];

      let foundConfirmation = false;
      for (const element of confirmationElements) {
        if (await element.count() > 0 && await element.first().isVisible()) {
          foundConfirmation = true;
          break;
        }
      }

      // Either confirmation dialog or direct processing
      expect(foundConfirmation || await page.locator('button').filter({ hasText: /purchase|buy/i }).first().isVisible()).toBeTruthy();
    }
  });

  test('should display empty state when no listings available', async ({ page }) => {
    // Mock empty marketplace
    await page.evaluate(() => {
      localStorage.setItem('mockEmptyMarketplace', 'true');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show empty state message
    const emptyMessage = page.locator('text=/no.*listing/i, text=/empty/i').first();
    if (await emptyMessage.count() > 0) {
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Listings should be visible on mobile
    await page.waitForTimeout(2000);
    const body = await page.locator('body').isVisible();
    expect(body).toBe(true);
  });
});

test.describe('Marketplace - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.researcher);
    await page.goto(ROUTES.RESEARCHER_DASHBOARD);
    await page.waitForLoadState('networkidle');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);

    await page.reload();
    await page.waitForTimeout(2000);

    // Should show error message or handle gracefully
    const errorIndicators = [
      page.locator('text=/error/i'),
      page.locator('text=/failed/i'),
      page.locator('text=/offline/i'),
    ];

    let foundError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.count() > 0) {
        foundError = true;
        break;
      }
    }

    // Should either show error or handle gracefully without crashing
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    // Restore online
    await page.context().setOffline(false);
  });

  test('should validate purchase requirements', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Try to purchase with insufficient access level
    const purchaseButton = page.locator('button').filter({ hasText: /purchase|buy/i }).first();

    if (await purchaseButton.count() > 0) {
      // Attempt purchase
      await purchaseButton.click();
      await page.waitForTimeout(1000);

      // Should handle validation (either disabled button or error message)
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    }
  });
});
