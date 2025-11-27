import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { createReownClient } from '@reown/appkit';
import { ErrorCodes, AppError, withErrorHandling } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

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
    this._sessionTimer = null;
    this._lastActivity = null;
    this._isReconnecting = false;
    
    // Initialize from session storage if available
    this._restoreSession();
    
    // Set up activity listeners for session timeout
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, this._updateLastActivity.bind(this));
      });
    }
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
        
        // Check if we have a persisted session
        const persistedSession = this._getPersistedSession();
        
        if (persistedSession && persistedSession.address) {
          try {
            const accounts = await this._reownClient.getAccounts();
            if (accounts && accounts.includes(persistedSession.address)) {
              this._address = persistedSession.address;
              this._updateLastActivity();
              this._startSessionTimer();
              this._emit();
              logger.info('Restored wallet session', { address: this._address });
            }
          } catch (error) {
            logger.warn('Failed to restore wallet session', { error });
            this._clearPersistedSession();
          }
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
      const newAddress = accounts && accounts.length > 0 ? accounts[0] : null;
      
      if (newAddress !== this._address) {
        this._address = newAddress;
        if (newAddress) {
          this._persistSession(newAddress);
          this._updateLastActivity();
        } else {
          this._clearPersistedSession();
          this._clearSessionTimer();
        }
        this._emit();
      }
    });
    
    // Listen for chain changes
    this._reownClient.on('chainChanged', (chainId) => {
      logger.debug('Chain changed', { chainId });
      this._updateLastActivity();
      window.location.reload();
    });
    
    // Listen for disconnects
    this._reownClient.on('disconnect', (error) => {
      logger.warn('Wallet disconnected', { error });
      this._handleDisconnect(error);
    });
    
    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this._address) {
          this._checkSessionValidity().catch(error => {
            logger.error('Session validation error', { error });
          });
        }
      });
    }
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
      if (this._isReconnecting) {
        throw new AppError('Connection attempt already in progress', ErrorCodes.WALLET_CONNECTION_IN_PROGRESS);
      }
      
      this._isReconnecting = true;
      logger.info('Connecting wallet');
      
      try {
        await this._reownClient.connect();
        const accounts = await this._reownClient.getAccounts();
        
        if (accounts && accounts.length > 0) {
          this._address = accounts[0];
          this._persistSession(this._address);
          this._updateLastActivity();
          this._startSessionTimer();
          this._emit();
          return this._address;
        }
        
        throw new AppError('No accounts found', ErrorCodes.NO_ACCOUNTS_FOUND);
      } catch (error) {
        const errorMessage = error instanceof AppError ? error.message : 'Failed to connect wallet';
        const errorCode = error.code || ErrorCodes.WALLET_CONNECTION_FAILED;
        
        logger.error(errorMessage, { 
          error,
          code: errorCode,
          stack: error.stack 
        });
        
        throw new AppError(
          errorMessage,
          errorCode,
          { cause: error }
        );
      } finally {
        this._isReconnecting = false;
      }
    });
  }

  // Disconnect wallet
  async disconnect(reason = 'User initiated') {
    return withErrorHandling(async () => {
      logger.info('Disconnecting wallet', { reason });
      
      try {
        await this._reownClient.disconnect();
      } catch (error) {
        logger.warn('Error during wallet disconnect', { error });
        // Continue with cleanup even if disconnect fails
      } finally {
        this._handleDisconnect(new Error(`Wallet disconnected: ${reason}`));
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
    // Clean up event listeners
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    
    // Clear timers
    this._clearSessionTimer();
    
    // Clear listeners and state
    this._listeners.clear();
    this._address = null;
    this._isInitialized = false;
    this._isReconnecting = false;
    
    // Remove session persistence
    this._clearPersistedSession();
    
    // Remove activity listeners
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.removeEventListener(event, this._updateLastActivity);
      });
    }
  }

  // Check if wallet is connected
  isConnected() {
    return !!this._address;
  }
}

  // Private methods for session management
  _persistSession(address) {
    try {
      const sessionData = {
        address,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('genetrust:wallet:session', JSON.stringify(sessionData));
      }
    } catch (error) {
      logger.error('Failed to persist session', { error });
    }
  }

  _getPersistedSession() {
    try {
      if (typeof localStorage === 'undefined') return null;
      
      const sessionData = localStorage.getItem('genetrust:wallet:session');
      if (!sessionData) return null;
      
      return JSON.parse(sessionData);
    } catch (error) {
      logger.error('Failed to get persisted session', { error });
      return null;
    }
  }

  _clearPersistedSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('genetrust:wallet:session');
      }
    } catch (error) {
      logger.error('Failed to clear persisted session', { error });
    }
  }

  _restoreSession() {
    try {
      const session = this._getPersistedSession();
      if (session && session.address) {
        this._address = session.address;
        this._lastActivity = session.timestamp || Date.now();
        return true;
      }
    } catch (error) {
      logger.error('Failed to restore session', { error });
      this._clearPersistedSession();
    }
    return false;
  }

  _updateLastActivity() {
    this._lastActivity = Date.now();
  }

  _startSessionTimer() {
    this._clearSessionTimer();
    
    this._sessionTimer = setInterval(() => {
      if (!this._lastActivity || !this._address) return;
      
      const inactiveTime = Date.now() - this._lastActivity;
      if (inactiveTime >= SESSION_TIMEOUT) {
        logger.info('Session timeout reached, disconnecting wallet');
        this.disconnect('Session timeout');
      }
    }, 60000); // Check every minute
  }

  _clearSessionTimer() {
    if (this._sessionTimer) {
      clearInterval(this._sessionTimer);
      this._sessionTimer = null;
    }
  }

  async _checkSessionValidity() {
    if (!this._address) return false;
    
    try {
      const accounts = await this._reownClient.getAccounts();
      const isStillConnected = accounts && accounts.includes(this._address);
      
      if (!isStillConnected) {
        logger.warn('Session no longer valid, disconnecting');
        this._handleDisconnect(new Error('Session no longer valid'));
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking session validity', { error });
      this._handleDisconnect(error);
      return false;
    }
  }

  _handleDisconnect(error) {
    // Clear session data
    this._address = null;
    this._clearPersistedSession();
    this._clearSessionTimer();
    
    // Emit the disconnection
    this._emit();
    
    // Log the disconnection
    if (error) {
      logger.warn('Wallet disconnected with error', { 
        error: error.message,
        code: error.code,
        stack: error.stack 
      });
    } else {
      logger.info('Wallet disconnected');
    }
  }
}

// Create and export a singleton instance
const reownWalletService = new ReownWalletService();

// Initialize when running in browser
if (typeof window !== 'undefined') {
  reownWalletService.init().catch(error => {
    console.error('Failed to initialize Reown wallet service:', error);
    // Clear any invalid session data
    reownWalletService._clearPersistedSession();
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
