import WalletManager, { PROVIDERS } from '../../services/wallet/WalletManager';

describe('WalletManager', () => {
  let manager;
  let DummyProvider;

  beforeEach(() => {
    localStorage.clear();

    DummyProvider = class {
      constructor(name) {
        this.name = name;
        this._connected = false;
        this._address = `${name}_address`;
        this._network = { coreApiUrl: `${name}_network` };
      }

      async init() {
        return true;
      }

      async connect() {
        this._connected = true;
        return { provider: this.name, address: this._address };
      }

      async disconnect() {
        this._connected = false;
      }

      isConnected() {
        return this._connected;
      }

      getAddress() {
        return this._address;
      }

      getNetwork() {
        return this._network;
      }

      getState() {
        return {
          address: this._address,
          isConnected: this._connected,
          network: this._network,
          provider: this.name,
        };
      }
    };

    manager = new WalletManager({
      defaultProvider: PROVIDERS.REOWN,
      providers: {
        [PROVIDERS.REOWN]: { enabled: true },
        [PROVIDERS.HIRO]: { enabled: true },
        [PROVIDERS.LEDGER]: { enabled: false },
      }
    });

    manager._providers.clear();
    manager._providers.set(PROVIDERS.REOWN, new DummyProvider(PROVIDERS.REOWN));
    manager._providers.set(PROVIDERS.HIRO, new DummyProvider(PROVIDERS.HIRO));
  });

  it('restores the persisted provider on init', async () => {
    localStorage.setItem('genetrust_active_wallet_provider', PROVIDERS.HIRO);

    await manager.init();

    expect(manager.getCurrentProvider()).toBe(PROVIDERS.HIRO);
  });

  it('persists the provider name after connect', async () => {
    await manager.init();
    await manager.connect(PROVIDERS.HIRO);

    expect(localStorage.getItem('genetrust_active_wallet_provider')).toBe(PROVIDERS.HIRO);
    expect(manager.getCurrentProvider()).toBe(PROVIDERS.HIRO);
  });

  it('clears the persisted provider after disconnect', async () => {
    await manager.init();
    await manager.connect(PROVIDERS.REOWN);
    await manager.disconnect();

    expect(localStorage.getItem('genetrust_active_wallet_provider')).toBeNull();
    expect(manager.getCurrentProvider()).toBeNull();
  });

  it('returns provider metadata for an enabled provider', async () => {
    await manager.init();

    const metadata = manager.getProviderMetadata(PROVIDERS.REOWN);
    expect(metadata).toEqual({
      name: PROVIDERS.REOWN,
      isConnected: false,
      address: null,
      network: { coreApiUrl: `${PROVIDERS.REOWN}_network` },
    });
  });

  it('does not return metadata for a missing provider', () => {
    expect(manager.getProviderMetadata('missing')).toBeNull();
  });
});
