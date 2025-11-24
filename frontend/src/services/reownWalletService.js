import { reownClient, walletConfig } from '../config/walletConfig';
import { ErrorCodes, AppError, withErrorHandling } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';

// Create a scoped logger for this service
const logger = createLogger({ module: 'ReownWalletService' });

// Reown client is now imported from walletConfig
});

class ReownWalletService {
  constructor() {
    this._address = null;
    this._listeners = new Set();
    this._unsubscribe = null;
    this._isInitialized = false;
  }

  async init() {
    return withErrorHandling(async () => {
      if (this._isInitialized || typeof window === 'undefined') {
        logger.debug('Wallet service already initialized or running in SSR');
        return;
      }
      
      logger.info('Initializing Reown wallet service');
      
      try {
      }
      
      this._isInitialized = true;
      logger.info('Reown Wallet Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Reown Wallet Service', error);
      throw new AppError(
        'Failed to initialize wallet service',
        ErrorCodes.WALLET_INIT_FAILED,
        { cause: error }
      );
    }
  }

  _emit() {
    logger.debug('Emitting wallet state change', { address: this._address });
    this._listeners.forEach((callback, i) => {
      try {
        callback(this._address);
      } catch (error) {
        console.error('Error in wallet listener:', error);
      }
    });
  }

  addListener(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  getAddress() {
    return this._address;
  }

  isConnected() {
    return !!this._address;
  }

  async connect() {
    if (!this._isInitialized) {
      await this.init();
    }
    
    try {
      const accounts = await reownClient.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        this._address = accounts[0];
        this._emit();
        return this._address;
      }
      throw new Error('No accounts returned from wallet');
    } catch (error) {
      logger.error('Failed to connect wallet', error);
      throw new AppError(
        'Failed to connect wallet',
        ErrorCodes.WALLET_CONNECTION_FAILED,
        { cause: error }
      );
    }
  }

  async disconnect() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    
    try {
      // Not all wallets support disconnect, so we'll just reset the state
      this._address = null;
      this._emit();
      logger.info('Wallet disconnected');
    } catch (error) {
      logger.error('Failed to disconnect wallet', error);
      throw new AppError(
        'Failed to disconnect wallet',
        ErrorCodes.WALLET_DISCONNECT_FAILED,
        { cause: error }
      );
    }
  }

  async signMessage(message) {
    if (!this._address) {
      throw new AppError(
        'Wallet not connected',
        ErrorCodes.WALLET_NOT_CONNECTED
      );
    }
    
    try {
      const signature = await reownClient.request({
        method: 'personal_sign',
        params: [message, this._address, ''], // Empty string as password parameter
      });
      return signature;
    } catch (error) {
      logger.error('Failed to sign message', error);
      throw new AppError(
        'Failed to sign message',
        ErrorCodes.WALLET_SIGNATURE_FAILED,
        { cause: error }
      );
    }
  }

  // Clean up on destroy
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  onAddressChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // Cleanup
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }
}

// Create and initialize the service
const reownWalletService = new ReownWalletService();

// Initialize when running in browser
if (typeof window !== 'undefined') {
  reownWalletService.init().catch(console.error);
}

export { reownWalletService as walletService };
export default reownWalletService;
