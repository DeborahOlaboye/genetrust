import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'BaseWalletService' });

/**
 * Base class for all wallet services
 * Defines the common interface that all wallet providers must implement
 */
export class BaseWalletService {
  constructor() {
    if (new.target === BaseWalletService) {
      throw new Error('Cannot instantiate BaseWalletService directly');
    }
    this._listeners = new Set();
    this._address = null;
    this._isConnected = false;
    this._network = null;
  }

  // Abstract methods that must be implemented by subclasses
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  async signMessage(message) {
    throw new Error('signMessage() must be implemented by subclass');
  }

  async sendTransaction(transaction) {
    throw new Error('sendTransaction() must be implemented by subclass');
  }

  // Common methods with default implementations
  addListener(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  removeListener(callback) {
    this._listeners.delete(callback);
  }

  _emit() {
    const state = this.getState();
    this._listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        logger.error('Error in wallet listener', { error });
      }
    });
  }

  getAddress() {
    return this._address;
  }

  isConnected() {
    return this._isConnected;
  }

  getNetwork() {
    return this._network;
  }

  getState() {
    return {
      address: this._address,
      isConnected: this._isConnected,
      network: this._network,
      provider: this.constructor.name.replace('Service', '')
    };
  }

  // Utility methods
  _validateAddress(address) {
    // Basic address validation for Stacks addresses
    return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{28,41}$/i.test(address);
  }

  // Cleanup
  destroy() {
    this._listeners.clear();
    this._address = null;
    this._isConnected = false;
    this._network = null;
  }
}

export default BaseWalletService;
