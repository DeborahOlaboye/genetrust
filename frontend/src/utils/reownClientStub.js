/**
 * Local stub for Reown client until official @reown/appkit API is integrated.
 * Provides the interface expected by reownWalletService and WalletProvider.
 */
export function createReownClient(config = {}) {
  const listeners = {};

  return {
    config,
    async init() {},
    async connect() {
      return { accounts: [] };
    },
    async disconnect() {},
    async getAccounts() {
      return [];
    },
    async signMessage({ message }) {
      throw new Error('Reown signing not configured');
    },
    async sendTransaction(tx) {
      throw new Error('Reown transactions not configured');
    },
    async request(args) {
      throw new Error('Reown request not configured');
    },
    on(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    off(event, handler) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    },
  };
}
