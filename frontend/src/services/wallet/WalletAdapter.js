/**
 * @file Base wallet adapter interface for multi-wallet support
 * @module services/wallet/WalletAdapter
 * @description Defines the contract that all wallet adapters must implement
 * for consistent integration across different wallet providers.
 */

/**
 * Abstract base class for wallet adapters
 * @abstract
 */
export class WalletAdapter {
  /**
   * Get the wallet adapter name/identifier
   * @abstract
   * @returns {string}
   */
  getName() {
    throw new Error('getName() not implemented');
  }

  /**
   * Get the wallet adapter display name for UI
   * @abstract
   * @returns {string}
   */
  getDisplayName() {
    throw new Error('getDisplayName() not implemented');
  }

  /**
   * Check if the wallet adapter is available in the current environment
   * @abstract
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() not implemented');
  }

  /**
   * Initiate wallet connection
   * @abstract
   * @returns {Promise<{address: string, publicKey?: string}>}
   */
  async connect() {
    throw new Error('connect() not implemented');
  }

  /**
   * Disconnect from the wallet
   * @abstract
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() not implemented');
  }

  /**
   * Get the currently connected address, or null if not connected
   * @abstract
   * @returns {string|null}
   */
  getAddress() {
    throw new Error('getAddress() not implemented');
  }

  /**
   * Check if currently connected
   * @abstract
   * @returns {boolean}
   */
  isConnected() {
    throw new Error('isConnected() not implemented');
  }

  /**
   * Subscribe to connection state changes
   * @abstract
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    throw new Error('subscribe() not implemented');
  }

  /**
   * Get list of all available accounts for this wallet
   * @abstract
   * @returns {Promise<Array<{address: string, publicKey?: string}>>}
   */
  async getAccounts() {
    throw new Error('getAccounts() not implemented');
  }

  /**
   * Sign a message with the wallet
   * @abstract
   * @param {string} message
   * @returns {Promise<{signature: string, publicKey: string}>}
   */
  async signMessage(message) {
    throw new Error('signMessage() not implemented');
  }
}
