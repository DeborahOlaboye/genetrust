/**
 * Wallet Helper Functions for E2E Tests
 * These helpers simulate wallet interactions for testing purposes
 */

/**
 * Mock wallet connection by setting localStorage
 * @param {Page} page - Playwright page object
 * @param {string} address - Wallet address to mock
 */
export async function mockWalletConnection(page, address = 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5') {
  await page.evaluate((walletAddress) => {
    // Mock wallet connection in localStorage
    localStorage.setItem('walletConnected', 'true');
    localStorage.setItem('walletAddress', walletAddress);

    // Mock Stacks auth user data
    const userData = {
      profile: {
        stxAddress: {
          testnet: walletAddress,
          mainnet: walletAddress.replace('ST', 'SP'),
        },
      },
      appPrivateKey: 'mock-private-key',
      authResponseToken: 'mock-auth-token',
    };

    localStorage.setItem('blockstack-session', JSON.stringify(userData));
  }, address);
}

/**
 * Clear wallet connection
 * @param {Page} page - Playwright page object
 */
export async function clearWalletConnection(page) {
  await page.evaluate(() => {
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('blockstack-session');
  });
}

/**
 * Wait for wallet connection UI element
 * @param {Page} page - Playwright page object
 */
export async function waitForWalletUI(page) {
  await page.waitForSelector('[data-testid="wallet-address"], .wallet-connected, button:has-text("Connect Wallet")', {
    timeout: 10000,
  });
}

/**
 * Check if wallet is connected
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
export async function isWalletConnected(page) {
  return await page.evaluate(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
}
