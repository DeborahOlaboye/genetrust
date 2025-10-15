// Simple global wallet service to share connected address across pages
// Works alongside Navigation.jsx which handles Stacks Connect UI.

class WalletService {
  constructor() {
    this._address = null;
    this._listeners = new Set();
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
