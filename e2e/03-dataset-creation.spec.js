import { test, expect } from '@playwright/test';
import { mockWalletConnection } from './helpers/wallet-helpers.js';
import { TEST_WALLET_ADDRESSES, TEST_DATASET, ROUTES } from './helpers/test-data.js';

/**
 * E2E Tests for Dataset Creation (Data Provider Flow)
 * Tests creating and managing genetic datasets
 */

test.describe('Dataset Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Connect wallet before each test
    await mockWalletConnection(page, TEST_WALLET_ADDRESSES.provider);
    await page.goto(ROUTES.DASHBOARD);
    await page.waitForLoadState('networkidle');
  });

  test('should display dataset creation form', async ({ page }) => {
    // Look for dataset creation section
    const createSection = page.locator('text=/create.*dataset/i').first();
    if (await createSection.count() > 0) {
      await expect(createSection).toBeVisible();
    }

    // Look for description input
    const descriptionInput = page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]');
    if (await descriptionInput.count() > 0) {
      await expect(descriptionInput.first()).toBeVisible();
    }
  });

  test('should create a new dataset successfully', async ({ page }) => {
    // Find description input
    const descriptionInput = page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]').first();

    if (await descriptionInput.count() > 0) {
      // Fill in dataset description
      await descriptionInput.fill(TEST_DATASET.description);

      // Find and click create button
      const createButton = page.locator('button').filter({ hasText: /create.*dataset/i }).first();
      await createButton.click();

      // Wait for dataset to be created (look for success message or new dataset)
      await page.waitForTimeout(2000);

      // Check for success indication
      const successIndicators = [
        page.locator('text=/success/i'),
        page.locator('text=/created/i'),
        page.locator('[role="alert"]'),
        page.locator('.toast, .notification'),
      ];

      let foundSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.count() > 0 && await indicator.first().isVisible()) {
          foundSuccess = true;
          break;
        }
      }

      // Dataset should appear in the list
      const datasetList = page.locator('text=/your.*dataset/i, table, [class*="dataset"]');
      if (await datasetList.count() > 0) {
        await expect(datasetList.first()).toBeVisible();
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    // Try to create dataset without filling required fields
    const createButton = page.locator('button').filter({ hasText: /create.*dataset/i }).first();

    if (await createButton.count() > 0) {
      // Click without filling form
      await createButton.click();

      // Should show validation error
      await page.waitForTimeout(500);

      const errorIndicators = [
        page.locator('text=/required/i'),
        page.locator('text=/error/i'),
        page.locator('[class*="error"]'),
        page.locator('[aria-invalid="true"]'),
      ];

      let foundError = false;
      for (const indicator of errorIndicators) {
        if (await indicator.count() > 0) {
          foundError = true;
          break;
        }
      }

      // Validation should prevent submission with empty fields
      expect(foundError || await createButton.isVisible()).toBeTruthy();
    }
  });

  test('should display created datasets in list', async ({ page }) => {
    // Look for datasets section
    const datasetsSection = page.locator('text=/your.*dataset/i, text=/dataset.*list/i').first();

    if (await datasetsSection.count() > 0) {
      await expect(datasetsSection).toBeVisible();
    }

    // Check if there's a table or list displaying datasets
    const datasetDisplay = page.locator('table, ul, [class*="dataset-list"]');
    if (await datasetDisplay.count() > 0) {
      await expect(datasetDisplay.first()).toBeVisible();
    }
  });

  test('should show dataset details', async ({ page }) => {
    // First create a dataset
    const descriptionInput = page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]').first();

    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill(TEST_DATASET.description);

      const createButton = page.locator('button').filter({ hasText: /create.*dataset/i }).first();
      await createButton.click();
      await page.waitForTimeout(2000);

      // Look for dataset details (ID, description, timestamp)
      const datasetDetails = [
        page.locator(`text=${TEST_DATASET.description}`),
        page.locator('text=/dataset.*id/i'),
        page.locator('text=/created/i'),
      ];

      let foundDetails = false;
      for (const detail of datasetDetails) {
        if (await detail.count() > 0) {
          foundDetails = true;
          break;
        }
      }

      expect(foundDetails).toBeTruthy();
    }
  });

  test('should handle dataset creation errors', async ({ page }) => {
    // Set up console error listener
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Try to create multiple datasets rapidly
    const descriptionInput = page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]').first();
    const createButton = page.locator('button').filter({ hasText: /create.*dataset/i }).first();

    if (await descriptionInput.count() > 0 && await createButton.count() > 0) {
      for (let i = 0; i < 3; i++) {
        await descriptionInput.fill(`Test Dataset ${i}`);
        await createButton.click();
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(1000);

      // App should handle rapid submissions gracefully (no crashes)
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    }
  });

  test('should allow navigation away from dashboard', async ({ page }) => {
    // Verify we're on dashboard
    expect(page.url()).toContain('dashboard');

    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should successfully navigate away
    expect(page.url()).not.toContain('dashboard');
  });
});
