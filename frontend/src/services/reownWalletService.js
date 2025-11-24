import { reownConnector, walletConfig } from '../config/walletConfig';
import { createReownClient } from '@reown/appkit';

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
    console.error('Reown Wallet Error:', error);
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
    if (this._isInitialized || typeof window === 'undefined') return;
    
    try {
      // Auto-connect if previously connected
      await reownClient.autoConnect();
      
      // Subscribe to account changes
      this._unsubscribe = reownClient.subscribe((state) => {
        const address = state.address || null;
        if (this._address !== address) {
          this._address = address;
          this._emit();
        }
      });
      
      this._isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Reown wallet:', error);
      throw error;
    }
  }

  _emit() {
    this._listeners.forEach(callback => {
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
    try {
      if (this.isConnected()) return this._address;
      
      await reownClient.connect();
      return this._address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await reownClient.disconnect();
      this._address = null;
      this._emit();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  setAddress(addr) {
    this._address = addr || null;
    this._emit();
  }

  // Clean up on destroy
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._listeners.clear();
  }
}

// Create and initialize the service
const reownWalletService = new ReownWalletService();

// Initialize when running in browser
if (typeof window !== 'undefined') {
  reownWalletService.init().catch(console.error);
}

export default reownWalletService;
  }

  async signMessage(message) {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }
    try {
      const signature = await reownClient.signMessage({ message });
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  _emit() {
    this._listeners.forEach(listener => listener(this._address));
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
