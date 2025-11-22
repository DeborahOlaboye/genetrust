import { config, reownConnector } from '../config/walletConfig';
import { createReownClient } from '@reown/appkit';

// Initialize Reown client
const reownClient = createReownClient({
  appName: 'GeneTrust',
  appIcon: '/logo192.png',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz',
  connectors: [reownConnector],
  autoConnect: true,
  chains: config.chains,
  ssr: true
});

class ReownWalletService {
  constructor() {
    this._address = null;
    this._listeners = new Set();
    this._unsubscribe = null;
    this._isInitialized = false;
  }

  async init() {
    if (this._isInitialized) return;
    
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
  }

  getAddress() {
    return this._address;
  }

  isConnected() {
    return !!this._address;
  }

  setAddress(addr) {
    this._address = addr || null;
    this._emit();
  }

  async connect() {
    try {
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
      this.setAddress(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
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
