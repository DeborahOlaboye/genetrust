// Simple global wallet service to share connected address across pages
// Works alongside Navigation.jsx which handles Stacks Connect UI.

import { AppConfig, UserSession, showConnect } from '@stacks/connect';

class WalletService {
  constructor() {
    this._address = null;
    this._listeners = new Set();

    // Initialize Stacks authentication
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    this.userSession = new UserSession({ appConfig });

    // Check if already signed in
    if (this.userSession.isUserSignedIn()) {
      const userData = this.userSession.loadUserData();
      this._address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
    }
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

  // Connect wallet using Stacks Connect
  async connect() {
    return new Promise((resolve, reject) => {
      showConnect({
        appDetails: {
          name: 'GeneTrust',
          icon: '/favicon.svg',
        },
        redirectTo: '/',
        onFinish: () => {
          if (this.userSession.isUserSignedIn()) {
            const userData = this.userSession.loadUserData();
            const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
            this.setAddress(address);
            resolve(address);
          } else {
            reject(new Error('User did not sign in'));
          }
        },
        onCancel: () => {
          reject(new Error('User cancelled connection'));
        },
        userSession: this.userSession,
      });
    });
  }

  // Disconnect wallet
  disconnect() {
    if (this.userSession.isUserSignedIn()) {
      this.userSession.signUserOut('/');
    }
    this.setAddress(null);
  }

  onChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _emit() {
    for (const cb of this._listeners) {
      try { cb(this._address); } catch {}
    }
  }
}

export const walletService = new WalletService();
