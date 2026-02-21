/**
 * Authentication helper functions for E2E tests
 */

/**
 * Register a new test user
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Registration options
 * @param {string} [options.email] - User email (default: auto-generated)
 * @param {string} [options.password] - User password (default: 'TestPass123!')
 * @returns {Promise<{email: string, password: string}>} - Registered user credentials
 */
export async function registerTestUser(page, options = {}) {
  const testEmail = options.email || `testuser_${Date.now()}@example.com`;
  const testPassword = options.password || 'TestPass123!';
  
  await page.goto('/register');
  
  // Fill in registration form
  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByLabel(/^password/i).fill(testPassword);
  await page.getByLabel(/confirm password/i).fill(testPassword);
  await page.getByLabel(/terms and conditions/i).check();
  
  // Submit the form
  await page.getByRole('button', { name: /sign up/i }).click();
  
  // Wait for registration to complete
  await page.waitForURL('**/onboarding');
  
  return { email: testEmail, password: testPassword };
}

/**
 * Login a test user
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 */
export async function loginTestUser(page, email, password) {
  await page.goto('/login');
  
  // Fill in login form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit the form
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for login to complete
  await page.waitForURL('**/dashboard');
}

/**
 * Logout the current user
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function logoutUser(page) {
  // Click on user menu
  await page.getByRole('button', { name: /user menu/i }).click();
  
  // Click on sign out
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  
  // Wait for logout to complete
  await page.waitForURL('**/login');
}

/**
 * Complete user onboarding
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} userData - User data for onboarding
 */
export async function completeUserOnboarding(page, userData = {}) {
  const defaultData = {
    fullName: 'Test User',
    organization: 'Test Organization',
    researchInterests: 'Genomics, Privacy, Blockchain'
  };
  
  const data = { ...defaultData, ...userData };
  
  // Fill in onboarding form
  await page.getByLabel(/full name/i).fill(data.fullName);
  await page.getByLabel(/organization/i).fill(data.organization);
  await page.getByLabel(/research interests/i).fill(data.researchInterests);
  
  // Submit the form
  await page.getByRole('button', { name: /complete setup/i }).click();
  
  // Wait for redirection to dashboard
  await page.waitForURL('**/dashboard');
}
