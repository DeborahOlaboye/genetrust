/**
 * @file LedgerWalletService — hardware wallet integration via Ledger WebHID/WebUSB
 * @module services/wallet/LedgerWalletService
 *
 * Uses @ledgerhq/hw-transport-webhid (preferred) or @ledgerhq/hw-transport-webusb
 * as the transport layer, and @zondax/ledger-stacks to communicate with the Stacks
 * app running on the device.
 *
 * The class follows the same BaseWalletService interface used by HiroWalletService
 * and ReownWalletService so it can be dropped into the WalletManager.
 */

import { BaseWalletService } from './BaseWalletService';
import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'LedgerWalletService' });

// BIP-44 derivation path for Stacks (coin-type 5757)
const DEFAULT_DERIVATION_PATH = "m/44'/5757'/0'/0/0";

// Ledger success return code
const LEDGER_OK = 0x9000;

export class LedgerWalletService extends BaseWalletService {
  /**
   * @param {Object} [config]
   * @param {string} [config.network='testnet']   - 'mainnet' | 'testnet'
   * @param {string} [config.transport='webhid']  - 'webhid' | 'webusb'
   * @param {string} [config.derivationPath]      - BIP-44 derivation path override
   */
  constructor(config = {}) {
    super();

    this._config = {
      network:        config.network        || 'testnet',
      transport:      config.transport      || 'webhid',
      derivationPath: config.derivationPath || DEFAULT_DERIVATION_PATH,
    };

    this._transport    = null;
    this._stacksApp    = null;
    this._publicKey    = null;
    this._isInitialized = false;
  }

  // ── BaseWalletService overrides ─────────────────────────────────────────

  async init() {
    // Ledger does not have a background session — nothing to restore.
    this._isInitialized = true;
  }

  /**
   * Open a transport connection to the Ledger device and derive the first
   * Stacks address.  Resolves with the full wallet state object.
   *
   * @returns {Promise<Object>} Wallet state { address, isConnected, network, provider }
   */
  async connect() {
    if (this._isConnected) return this.getState();

    const TransportClass = await this._loadTransport();
    const StacksApp      = await this._loadStacksApp();

    try {
      this._transport = await TransportClass.create();
      this._stacksApp = new StacksApp(this._transport);

      const mainnet  = this._config.network === 'mainnet';
      const response = await this._stacksApp.getAddressAndPubKey(
        this._config.derivationPath,
        mainnet,
      );

      if (response.returnCode !== LEDGER_OK) {
        throw new Error(
          `Ledger returned error code 0x${response.returnCode.toString(16)}. ` +
          'Ensure the Stacks app is open on the device.'
        );
      }

      this._address    = response.address;
      this._publicKey  = response.publicKey?.toString('hex') || null;
      this._isConnected = true;

      logger.info('Ledger connected', { address: this._address });
      this._emit();

      return this.getState();
    } catch (error) {
      await this._closeTransport();
      logger.error('Ledger connect failed', { error });
      throw error;
    }
  }

  /**
   * Close the transport and mark the service as disconnected.
   */
  async disconnect() {
    await this._closeTransport();
    this._address     = null;
    this._publicKey   = null;
    this._isConnected = false;
    this._stacksApp   = null;
    logger.info('Ledger disconnected');
    this._emit();
  }

  /**
   * Request the Ledger device to sign a personal message.
   * The user must confirm the action on the physical device.
   *
   * @param {string} message - UTF-8 message to sign
   * @returns {Promise<string>} Hex-encoded DER signature
   */
  async signMessage(message) {
    this._requireConnected();

    const msgBuffer = Buffer.from(message, 'utf8');
    const response  = await this._stacksApp.sign(this._config.derivationPath, msgBuffer);

    if (response.returnCode !== LEDGER_OK) {
      throw new Error(`Ledger sign error: 0x${response.returnCode.toString(16)}`);
    }

    return response.signatureDER?.toString('hex') || '';
  }

