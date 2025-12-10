import { test, expect } from '@playwright/test';
import { ROUTES } from './helpers/test-data.js';

/**
 * E2E Tests for GeneTrust Landing Page
 * Tests the main landing page functionality and navigation
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the landing page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/GeneTrust/i);

    // Check for main heading or logo
    const heading = page.locator('h1, [role="heading"]').first();
    await expect(heading).toBeVisible();
  });

  test('should display 3D DNA visualization', async ({ page }) => {
    // Wait for canvas or 3D rendering element
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation menu', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('should display wallet connection button', async ({ page }) => {
    // Look for connect wallet button
    const connectButton = page.locator('button').filter({ hasText: /connect/i });
    await expect(connectButton.first()).toBeVisible();
  });

  test('should navigate to dashboard route', async ({ page }) => {
    // Find and click link to dashboard
    const dashboardLink = page.locator('a[href*="dashboard"], button').filter({ hasText: /dashboard/i });

    if (await dashboardLink.count() > 0) {
      await dashboardLink.first().click();
      await page.waitForURL(/.*dashboard.*/);
      expect(page.url()).toContain('dashboard');
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if page loads correctly on mobile
    await expect(page.locator('body')).toBeVisible();

    // Check for mobile menu or hamburger icon
    const mobileMenu = page.locator('[aria-label*="menu"], button[class*="mobile"]');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
  });

  test('should have footer with links', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check for footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like third-party library warnings)
    const criticalErrors = errors.filter(
      (error) => !error.includes('DevTools') && !error.includes('Extension')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
