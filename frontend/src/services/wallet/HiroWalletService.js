import { AppConfig, UserSession } from '@stacks/auth';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import BaseWalletService from './BaseWalletService';
import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'HiroWalletService' });

export class HiroWalletService extends BaseWalletService {
  constructor(config = {}) {
    super();
    
    this._config = {
      appName: config.appName || 'GeneTrust',
      appIcon: config.appIcon || (typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png'),
      appDomain: config.appDomain || (typeof window !== 'undefined' ? window.location.hostname : 'genetrust.xyz'),
      network: config.network || 'mainnet',
      ...config
    };

    this._network = new (this._config.network === 'mainnet' ? StacksMainnet : StacksTestnet)();
    
    const appConfig = new AppConfig(
      ['store_write', 'publish_data'],
      this._config.appDomain,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { 
        sendToSignIn: false,
        userSession: this._config.userSession 
      }
    );

    this._userSession = this._config.userSession || new UserSession({ appConfig });
    this._isInitialized = false;
  }

  async init() {
    if (this._isInitialized) return;

    try {
      if (this._userSession.isUserSignedIn()) {
        const userData = this._userSession.loadUserData();
        this._address = userData.profile.stxAddress[this._config.network];
        this._isConnected = true;
        this._emit();
      }
      this._isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize Hiro wallet', { error });
      throw error;
    }
  }

  async connect() {
    if (this._isConnected) return this.getState();

    try {
      if (this._userSession.isUserSignedIn()) {
        this._userSession.signUserOut();
      }

      await this._userSession.redirectToSignIn();
      // The rest of the connection will be handled by the redirect back to the app
      return null;
    } catch (error) {
      logger.error('Failed to connect Hiro wallet', { error });
      throw error;
    }
  }

  async handlePendingAuth(authResponse) {
    try {
      await this._userSession.handlePendingSignIn(authResponse);
      const userData = this._userSession.loadUserData();
      this._address = userData.profile.stxAddress[this._config.network];
      this._isConnected = true;
      this._emit();
      return this.getState();
    } catch (error) {
      logger.error('Failed to handle pending auth', { error });
      throw error;
    }
  }

  async disconnect() {
    try {
      this._userSession.signUserOut();
      this._address = null;
      this._isConnected = false;
      this._emit();
    } catch (error) {
      logger.error('Failed to disconnect Hiro wallet', { error });
      throw error;
    }
  }

  async signMessage(message) {
    if (!this._isConnected || !this._address) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this._userSession.signMessage({
        message,
        privateKey: this._userSession.loadUserData().appPrivateKey
      });
    } catch (error) {
      logger.error('Failed to sign message with Hiro wallet', { error });
      throw error;
    }
  }

  async sendTransaction(transaction) {
    if (!this._isConnected || !this._address) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this._userSession.signTransaction({
        ...transaction,
        senderKey: this._userSession.loadUserData().appPrivateKey,
        network: this._network
      });
    } catch (error) {
      logger.error('Failed to send transaction with Hiro wallet', { error });
      throw error;
    }
  }

  getNetwork() {
    return this._network;
  }

  getUserSession() {
    return this._userSession;
  }

  destroy() {
    super.destroy();
    // No explicit cleanup needed for UserSession
  }
}

export default HiroWalletService;
