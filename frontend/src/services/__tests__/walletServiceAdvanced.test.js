/**
 * Tests for advanced Stacks Connect 8.x features added to WalletService:
 *   - Multi-account management
 *   - Session management (expiry, refresh, restore)
 *   - Transaction batch queue
 */

import { TX_STATUS } from '../walletService';

// ── Shared mocks ─────────────────────────────────────────────────────────────

const mockUserSession = {
  isUserSignedIn:          jest.fn(() => false),
  loadUserData:            jest.fn(),
  signUserOut:             jest.fn(),
  handlePendingSignIn:     jest.fn(),
  isSignInPending:         jest.fn(() => false),
};

jest.mock('../../config/walletConfig', () => ({
  userSession: mockUserSession,
  appDetails:  { name: 'GeneTrust', icon: '/favicon.svg' },
}));

jest.mock('@stacks/connect', () => ({
  showConnect:      jest.fn(),
  openContractCall: jest.fn(),
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem:    (k) => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// ── Factory: fresh WalletService per test ─────────────────────────────────────

const makeService = () => {
  // Re-require so each instance starts with a clean slate
  jest.resetModules();

  // Re-register mocks after resetModules
  jest.mock('../../config/walletConfig', () => ({
    userSession: mockUserSession,
    appDetails:  { name: 'GeneTrust', icon: '/favicon.svg' },
  }));
  jest.mock('@stacks/connect', () => ({
    showConnect:      jest.fn(),
    openContractCall: jest.fn(),
  }));

  sessionStorageMock.clear();
  const { walletService: svc } = require('../walletService');
  return svc;
};

// ── Multi-account ─────────────────────────────────────────────────────────────

describe('WalletService – multi-account', () => {
  const ADDR_A = 'ST1AAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const ADDR_B = 'ST1BBBBBBBBBBBBBBBBBBBBBBBBBBB';

  let svc;
  beforeEach(() => { svc = makeService(); });

  it('starts with an empty accounts list when no session exists', () => {
    expect(svc.getAccounts()).toEqual([]);
  });

  it('addAccount registers a new account and returns its index', () => {
    const idx = svc.addAccount(ADDR_A, 'Hot Wallet');
    expect(idx).toBe(0);
    expect(svc.getAccounts()).toHaveLength(1);
    expect(svc.getAccounts()[0].address).toBe(ADDR_A);
  });

  it('addAccount throws when address is already registered', () => {
    svc.addAccount(ADDR_A, 'Hot Wallet');
    expect(() => svc.addAccount(ADDR_A, 'Duplicate')).toThrow();
  });

  it('addAccount throws when address is empty', () => {
    expect(() => svc.addAccount('', 'Bad')).toThrow('address is required');
  });

  it('switchAccount changes the active account and address', () => {
    svc.addAccount(ADDR_A, 'Account A');
    svc.addAccount(ADDR_B, 'Account B');
    svc.switchAccount(1);
    expect(svc.getAddress()).toBe(ADDR_B);
  });

  it('switchAccount throws for an out-of-range index', () => {
    svc.addAccount(ADDR_A, 'Account A');
    expect(() => svc.switchAccount(5)).toThrow();
  });

  it('switchAccountByAddress switches by address string', () => {
    svc.addAccount(ADDR_A, 'A');
    svc.addAccount(ADDR_B, 'B');
    svc.switchAccountByAddress(ADDR_B);
    expect(svc.getAddress()).toBe(ADDR_B);
  });

  it('switchAccountByAddress throws for unknown address', () => {
    expect(() => svc.switchAccountByAddress('ST1UNKNOWN')).toThrow();
  });

  it('removeAccount removes the account at the given index', () => {
    svc.addAccount(ADDR_A, 'A');
    svc.addAccount(ADDR_B, 'B');
    svc.switchAccount(0); // active = A
    svc.removeAccount(1); // remove B
    expect(svc.getAccounts()).toHaveLength(1);
    expect(svc.getAccounts()[0].address).toBe(ADDR_A);
  });

  it('removeAccount throws when trying to remove the active account', () => {
    svc.addAccount(ADDR_A, 'A');
    svc.addAccount(ADDR_B, 'B');
    svc.switchAccount(0);
    expect(() => svc.removeAccount(0)).toThrow('Cannot remove the active account');
  });

  it('renameAccount updates the label', () => {
    svc.addAccount(ADDR_A, 'Old Name');
    svc.renameAccount(0, 'New Name');
    expect(svc.getAccounts()[0].label).toBe('New Name');
  });

  it('renameAccount throws for invalid index', () => {
    expect(() => svc.renameAccount(99, 'Ghost')).toThrow();
  });

  it('emits to listeners after switchAccount', () => {
    const listener = jest.fn();
    svc.addAccount(ADDR_A, 'A');
    svc.addAccount(ADDR_B, 'B');
    svc.addListener(listener);
    svc.switchAccount(1);
    expect(listener).toHaveBeenCalledWith(ADDR_B);
  });
});

// ── Session management ────────────────────────────────────────────────────────

describe('WalletService – session management', () => {
  let svc;
  beforeEach(() => { svc = makeService(); });

  it('isSessionValid returns false when not connected', () => {
    expect(svc.isSessionValid()).toBe(false);
  });

  it('getSessionExpiry returns null when no expiry has been set', () => {
    expect(svc.getSessionExpiry()).toBeNull();
  });

  it('refreshSession throws when no active session exists', () => {
    expect(() => svc.refreshSession()).toThrow('No active session to refresh');
  });

  it('expireSession sets expiry to the past', () => {
    const ADDR = 'ST1AAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    svc.addAccount(ADDR, 'Test');
    svc.switchAccount(0);
    svc.expireSession();
    expect(svc.isSessionValid()).toBe(false);
  });

  it('refreshSession extends the session expiry', () => {
    const ADDR = 'ST1AAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    svc.addAccount(ADDR, 'Test');
    svc.switchAccount(0);
    // Manually expose expiry by calling refreshSession (needs isConnected)
    // Fake isConnected via setAddress
    svc.setAddress(ADDR);
    svc.refreshSession();
    const expiry = svc.getSessionExpiry();
    expect(expiry).not.toBeNull();
    expect(expiry).toBeGreaterThan(Date.now());
  });
});

// ── Transaction batch queue ───────────────────────────────────────────────────

describe('WalletService – transaction batch queue', () => {
  let svc;

  const sampleTx = {
    contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    contractName:    'exchange',
    functionName:    'purchase-listing',
    functionArgs:    [],
  };

  beforeEach(() => { svc = makeService(); });

  it('starts with an empty queue', () => {
    expect(svc.getTxQueue()).toEqual([]);
    expect(svc.getTxQueueLength()).toBe(0);
  });

  it('enqueueTx adds an entry and returns its queue index', () => {
    const idx = svc.enqueueTx(sampleTx);
    expect(idx).toBe(0);
    expect(svc.getTxQueueLength()).toBe(1);
  });

  it('enqueueTx assigns PENDING status to new entries', () => {
    svc.enqueueTx(sampleTx);
    expect(svc.getTxQueue()[0].status).toBe(TX_STATUS.PENDING);
  });

  it('enqueueTx throws for non-object descriptor', () => {
    expect(() => svc.enqueueTx(null)).toThrow('txDescriptor must be an object');
    expect(() => svc.enqueueTx('bad')).toThrow();
  });

  it('dequeueTx removes the entry by id', () => {
    svc.enqueueTx(sampleTx);
    const id = svc.getTxQueue()[0].id;
    svc.dequeueTx(id);
    expect(svc.getTxQueueLength()).toBe(0);
  });

  it('dequeueTx throws for unknown id', () => {
    expect(() => svc.dequeueTx('nonexistent')).toThrow();
  });

  it('clearTxQueue empties the queue', () => {
    svc.enqueueTx(sampleTx);
    svc.enqueueTx(sampleTx);
    svc.clearTxQueue();
    expect(svc.getTxQueueLength()).toBe(0);
  });

  it('getTxQueue returns a copy and mutations do not affect internal queue', () => {
    svc.enqueueTx(sampleTx);
    const snapshot = svc.getTxQueue();
    snapshot.pop();
    expect(svc.getTxQueueLength()).toBe(1);
  });

  it('flushTxQueue throws when wallet is not connected', async () => {
    svc.enqueueTx(sampleTx);
    await expect(svc.flushTxQueue()).rejects.toThrow('Wallet not connected');
  });
});

// ── TX_STATUS export ──────────────────────────────────────────────────────────

describe('TX_STATUS constants', () => {
  it('exports all expected status values', () => {
    expect(TX_STATUS.PENDING).toBe('pending');
    expect(TX_STATUS.SIGNED).toBe('signed');
    expect(TX_STATUS.BROADCAST).toBe('broadcast');
    expect(TX_STATUS.CONFIRMED).toBe('confirmed');
    expect(TX_STATUS.FAILED).toBe('failed');
  });
});
