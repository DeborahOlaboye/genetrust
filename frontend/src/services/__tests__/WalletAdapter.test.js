import { WalletAdapter } from '../../services/wallet/WalletAdapter';

describe('WalletAdapter', () => {
  it('throws when abstract methods are not implemented', async () => {
    const adapter = new WalletAdapter();

    expect(() => adapter.getName()).toThrow(/not implemented/);
    expect(() => adapter.getDisplayName()).toThrow(/not implemented/);
    await expect(adapter.isAvailable()).rejects.toThrow(/not implemented/);
    await expect(adapter.connect()).rejects.toThrow(/not implemented/);
    await expect(adapter.disconnect()).rejects.toThrow(/not implemented/);
    expect(() => adapter.getAddress()).toThrow(/not implemented/);
    expect(() => adapter.isConnected()).toThrow(/not implemented/);
    expect(() => adapter.subscribe(() => {})).toThrow(/not implemented/);
    await expect(adapter.getAccounts()).rejects.toThrow(/not implemented/);
    await expect(adapter.signMessage('test')).rejects.toThrow(/not implemented/);
  });

  it('allows concrete subclasses to implement the full adapter contract', async () => {
    class ConcreteAdapter extends WalletAdapter {
      getName() { return 'concrete'; }
      getDisplayName() { return 'Concrete Wallet'; }
      async isAvailable() { return true; }
      async connect() { return { address: 'ST123' }; }
      async disconnect() { return; }
      getAddress() { return 'ST123'; }
      isConnected() { return true; }
      subscribe(cb) { cb(this.getState ? this.getState() : {}); return () => {}; }
      async getAccounts() { return [{ address: 'ST123' }]; }
      async signMessage(message) { return { signature: `signed:${message}`, publicKey: 'pubkey' }; }
    }

    const concrete = new ConcreteAdapter();
    expect(concrete.getName()).toBe('concrete');
    expect(concrete.getDisplayName()).toBe('Concrete Wallet');
    await expect(concrete.isAvailable()).resolves.toBe(true);
    expect(concrete.getAddress()).toBe('ST123');
    expect(concrete.isConnected()).toBe(true);
    const accounts = await concrete.getAccounts();
    expect(accounts).toEqual([{ address: 'ST123' }]);
    const result = await concrete.signMessage('hello');
    expect(result).toEqual({ signature: 'signed:hello', publicKey: 'pubkey' });
  });
});
