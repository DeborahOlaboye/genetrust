import { createReownClient } from '@reown/appkit';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import BaseWalletService from './BaseWalletService';
import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'ReownWalletService' });

export class ReownWalletService extends BaseWalletService {
  constructor(config = {}) {
    super();
    
    this._config = {
      appName: config.appName || 'GeneTrust',
      appIcon: config.appIcon || (typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png'),
      appUrl: config.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz'),
      network: config.network || 'mainnet',
      ...config
    };

    this._client = createReownClient(this._config);
    this._unsubscribe = null;
  }

  async init() {
    if (this._isInitialized) return;

    try {
      await this._client.init();
      this._setupEventListeners();
      this._isInitialized = true;
      
      // Check if already connected
      const accounts = await this._client.getAccounts();
      if (accounts && accounts.length > 0) {
        this._address = accounts[0];
        this._isConnected = true;
        this._network = this._config.network;
        this._emit();
      }
    } catch (error) {
      logger.error('Failed to initialize Reown wallet', { error });
      throw error;
    }
  }

  async connect() {
    if (this._isConnected) return this.getState();

    try {
      await this._client.connect();
      const accounts = await this._client.getAccounts();
      
      if (accounts && accounts.length > 0) {
        this._address = accounts[0];
        this._isConnected = true;
        this._network = this._config.network;
        this._emit();
        return this.getState();
      }
      
      throw new Error('No accounts found');
    } catch (error) {
      logger.error('Failed to connect Reown wallet', { error });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this._client.disconnect();
      this._address = null;
      this._isConnected = false;
      this._network = null;
      this._emit();
    } catch (error) {
      logger.error('Failed to disconnect Reown wallet', { error });
      throw error;
    }
  }

  async signMessage(message) {
    if (!this._isConnected || !this._address) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this._client.signMessage({
        message,
        address: this._address,
      });
    } catch (error) {
      logger.error('Failed to sign message with Reown wallet', { error });
      throw error;
    }
  }

  async sendTransaction(transaction) {
    if (!this._isConnected || !this._address) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this._client.sendTransaction({
        ...transaction,
        from: this._address,
      });
    } catch (error) {
      logger.error('Failed to send transaction with Reown wallet', { error });
      throw error;
    }
  }

  _setupEventListeners() {
    if (this._unsubscribe) return;

    const onAccountsChanged = (accounts) => {
      logger.debug('Accounts changed', { accounts });
      const newAddress = accounts && accounts.length > 0 ? accounts[0] : null;
      
      if (newAddress !== this._address) {
        this._address = newAddress;
        this._isConnected = !!newAddress;
        this._emit();
      }
    };

    const onDisconnect = (error) => {
      logger.warn('Wallet disconnected', { error });
      this._address = null;
      this._isConnected = false;
      this._network = null;
      this._emit();
    };

    this._client.on('accountsChanged', onAccountsChanged);
    this._client.on('disconnect', onDisconnect);
    this._client.on('chainChanged', () => window.location.reload());

    this._unsubscribe = () => {
      this._client.off('accountsChanged', onAccountsChanged);
      this._client.off('disconnect', onDisconnect);
      this._client.off('chainChanged');
    };
  }

  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    
    super.destroy();
    
    if (this._client && typeof this._client.destroy === 'function') {
      this._client.destroy();
    }
  }
}

export default ReownWalletService;
