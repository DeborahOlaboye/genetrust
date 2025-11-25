import { AppConfig, UserSession } from '@stacks/auth';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { createReownClient } from '@reown/appkit';
import { ErrorCodes, AppError, withErrorHandling } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';

// Create a scoped logger for this service
const logger = createLogger({ module: 'ReownWalletService' });

// Stacks Network Configuration
const network = process.env.NODE_ENV === 'production' 
  ? new StacksMainnet() 
  : new StacksTestnet();

// Initialize Reown Client
const reownClient = createReownClient({
  appName: 'GeneTrust',
  appIcon: typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz',
  network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
  // Add any additional Reown configuration here
});

class ReownWalletService {
  constructor() {
    this._address = null;
    this._listeners = new Set();
    this._unsubscribe = null;
    this._isInitialized = false;
    this._reownClient = reownClient;
  }

  async init() {
    return withErrorHandling(async () => {
      if (this._isInitialized || typeof window === 'undefined') {
        logger.debug('Wallet service already initialized or running in SSR');
        return;
      }
      
      logger.info('Initializing Reown wallet service');
      
      try {
        // Initialize Reown client
        await this._reownClient.init();
        
        // Check if already connected
        const accounts = await this._reownClient.getAccounts();
        if (accounts && accounts.length > 0) {
          this._address = accounts[0];
          this._emit();
        }
        
        // Set up event listeners
        this._setupEventListeners();
        
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
    });
  }

  _setupEventListeners() {
    // Listen for account changes
    this._reownClient.on('accountsChanged', (accounts) => {
      logger.debug('Accounts changed', { accounts });
      this._address = accounts && accounts.length > 0 ? accounts[0] : null;
      this._emit();
    });
    
    // Listen for chain changes
    this._reownClient.on('chainChanged', (chainId) => {
      logger.debug('Chain changed', { chainId });
      window.location.reload();
    });
    
    // Listen for disconnects
    this._reownClient.on('disconnect', () => {
      logger.debug('Wallet disconnected');
      this._address = null;
      this._emit();
    });
  }

  _emit() {
    logger.debug('Emitting wallet state change', { address: this._address });
    this._listeners.forEach((callback) => {
      try {
        callback(this._address);
      } catch (error) {
        logger.error('Error in wallet listener:', error);
      }
    });
  }

  // Add a listener for wallet state changes
  addListener(callback) {
    this._listeners.add(callback);
    // Return cleanup function
    return () => this._listeners.delete(callback);
  }

  // Get current connected address
  getAddress() {
    return this._address;
  }

  // Connect wallet
  async connect() {
    return withErrorHandling(async () => {
      logger.info('Connecting wallet');
      try {
        await this._reownClient.connect();
        const accounts = await this._reownClient.getAccounts();
        if (accounts && accounts.length > 0) {
          this._address = accounts[0];
          this._emit();
          return this._address;
        }
        throw new Error('No accounts found');
      } catch (error) {
        logger.error('Failed to connect wallet', error);
        throw new AppError(
          'Failed to connect wallet',
          ErrorCodes.WALLET_CONNECTION_FAILED,
          { cause: error }
        );
      }
    });
  }

  // Disconnect wallet
  async disconnect() {
    return withErrorHandling(async () => {
      logger.info('Disconnecting wallet');
      try {
        await this._reownClient.disconnect();
        this._address = null;
        this._emit();
      } catch (error) {
        logger.error('Failed to disconnect wallet', error);
        throw new AppError(
          'Failed to disconnect wallet',
          ErrorCodes.WALLET_DISCONNECT_FAILED,
          { cause: error }
        );
      }
    });
  }

  // Sign a message
  async signMessage(message) {
    return withErrorHandling(async () => {
      if (!this._address) {
        throw new AppError('Wallet not connected', ErrorCodes.WALLET_NOT_CONNECTED);
      }
      
      try {
        return await this._reownClient.signMessage({
          message,
          address: this._address,
        });
      } catch (error) {
        logger.error('Failed to sign message', { error, message });
        throw new AppError(
          'Failed to sign message',
          ErrorCodes.MESSAGE_SIGNING_FAILED,
          { cause: error }
        );
      }
    });
  }

  // Send a transaction
  async sendTransaction(transaction) {
    return withErrorHandling(async () => {
      if (!this._address) {
        throw new AppError('Wallet not connected', ErrorCodes.WALLET_NOT_CONNECTED);
      }
      
      try {
        return await this._reownClient.sendTransaction({
          ...transaction,
          from: this._address,
        });
      } catch (error) {
        logger.error('Failed to send transaction', { error, transaction });
        throw new AppError(
          'Failed to send transaction',
          ErrorCodes.TRANSACTION_FAILED,
          { cause: error }
        );
      }
    });
  }

  // Get the Reown client instance
  getClient() {
    return this._reownClient;
  }

  // Cleanup
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._listeners.clear();
    this._address = null;
    this._isInitialized = false;
  }

  // Check if wallet is connected
  isConnected() {
    return !!this._address;
  }
}

// Create and export a singleton instance
const reownWalletService = new ReownWalletService();

// Initialize when running in browser
if (typeof window !== 'undefined') {
  reownWalletService.init().catch(error => {
    console.error('Failed to initialize Reown wallet service:', error);
  });
}

export default reownWalletService;
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
