/**
 * @file Wallet service for managing Stacks wallet connections and state management
 * @module services/walletService
 * @description Provides methods for connecting, disconnecting, and managing wallet state
 * using the Stacks Connect library. Extended with Stacks Connect 8.x advanced features:
 * multi-account support, hardware wallet (Ledger) integration, session management,
 * wallet switching, and transaction batching.
 */

'use client';

import { showConnect } from '@stacks/connect';
import { appDetails, userSession } from '@/config/walletConfig';

// ── Session storage keys ────────────────────────────────────────────────────
const SESSION_KEY_ACCOUNTS   = 'genetrust_accounts';
const SESSION_KEY_ACTIVE_IDX = 'genetrust_active_account';
const SESSION_KEY_EXPIRY     = 'genetrust_session_expiry';
const SESSION_DURATION_MS    = 24 * 60 * 60 * 1000; // 24 hours

// ── Transaction batch status constants ─────────────────────────────────────
export const TX_STATUS = {
  PENDING:  'pending',
  SIGNED:   'signed',
  BROADCAST:'broadcast',
  CONFIRMED:'confirmed',
  FAILED:   'failed',
};

/**
 * WalletService handles all wallet-related functionality including connection,
 * disconnection, and state management for Stacks wallet integration.
 *
 * @class WalletService
 * @property {string|null} _address - The current wallet address or null if not connected
 * @property {Set<Function>} _listeners - Set of callback functions to be notified on state changes
 * @property {Object} userSession - The user session object from Stacks Connect
 * @property {Array<Object>} _accounts - All known accounts for the active session
 * @property {number} _activeAccountIndex - Index of the currently selected account
 * @property {Array<Object>} _txQueue - Queued transactions for batch execution
 * @property {boolean} _ledgerMode - Whether hardware (Ledger) mode is active
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

    // ── Multi-account state ─────────────────────────────────────────────
    /** @private — list of { address, label, network, source } objects */
    this._accounts = [];

    /** @private — index into _accounts for the active account */
    this._activeAccountIndex = 0;

    // ── Hardware wallet state ───────────────────────────────────────────
    /** @private — whether a Ledger transport is open */
    this._ledgerMode = false;

    /** @private — Ledger transport reference (set when hardware connected) */
    this._ledgerTransport = null;

    // ── Transaction batch queue ─────────────────────────────────────────
    /** @private — ordered list of queued transaction descriptors */
    this._txQueue = [];

    // ── Session expiry ──────────────────────────────────────────────────
    /** @private */
    this._sessionExpiry = null;

    // Restore persisted state
    this._restoreSession();

    // Initialize with existing session if available
    if (typeof window !== 'undefined' && this.userSession.isUserSignedIn()) {
      this._updateAddress();
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Updates the current wallet address from the user session.
   * @private
   */
  _updateAddress() {
    if (this.userSession.isUserSignedIn()) {
      const userData = this.userSession.loadUserData();
      const testnet  = userData.profile.stxAddress.testnet;
      const mainnet  = userData.profile.stxAddress.mainnet;
      this._address  = testnet || mainnet;

      // Ensure active account entry exists for this address
      if (!this._accounts.find(a => a.address === this._address)) {
        this._accounts.push({
          address: this._address,
          label:   'Account 1',
          network: testnet ? 'testnet' : 'mainnet',
          source:  'stacks-connect',
        });
        this._persistAccounts();
      }
    } else {
      this._address = null;
    }
    this._emit();
  }

  /**
   * Notifies all registered listeners with the current wallet address.
   * @private
   */
  _emit() {
    for (const cb of this._listeners) {
      try {
        cb(this._address);
      } catch (error) {
        console.error('Error in wallet listener:', error);
      }
    }
  }

  /**
   * Persist the accounts list to sessionStorage.
   * @private
   */
  _persistAccounts() {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(SESSION_KEY_ACCOUNTS, JSON.stringify(this._accounts));
      sessionStorage.setItem(SESSION_KEY_ACTIVE_IDX, String(this._activeAccountIndex));
    } catch (_) {
      // Storage unavailable (e.g. private browsing with quota exhausted)
    }
  }

  /**
   * Persist session expiry timestamp to sessionStorage.
   * @private
   */
  _persistSessionExpiry() {
    if (typeof window === 'undefined') return;
    try {
      const expiry = Date.now() + SESSION_DURATION_MS;
      this._sessionExpiry = expiry;
      sessionStorage.setItem(SESSION_KEY_EXPIRY, String(expiry));
    } catch (_) {
      // ignore
    }
  }

  /**
   * Restore accounts and session state from sessionStorage on construction.
   * @private
   */
  _restoreSession() {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY_ACCOUNTS);
      if (raw) {
        this._accounts = JSON.parse(raw);
      }
      const idx = sessionStorage.getItem(SESSION_KEY_ACTIVE_IDX);
      if (idx !== null) {
        this._activeAccountIndex = Math.max(0, parseInt(idx, 10));
      }
      const expiry = sessionStorage.getItem(SESSION_KEY_EXPIRY);
      if (expiry) {
        this._sessionExpiry = parseInt(expiry, 10);
        // Invalidate expired sessions
        if (Date.now() > this._sessionExpiry) {
          this._clearSession();
        }
      }
    } catch (_) {
      // Corrupt storage — start fresh
    }
  }

  /**
   * Clear all persisted session data.
   * @private
   */
  _clearSession() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY_ACCOUNTS);
    sessionStorage.removeItem(SESSION_KEY_ACTIVE_IDX);
    sessionStorage.removeItem(SESSION_KEY_EXPIRY);
    this._accounts = [];
    this._activeAccountIndex = 0;
    this._sessionExpiry = null;
  }

  // ── Core connection API ───────────────────────────────────────────────────

  /**
   * Registers a callback to be called when the wallet state changes.
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Listener must be a function');
    }
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /** @returns {string|null} The currently active wallet address */
  getAddress() {
    return this._address;
  }

  /** @returns {boolean} */
  isConnected() {
    return !!this._address;
  }

  /**
   * Initiates the wallet connection flow using Stacks Connect.
   * @async
   * @returns {Promise<string>} Resolves with the connected wallet address
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
          icon: `${window.location.origin}/favicon.svg`,
        },
        redirectTo: '/',
        onFinish: () => {
          if (this.userSession.isUserSignedIn()) {
            const userData = this.userSession.loadUserData();
            const address  = userData.profile.stxAddress.testnet
              || userData.profile.stxAddress.mainnet;
            this.setAddress(address);
            this._updateAddress();
            this._persistSessionExpiry();
            resolve(address);
          } else {
            reject(new Error('User did not sign in'));
          }
        },
        onCancel: () => {
          reject(new Error('User cancelled connection'));
        },
        userSession: this.userSession,
      });
    });
  }

  /**
   * Disconnects the current wallet session and clears all persisted state.
   */
  disconnect() {
    if (this.userSession && this.userSession.isUserSignedIn()) {
      this.userSession.signUserOut('/');
    }
    this._ledgerMode = false;
    this._ledgerTransport = null;
    this._txQueue = [];
    this._clearSession();
    this.setAddress(null);
  }

  /**
   * Alias for addListener (for backward compatibility).
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    return this.addListener(callback);
  }

  // ── Multi-account API ─────────────────────────────────────────────────────

  /**
   * Return all accounts known to this session.
   * @returns {Array<{address: string, label: string, network: string, source: string}>}
   */
  getAccounts() {
    return [...this._accounts];
  }

  /**
   * Return the currently active account object, or null when not connected.
   * @returns {Object|null}
   */
  getActiveAccount() {
    return this._accounts[this._activeAccountIndex] || null;
  }

  /**
   * Add a new account manually (e.g. imported watch-only or hardware).
   * @param {string} address  - Stacks address
   * @param {string} label    - Human-readable label
   * @param {string} network  - 'mainnet' | 'testnet'
   * @param {string} source   - Where this account came from ('ledger', 'imported', etc.)
   * @returns {number} Index of the newly added account
   */
  addAccount(address, label, network = 'testnet', source = 'imported') {
    if (!address) throw new Error('address is required');
    if (this._accounts.find(a => a.address === address)) {
      throw new Error(`Account ${address} is already registered`);
    }
    this._accounts.push({ address, label, network, source });
    this._persistAccounts();
    this._emit();
    return this._accounts.length - 1;
  }

  /**
   * Switch the active account by index.
   * @param {number} index
   */
  switchAccount(index) {
    if (index < 0 || index >= this._accounts.length) {
      throw new Error(`Account index ${index} is out of range`);
    }
    this._activeAccountIndex = index;
    this._address = this._accounts[index].address;
    this._persistAccounts();
    this._emit();
  }

  /**
   * Switch the active account by address.
   * @param {string} address
   */
  switchAccountByAddress(address) {
    const idx = this._accounts.findIndex(a => a.address === address);
    if (idx === -1) throw new Error(`Account ${address} not found`);
    this.switchAccount(idx);
  }

  /**
   * Remove an account by index. Cannot remove the currently active account.
   * @param {number} index
   */
  removeAccount(index) {
    if (index === this._activeAccountIndex) {
      throw new Error('Cannot remove the active account');
    }
    this._accounts.splice(index, 1);
    if (this._activeAccountIndex > index) {
      this._activeAccountIndex--;
    }
    this._persistAccounts();
    this._emit();
  }

  /**
   * Rename an account.
   * @param {number} index
   * @param {string} label
   */
  renameAccount(index, label) {
    if (!this._accounts[index]) throw new Error(`Account index ${index} not found`);
    this._accounts[index] = { ...this._accounts[index], label };
    this._persistAccounts();
    this._emit();
  }

  // ── Hardware wallet (Ledger) API ──────────────────────────────────────────

  /**
   * Connect a Ledger hardware wallet via WebHID or WebUSB transport.
   * Adds the Ledger-derived address to the accounts list.
   *
   * @async
   * @param {Object} [options]
   * @param {string} [options.network='testnet']
   * @param {string} [options.transport='webhid'] - 'webhid' | 'webusb'
   * @returns {Promise<string>} The Ledger-derived Stacks address
   */
  async connectLedger({ network = 'testnet', transport = 'webhid' } = {}) {
    if (typeof window === 'undefined') {
      throw new Error('Ledger connection requires a browser environment');
    }

    // Dynamic import so the Ledger SDK is only loaded when needed
    let TransportClass;
    try {
      if (transport === 'webhid') {
        const mod = await import(/* webpackChunkName: "ledger-webhid" */ '@ledgerhq/hw-transport-webhid');
        TransportClass = mod.default || mod;
      } else {
        const mod = await import(/* webpackChunkName: "ledger-webusb" */ '@ledgerhq/hw-transport-webusb');
        TransportClass = mod.default || mod;
      }
    } catch {
      throw new Error(
        'Ledger transport library not installed. Run: npm install @ledgerhq/hw-transport-webhid'
      );
    }

    let StacksApp;
    try {
      const mod = await import(/* webpackChunkName: "ledger-stacks" */ '@zondax/ledger-stacks');
      StacksApp = mod.default || mod.StacksApp;
    } catch {
      throw new Error(
        'Ledger Stacks app library not installed. Run: npm install @zondax/ledger-stacks'
      );
    }

    try {
      this._ledgerTransport = await TransportClass.create();
      const stacksApp = new StacksApp(this._ledgerTransport);

      // Derive the first Stacks account (BIP-44 path m/44'/5757'/0'/0/0)
      const response = await stacksApp.getAddressAndPubKey("m/44'/5757'/0'/0/0", network === 'mainnet');
      if (response.returnCode !== 0x9000) {
        throw new Error(`Ledger error: 0x${response.returnCode.toString(16)}`);
      }

      const ledgerAddress = response.address;
      this._ledgerMode = true;

      const idx = this.addAccount(ledgerAddress, 'Ledger Account 1', network, 'ledger');
      this.switchAccount(idx);
      this._persistSessionExpiry();

      return ledgerAddress;
    } catch (error) {
      if (this._ledgerTransport) {
        await this._ledgerTransport.close().catch(() => {});
        this._ledgerTransport = null;
      }
      this._ledgerMode = false;
      throw error;
    }
  }

  /**
   * Disconnect the Ledger transport without removing the account.
   * @async
   */
  async disconnectLedger() {
    if (this._ledgerTransport) {
      await this._ledgerTransport.close().catch(() => {});
      this._ledgerTransport = null;
    }
    this._ledgerMode = false;
    this._emit();
  }

  /** @returns {boolean} Whether a Ledger device is currently connected */
  isLedgerConnected() {
    return this._ledgerMode && this._ledgerTransport !== null;
  }

  // ── Session management API ────────────────────────────────────────────────

  /**
   * Check whether the current session is still valid (not expired).
   * @returns {boolean}
   */
  isSessionValid() {
    if (!this.isConnected()) return false;
    if (!this._sessionExpiry) return true; // no expiry set — treat as valid
    return Date.now() < this._sessionExpiry;
  }

  /**
   * Return the session expiry timestamp (ms since epoch), or null.
   * @returns {number|null}
   */
  getSessionExpiry() {
    return this._sessionExpiry;
  }

  /**
   * Extend the current session by another 24 hours.
   */
  refreshSession() {
    if (!this.isConnected()) throw new Error('No active session to refresh');
    this._persistSessionExpiry();
    this._emit();
  }

  /**
   * Manually expire the current session immediately.
   * Consumers should call disconnect() afterwards to clean up UI state.
   */
  expireSession() {
    this._sessionExpiry = Date.now() - 1;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_KEY_EXPIRY, String(this._sessionExpiry));
      } catch (_) {
        // ignore
      }
    }
    this._emit();
  }

  // ── Transaction batching API ──────────────────────────────────────────────

  /**
   * Add a transaction to the batch queue.
   * @param {Object} txDescriptor - Transaction descriptor object
   * @param {string} txDescriptor.contractAddress
   * @param {string} txDescriptor.contractName
   * @param {string} txDescriptor.functionName
   * @param {Array}  txDescriptor.functionArgs
   * @param {string} [txDescriptor.postConditionMode]
   * @param {string} [txDescriptor.memo]
   * @returns {number} The queue index of the added transaction
   */
  enqueueTx(txDescriptor) {
    if (!txDescriptor || typeof txDescriptor !== 'object') {
      throw new Error('txDescriptor must be an object');
    }
    const entry = {
      ...txDescriptor,
      id:        `tx_${Date.now()}_${this._txQueue.length}`,
      status:    TX_STATUS.PENDING,
      addedAt:   Date.now(),
      result:    null,
      error:     null,
    };
    this._txQueue.push(entry);
    return this._txQueue.length - 1;
  }

  /**
   * Remove a transaction from the queue by its id.
   * @param {string} txId
   */
  dequeueTx(txId) {
    const idx = this._txQueue.findIndex(t => t.id === txId);
    if (idx === -1) throw new Error(`Transaction ${txId} not found in queue`);
    this._txQueue.splice(idx, 1);
  }

  /**
   * Return a copy of the current transaction queue.
   * @returns {Array<Object>}
   */
  getTxQueue() {
    return this._txQueue.map(t => ({ ...t }));
  }

  /**
   * Return the number of transactions currently queued.
   * @returns {number}
   */
  getTxQueueLength() {
    return this._txQueue.length;
  }

  /**
   * Clear all pending transactions from the queue.
   */
  clearTxQueue() {
    this._txQueue = [];
  }

  /**
   * Execute all queued transactions in order.
   * Each transaction is dispatched via showContractCall (Stacks Connect 8.x).
   * Results are written back to the queue entries.
   *
   * @async
   * @param {Function} [onProgress] - Called after each tx with (index, entry)
   * @returns {Promise<Array<Object>>} Resolved entries with status and result
   */
  async flushTxQueue(onProgress) {
    if (!this.isConnected()) throw new Error('Wallet not connected');
    if (this._txQueue.length === 0) return [];

    let openContractCall;
    try {
      const mod = await import('@stacks/connect');
      openContractCall = mod.openContractCall;
    } catch {
      throw new Error('@stacks/connect is required for transaction batching');
    }

    const results = [];

    for (let i = 0; i < this._txQueue.length; i++) {
      const entry = this._txQueue[i];
      if (entry.status !== TX_STATUS.PENDING) {
        results.push({ ...entry });
        continue;
      }

      try {
        entry.status = TX_STATUS.SIGNED;
        const result = await new Promise((resolve, reject) => {
          openContractCall({
            contractAddress:  entry.contractAddress,
            contractName:     entry.contractName,
            functionName:     entry.functionName,
            functionArgs:     entry.functionArgs || [],
            postConditionMode:entry.postConditionMode || 'deny',
            onFinish: (data) => {
              entry.status = TX_STATUS.BROADCAST;
              entry.result = data;
              resolve(data);
            },
            onCancel: () => {
              entry.status = TX_STATUS.PENDING;
              reject(new Error('User cancelled transaction'));
            },
          });
        });

        entry.result = result;
        entry.status = TX_STATUS.BROADCAST;
      } catch (error) {
        entry.status = TX_STATUS.FAILED;
        entry.error  = error.message;
      }

      if (typeof onProgress === 'function') {
        onProgress(i, { ...entry });
      }
      results.push({ ...entry });
    }

    return results;
  }

  // ── Internal setter (kept for backward compat) ───────────────────────────
  setAddress(address) {
    this._address = address;
    this._emit();
  }
}

/**
 * Singleton instance of WalletService.
 * @type {WalletService}
 */
export const walletService = new WalletService();
