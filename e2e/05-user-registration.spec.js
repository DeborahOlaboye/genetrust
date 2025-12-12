import { test, expect } from '@playwright/test';
import { ROUTES } from './helpers/test-data.js';

/**
 * E2E Tests for User Registration and Onboarding
 * Tests the complete user registration and onboarding flow
 */

test.describe('User Registration and Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
  });

  test('should load registration page', async ({ page }) => {
    await expect(page).toHaveTitle(/Register | GeneTrust/);
    await expect(page.locator('h1')).toContainText('Create Your Account');
  });

  test('should validate registration form', async ({ page }) => {
    // Test required fields
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Verify validation messages
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Please accept the terms and conditions')).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    // Generate a unique email for each test run
    const testEmail = `testuser_${Date.now()}@example.com`;
    
    // Fill in registration form
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/^password/i).fill('SecurePass123!');
    await page.getByLabel(/confirm password/i).fill('SecurePass123!');
    await page.getByLabel(/terms and conditions/i).check();
    
    // Submit the form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Verify redirection to onboarding
    await page.waitForURL(ROUTES.ONBOARDING);
    await expect(page.locator('h1')).toContainText('Complete Your Profile');
  });

  test('should complete user onboarding', async ({ page }) => {
    // Navigate to onboarding (assuming we're already registered)
    await page.goto(ROUTES.ONBOARDING);
    
    // Fill in onboarding form
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/organization/i).fill('Test Org');
    await page.getByLabel(/research interests/i).fill('Genomics, Privacy');
    
    // Submit the form
    await page.getByRole('button', { name: /complete setup/i }).click();
    
    // Verify redirection to dashboard
    await page.waitForURL(ROUTES.DASHBOARD);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
