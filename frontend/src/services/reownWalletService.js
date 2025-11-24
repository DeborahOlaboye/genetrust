import { reownConnector, walletConfig } from '../config/walletConfig';
import { createReownClient } from '@reown/appkit';
import { ErrorCodes, AppError, withErrorHandling } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';

// Create a scoped logger for this service
const logger = createLogger({ module: 'ReownWalletService' });

// Initialize Reown client with proper configuration
const reownClient = createReownClient({
  appName: walletConfig.appDetails.name,
  appIcon: walletConfig.appDetails.icon,
  appUrl: walletConfig.appDetails.url,
  connectors: [reownConnector],
  autoConnect: true,
  chains: reownConnector.chains,
  ssr: true,
  onError: (error) => {
    logger.error('Reown Wallet Error', error);
  }
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
        // Auto-connect if previously connected
        logger.debug('Attempting to auto-connect wallet');
        await reownClient.autoConnect();
        
        // Subscribe to account changes
        this._unsubscribe = reownClient.subscribe((state) => {
          const address = state.address || null;
          logger.debug('Account state changed', { newAddress: address });
          
          if (this._address !== address) {
            this._address = address;
            logger.info(`Wallet ${address ? 'connected' : 'disconnected'}`, { address });
            this._emit();
          }
        });
        
        this._isInitialized = true;
        logger.info('Reown wallet service initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Reown wallet', error);
        throw new AppError('WALLET_CONNECTION_FAILED', error);
      }
    }, { method: 'init' });
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
    return withErrorHandling(async () => {
      logger.info('Connecting wallet');
      
      if (this.isConnected()) {
        logger.debug('Wallet already connected', { address: this._address });
        return this._address;
      }
      
      try {
        await reownClient.connect();
        logger.info('Wallet connected successfully', { address: this._address });
        return this._address;
      } catch (error) {
        logger.error('Failed to connect wallet', error);
        throw new AppError('WALLET_CONNECTION_FAILED', error);
      }
    }, { method: 'connect' });
  }

  async disconnect() {
    return withErrorHandling(async () => {
      logger.info('Disconnecting wallet');
      
      if (!this.isConnected()) {
        logger.debug('No active wallet connection to disconnect');
        return;
      }
      
      try {
        await reownClient.disconnect();
        this._address = null;
        logger.info('Wallet disconnected successfully');
        this._emit();
      } catch (error) {
        logger.error('Failed to disconnect wallet', error);
        throw new AppError('WALLET_DISCONNECT_FAILED', error);
      }
    }, { method: 'disconnect' });
  }

  async signMessage(message) {
    return withErrorHandling(async () => {
      if (!this.isConnected()) {
        throw new AppError('WALLET_NOT_CONNECTED');
      }
      
      logger.info('Signing message');
      try {
        const signature = await reownClient.signMessage({ message });
        logger.debug('Message signed successfully');
        return signature;
      } catch (error) {
        logger.error('Failed to sign message', error);
        throw new AppError('WALLET_SIGN_FAILED', error);
      }
    }, { method: 'signMessage' });
  }

  // Clean up on destroy

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
