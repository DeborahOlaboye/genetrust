import { createLogger } from '../../utils/logger';
import { ReownWalletService } from './ReownWalletService';
import { HiroWalletService } from './HiroWalletService';

const logger = createLogger({ module: 'WalletManager' });

const PROVIDERS = {
  REOWN: 'reown',
  HIRO: 'hiro'
};

class WalletManager {
  constructor(config = {}) {
    this._config = {
      defaultProvider: config.defaultProvider || PROVIDERS.REOWN,
      providers: {
        [PROVIDERS.REOWN]: {
          enabled: true,
          ...(config.providers?.[PROVIDERS.REOWN] || {})
        },
        [PROVIDERS.HIRO]: {
          enabled: true,
          ...(config.providers?.[PROVIDERS.HIRO] || {})
        },
        ...(config.providers || {})
      },
      ...config
    };

    this._currentProvider = null;
    this._providers = new Map();
    this._listeners = new Set();
    this._isInitialized = false;

    // Initialize enabled providers
    this._initializeProviders();
  }

  _initializeProviders() {
    // Initialize Reown if enabled
    if (this._config.providers[PROVIDERS.REOWN]?.enabled !== false) {
      try {
        const reownService = new ReownWalletService({
          ...this._config.providers[PROVIDERS.REOWN],
          network: this._config.network
        });
        this._providers.set(PROVIDERS.REOWN, reownService);
      } catch (error) {
        logger.error('Failed to initialize Reown wallet', { error });
      }
    }

    // Initialize Hiro if enabled
    if (this._config.providers[PROVIDERS.HIRO]?.enabled !== false) {
      try {
        const hiroService = new HiroWalletService({
          ...this._config.providers[PROVIDERS.HIRO],
          network: this._config.network
        });
        this._providers.set(PROVIDERS.HIRO, hiroService);
      } catch (error) {
        logger.error('Failed to initialize Hiro wallet', { error });
      }
    }
  }

  async init() {
    if (this._isInitialized) return;

    try {
      // Initialize all providers
      await Promise.all(
        Array.from(this._providers.values()).map(provider => 
          provider.init().catch(error => {
            logger.error(`Failed to initialize ${provider.constructor.name}`, { error });
            return null;
          })
        )
      );

      // Set the default provider if not set
      if (!this._currentProvider && this._providers.has(this._config.defaultProvider)) {
        this._currentProvider = this._providers.get(this._config.defaultProvider);
      }

      this._isInitialized = true;
      logger.info('Wallet manager initialized', { 
        providers: Array.from(this._providers.keys()),
        defaultProvider: this._config.defaultProvider
      });
    } catch (error) {
      logger.error('Failed to initialize wallet manager', { error });
      throw error;
    }
  }

  async connect(providerName) {
    if (!this._isInitialized) {
      await this.init();
    }

    const provider = this._getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found or not enabled`);
    }

    try {
      // Disconnect current provider if different
      if (this._currentProvider && this._currentProvider !== provider) {
        await this.disconnect();
      }

      this._currentProvider = provider;
      const state = await provider.connect();
      this._emit();
      return state;
    } catch (error) {
      logger.error(`Failed to connect to ${providerName} wallet`, { error });
      throw error;
    }
  }

  async disconnect() {
    if (!this._currentProvider) return;

    try {
      await this._currentProvider.disconnect();
      this._currentProvider = null;
      this._emit();
    } catch (error) {
      logger.error('Failed to disconnect wallet', { error });
      throw error;
    }
  }

  async signMessage(message) {
    if (!this._currentProvider) {
      throw new Error('No wallet connected');
    }
    return this._currentProvider.signMessage(message);
  }

  async sendTransaction(transaction) {
    if (!this._currentProvider) {
      throw new Error('No wallet connected');
    }
    return this._currentProvider.sendTransaction(transaction);
  }

  getCurrentProvider() {
    return this._currentProvider ? this._getProviderName(this._currentProvider) : null;
  }

  getProviders() {
    return Array.from(this._providers.keys());
  }

  getProvider(providerName) {
    return this._providers.get(providerName) || null;
  }

  getState() {
    return {
      address: this._currentProvider?.getAddress() || null,
      isConnected: this._currentProvider?.isConnected() || false,
      network: this._currentProvider?.getNetwork()?.coreApiUrl || null,
      provider: this._currentProvider ? this._getProviderName(this._currentProvider) : null,
      availableProviders: this.getProviders()
    };
  }

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
        logger.error('Error in wallet manager listener', { error });
      }
    });
  }

  _getProvider(providerName) {
    if (!providerName && this._currentProvider) {
      return this._currentProvider;
    }
    return this._providers.get(providerName) || null;
  }

  _getProviderName(provider) {
    for (const [name, p] of this._providers.entries()) {
      if (p === provider) {
        return name;
      }
    }
    return null;
  }

  destroy() {
    // Clean up all providers
    this._providers.forEach(provider => {
      try {
        if (typeof provider.destroy === 'function') {
          provider.destroy();
        }
      } catch (error) {
        logger.error('Error destroying wallet provider', { error });
      }
    });

    this._providers.clear();
    this._currentProvider = null;
    this._listeners.clear();
    this._isInitialized = false;
  }
}

// Export the wallet manager and provider constants
export { PROVIDERS };
export default WalletManager;
