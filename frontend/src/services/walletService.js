// Wallet service for managing Stacks wallet connections
'use client';

import { showConnect } from '@stacks/connect';
import { appDetails, userSession } from '../config/walletConfig';

class WalletService {
  constructor() {
    this._address = null;
    this._listeners = new Set();
    this.userSession = userSession;

    // Check if already signed in
    if (typeof window !== 'undefined' && this.userSession.isUserSignedIn()) {
      this._updateAddress();
    }
  }

  _updateAddress() {
    if (this.userSession.isUserSignedIn()) {
      const userData = this.userSession.loadUserData();
      this._address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
    } else {
      this._address = null;
    }
    this._emit();
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

  // Connect wallet using Stacks Connect
  async connect() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        return reject(new Error('Wallet can only be connected in the browser environment'));
      }

      if (this.isConnected()) {
        return resolve(this._address);
      }

      showConnect({
        appDetails,
        onFinish: () => {
          this._updateAddress();
          resolve(this._address);
        },
        onCancel: () => {
          reject(new Error('User canceled wallet connection'));
        },
        userSession: this.userSession,
          name: 'GeneTrust',
          icon: (typeof window !== 'undefined' ? window.location.origin : '') + '/favicon.svg',
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
    if (this.userSession && this.userSession.isUserSignedIn()) {
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
