/**
 * @file Wallet service for managing Stacks wallet connections and state management
 * @module services/walletService
 * @description Provides methods for connecting, disconnecting, and managing wallet state
 * using the Stacks Connect library.
 */

'use client';

import { showConnect } from '@stacks/connect';
import { appDetails, userSession } from '@/config/walletConfig';

/**
 * WalletService handles all wallet-related functionality including connection,
 * disconnection, and state management for Stacks wallet integration.
 * 
 * @class WalletService
 * @property {string|null} _address - The current wallet address or null if not connected
 * @property {Set<Function>} _listeners - Set of callback functions to be notified on state changes
 * @property {Object} userSession - The user session object from Stacks Connect
 */
class WalletService {
  /**
   * Creates a new WalletService instance.
   * Initializes the service and checks for existing wallet connection.
   */
  constructor() {
    /** @private */
    this._address = null;
    
    /** @private */
    this._listeners = new Set();
    
    /** @public */
    this.userSession = userSession;

    // Initialize with existing session if available
    if (typeof window !== 'undefined' && this.userSession.isUserSignedIn()) {
      this._updateAddress();
    }
  }

  /**
   * Updates the current wallet address from the user session.
   * @private
   * @description Fetches the latest address from the user session and updates the internal state.
   * Emits an update to all registered listeners after updating the address.
   */
  _updateAddress() {
    if (this.userSession.isUserSignedIn()) {
      const userData = this.userSession.loadUserData();
      // Prefer testnet address, fallback to mainnet if not available
      this._address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
    } else {
      this._address = null;
    }
    this._emit();
  }

  /**
   * Notifies all registered listeners with the current wallet address.
   * @private
   * @description Safely calls each listener with the current address.
   * Errors in listeners are caught and logged without breaking the notification chain.
   */
  _emit() {
    for (const cb of this._listeners) {
      try { 
        cb(this._address); 
      } catch (error) {
        console.error('Error in wallet listener:', error);
        // Continue with other listeners even if one fails
      }
    }
  }

  /**
   * Registers a callback to be called when the wallet state changes.
   * @param {Function} callback - Function to be called with the new address (or null)
   * @returns {Function} Unsubscribe function to remove the listener
   * @example
   * const unsubscribe = walletService.addListener((address) => {
   *   console.log('Wallet address changed:', address);
   * });
   * // Later...
   * unsubscribe(); // Remove the listener
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Listener must be a function');
    }
    this._listeners.add(callback);
    // Return unsubscribe function
    return () => this._listeners.delete(callback);
  }

  /**
   * Gets the current wallet address.
   * @returns {string|null} The current wallet address or null if not connected
   */
  getAddress() {
    return this._address;
  }

  /**
   * Checks if a wallet is currently connected.
   * @returns {boolean} True if a wallet is connected, false otherwise
   */
  isConnected() {
    return !!this._address;
  }

  /**
   * Initiates the wallet connection flow using Stacks Connect.
   * @async
   * @returns {Promise<string>} A promise that resolves with the connected wallet address
   * @throws {Error} If the connection is not in a browser environment
   * @throws {Error} If the user cancels the connection
   * @throws {Error} If the connection fails
   * @example
   * try {
   *   const address = await walletService.connect();
   *   console.log('Connected with address:', address);
   * } catch (error) {
   *   console.error('Connection failed:', error.message);
   * }
   */
  async connect() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        return reject(new Error('Wallet can only be connected in the browser environment'));
      }

      if (this.isConnected()) {
        return resolve(this._address);
      }

      showConnect({
        appDetails: {
          ...appDetails,
          name: 'GeneTrust',
          icon: (typeof window !== 'undefined' ? window.location.origin : '') + '/favicon.svg',
        },
        redirectTo: '/',
        onFinish: () => {
          if (this.userSession.isUserSignedIn()) {
            const userData = this.userSession.loadUserData();
            const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
            this.setAddress(address);
            this._updateAddress();
            resolve(address);
          } else {
            reject(new Error('User did not sign in'));
          }
        },
        onCancel: () => {
          reject(new Error('User cancelled connection'));
        },
        userSession: this.userSession
      });
    });
  }

  /**
   * Disconnects the current wallet session.
   * @description Signs out the user and clears the stored address.
   * All registered listeners will be notified with a null address.
   */
  disconnect() {
    if (this.userSession && this.userSession.isUserSignedIn()) {
      this.userSession.signUserOut('/');
    }
    this.setAddress(null);
  }

  /**
   * Alias for addListener (for backward compatibility).
   * @param {Function} callback - Function to be called when wallet state changes
   * @returns {Function} Unsubscribe function to remove the listener
   * @see addListener
   */
  onChange(callback) {
    return this.addListener(callback);
  }
}

/**
 * Singleton instance of WalletService.
 * @type {WalletService}
 */
export const walletService = new WalletService();