  /**
   * Ledger does not broadcast transactions directly — it only signs them.
   * This method is a placeholder to satisfy the BaseWalletService interface.
   * Callers should use signTransaction() for hardware-signed transactions.
   *
   * @throws {Error} Always — use signTransaction() instead.
   */
  async sendTransaction() {
    throw new Error(
      'Ledger does not broadcast transactions. ' +
      'Use LedgerWalletService.signTransaction() to sign, then broadcast separately.'
    );
  }

  // ── Ledger-specific methods ─────────────────────────────────────────────

  /**
   * Sign a pre-built Stacks transaction buffer using the Ledger device.
   *
   * @param {Buffer|Uint8Array} txBuffer - Serialised unsigned transaction
   * @returns {Promise<string>} Hex-encoded signature
   */
  async signTransaction(txBuffer) {
    this._requireConnected();

    const response = await this._stacksApp.sign(
      this._config.derivationPath,
      Buffer.isBuffer(txBuffer) ? txBuffer : Buffer.from(txBuffer),
    );

    if (response.returnCode !== LEDGER_OK) {
      throw new Error(`Ledger sign error: 0x${response.returnCode.toString(16)}`);
    }

    return response.signatureDER?.toString('hex') || '';
  }

  /**
   * Return the compressed public key for the derived account (hex-encoded).
   * @returns {string|null}
   */
  getPublicKey() {
    return this._publicKey;
  }

  /**
   * Check whether a Ledger device is currently connected and responsive.
   * @returns {Promise<boolean>}
   */
  async isDeviceReady() {
    if (!this._transport || !this._stacksApp) return false;
    try {
      const response = await this._stacksApp.getVersion();
      return response.returnCode === LEDGER_OK;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve the Stacks app version running on the Ledger device.
   * @returns {Promise<string>} e.g. '0.24.0'
   */
  async getDeviceAppVersion() {
    this._requireConnected();
    const response = await this._stacksApp.getVersion();
    if (response.returnCode !== LEDGER_OK) {
      throw new Error(`Could not read Ledger app version: 0x${response.returnCode.toString(16)}`);
    }
    return `${response.major}.${response.minor}.${response.patch}`;
  }

  /**
   * Derive an additional Stacks address from the device at the given account index.
   * Does not switch the active address.
   *
   * @param {number} accountIndex - BIP-44 account index (0-based)
   * @param {boolean} [mainnet=false]
   * @returns {Promise<string>} The derived address
   */
  async deriveAddress(accountIndex, mainnet = false) {
    this._requireConnected();

    const path     = `m/44'/5757'/${accountIndex}'/0/0`;
    const response = await this._stacksApp.getAddressAndPubKey(path, mainnet);

    if (response.returnCode !== LEDGER_OK) {
      throw new Error(`Ledger derive error: 0x${response.returnCode.toString(16)}`);
    }

    return response.address;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  async _loadTransport() {
    const transportType = this._config.transport;
    try {
      if (transportType === 'webusb') {
        const mod = await import('@ledgerhq/hw-transport-webusb');
        return mod.default || mod;
      }
      const mod = await import('@ledgerhq/hw-transport-webhid');
      return mod.default || mod;
    } catch {
      throw new Error(
        `Ledger transport '${transportType}' not installed. ` +
        `Run: npm install @ledgerhq/hw-transport-${transportType}`
      );
    }
  }

  async _loadStacksApp() {
    try {
      const mod = await import('@zondax/ledger-stacks');
      return mod.default || mod.StacksApp;
    } catch {
      throw new Error(
        'Ledger Stacks app library not installed. ' +
        'Run: npm install @zondax/ledger-stacks'
      );
    }
  }

  async _closeTransport() {
    if (this._transport) {
      await this._transport.close().catch(() => {});
      this._transport = null;
    }
  }

  _requireConnected() {
    if (!this._isConnected || !this._stacksApp) {
      throw new Error('Ledger is not connected. Call connect() first.');
    }
  }

  getState() {
    return {
      ...super.getState(),
      provider:   'Ledger',
      publicKey:  this._publicKey,
      transport:  this._config.transport,
    };
  }
}

export default LedgerWalletService;
