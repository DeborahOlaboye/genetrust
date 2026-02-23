/**
 * Tests for LedgerWalletService
 */

// ── Shared mocks ──────────────────────────────────────────────────────────────

const MOCK_ADDRESS   = 'ST1AAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const MOCK_PUBLIC_KEY = Buffer.from('02abcdef1234567890abcdef', 'hex');
const LEDGER_OK       = 0x9000;

const mockStacksApp = {
  getAddressAndPubKey: jest.fn(),
  sign:                jest.fn(),
  getVersion:          jest.fn(),
};

const MockStacksAppCtor = jest.fn(() => mockStacksApp);

const mockTransport = {
  close: jest.fn().mockResolvedValue(undefined),
};

const MockTransportClass = {
  create: jest.fn().mockResolvedValue(mockTransport),
};

// Mock dynamic imports
jest.mock(
  '@ledgerhq/hw-transport-webhid',
  () => ({ default: MockTransportClass }),
  { virtual: true },
);

jest.mock(
  '@zondax/ledger-stacks',
  () => ({ default: MockStacksAppCtor }),
  { virtual: true },
);

jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  }),
}));

// ── Import under test ─────────────────────────────────────────────────────────

import { LedgerWalletService } from '../wallet/LedgerWalletService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeService = (config = {}) => new LedgerWalletService({ network: 'testnet', ...config });

const mockOkAddress = () => {
  mockStacksApp.getAddressAndPubKey.mockResolvedValue({
    returnCode: LEDGER_OK,
    address:    MOCK_ADDRESS,
    publicKey:  MOCK_PUBLIC_KEY,
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LedgerWalletService – constructor', () => {
  it('creates an instance without connecting', () => {
    const svc = makeService();
    expect(svc.isConnected()).toBe(false);
    expect(svc.getAddress()).toBeNull();
    expect(svc.getPublicKey()).toBeNull();
  });

  it('uses testnet by default', () => {
    const svc = makeService();
    expect(svc._config.network).toBe('testnet');
  });

  it('uses webhid transport by default', () => {
    const svc = makeService();
    expect(svc._config.transport).toBe('webhid');
  });
});

describe('LedgerWalletService – init', () => {
  it('marks service as initialized without opening a transport', async () => {
    const svc = makeService();
    await svc.init();
    expect(svc._isInitialized).toBe(true);
    expect(MockTransportClass.create).not.toHaveBeenCalled();
  });
});

describe('LedgerWalletService – connect', () => {
  beforeEach(() => {
    MockTransportClass.create.mockResolvedValue(mockTransport);
    mockOkAddress();
  });

  afterEach(() => jest.clearAllMocks());

  it('opens a transport and derives the first address', async () => {
    const svc = makeService();
    const state = await svc.connect();
    expect(state.address).toBe(MOCK_ADDRESS);
    expect(svc.isConnected()).toBe(true);
  });

  it('sets isConnected to true after success', async () => {
    const svc = makeService();
    await svc.connect();
    expect(svc.isConnected()).toBe(true);
  });

  it('stores the public key after connect', async () => {
    const svc = makeService();
    await svc.connect();
    expect(svc.getPublicKey()).toBeTruthy();
  });

  it('returns current state on second call without reopening transport', async () => {
    const svc = makeService();
    await svc.connect();
    const createCallCount = MockTransportClass.create.mock.calls.length;
    await svc.connect();
    expect(MockTransportClass.create.mock.calls.length).toBe(createCallCount);
  });

  it('throws when Ledger returns a non-OK code', async () => {
    mockStacksApp.getAddressAndPubKey.mockResolvedValueOnce({ returnCode: 0x6985 });
    const svc = makeService();
    await expect(svc.connect()).rejects.toThrow('Ledger returned error code');
  });

  it('emits to listeners after successful connection', async () => {
    const svc = makeService();
    const listener = jest.fn();
    svc.addListener(listener);
    await svc.connect();
    expect(listener).toHaveBeenCalled();
  });
});

describe('LedgerWalletService – disconnect', () => {
  beforeEach(() => {
    MockTransportClass.create.mockResolvedValue(mockTransport);
    mockOkAddress();
  });

  afterEach(() => jest.clearAllMocks());

  it('closes the transport and marks as disconnected', async () => {
    const svc = makeService();
    await svc.connect();
    await svc.disconnect();
    expect(svc.isConnected()).toBe(false);
    expect(svc.getAddress()).toBeNull();
    expect(mockTransport.close).toHaveBeenCalled();
  });
});

describe('LedgerWalletService – signMessage', () => {
  beforeEach(() => {
    MockTransportClass.create.mockResolvedValue(mockTransport);
    mockOkAddress();
  });

  afterEach(() => jest.clearAllMocks());

  it('throws when not connected', async () => {
    const svc = makeService();
    await expect(svc.signMessage('hello')).rejects.toThrow('Ledger is not connected');
  });

  it('returns hex signature after successful sign', async () => {
    mockStacksApp.sign.mockResolvedValue({
      returnCode:   LEDGER_OK,
      signatureDER: Buffer.from('3044', 'hex'),
    });
    const svc = makeService();
    await svc.connect();
    const sig = await svc.signMessage('test message');
    expect(typeof sig).toBe('string');
    expect(sig).toBeTruthy();
  });

  it('throws on non-OK return code from sign', async () => {
    mockStacksApp.sign.mockResolvedValue({ returnCode: 0x6e00, signatureDER: null });
    const svc = makeService();
    await svc.connect();
    await expect(svc.signMessage('fail')).rejects.toThrow('Ledger sign error');
  });
});

describe('LedgerWalletService – sendTransaction', () => {
  it('always throws — Ledger only signs', async () => {
    const svc = makeService();
    await expect(svc.sendTransaction({})).rejects.toThrow(
      'Ledger does not broadcast transactions'
    );
  });
});

describe('LedgerWalletService – getState', () => {
  it('includes provider=Ledger in state', () => {
    const svc = makeService();
    expect(svc.getState().provider).toBe('Ledger');
  });
});
