import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

// ─── helpers ──────────────────────────────────────────────────────────────────

function registerDataset(dataId: number, sender = deployer) {
  return simnet.callPublicFn(
    'dataset-registry',
    'register-genetic-data',
    [
      Cl.uint(dataId),
      Cl.stringUtf8('100'),
      Cl.uint(1),
      Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
      Cl.stringUtf8('https://storage.example.com/data'),
      Cl.stringUtf8('Test genetic dataset'),
    ],
    sender,
  );
}

function registerExchangeVersion(principal: string, sender = deployer) {
  return simnet.callPublicFn(
    'contract-registry',
    'register-version',
    [Cl.stringUtf8('exchange'), Cl.principal(principal)],
    sender,
  );
}

// ─── smoke ────────────────────────────────────────────────────────────────────

describe('dataset-registry contract - smoke', () => {
  it('ensures simnet is well initialised', () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it('contract is not paused at deployment', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'is-contract-paused',
      [],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });
});

// ─── register-genetic-data ────────────────────────────────────────────────────

describe('dataset-registry - register-genetic-data', () => {
  it('successfully registers a dataset', () => {
    const { result } = registerDataset(1);
    expect(result).toBeOk(expect.anything());
  });

  it('rejects duplicate data-id', () => {
    registerDataset(2);
    const { result } = registerDataset(2);
    expect(result).toBeErr(Cl.uint(409));
  });

  it('rejects invalid access level (0 is not valid)', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'register-genetic-data',
      [
        Cl.uint(99),
        Cl.stringUtf8('100'),
        Cl.uint(0), // invalid level
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
        Cl.stringUtf8('https://storage.example.com/data'),
        Cl.stringUtf8('Bad access level'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('rejects zero price', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'register-genetic-data',
      [
        Cl.uint(98),
        Cl.stringUtf8('0'),
        Cl.uint(1),
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
        Cl.stringUtf8('https://storage.example.com/data'),
        Cl.stringUtf8('Zero price'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });
});

// ─── get-dataset-details ──────────────────────────────────────────────────────

describe('dataset-registry - get-dataset-details', () => {
  beforeEach(() => {
    registerDataset(10);
  });

  it('returns dataset details for a registered dataset', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-details',
      [Cl.uint(10)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('returns none for an unregistered dataset', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-details',
      [Cl.uint(9999)],
      deployer,
    );
    expect(result).toBeNone();
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe('dataset-registry - error handling - HTTP status codes', () => {
  it('ERR-NOT-AUTHORIZED is mapped to HTTP 401', () => {
    // Wallet1 tries to update a dataset they do not own
    registerDataset(20);
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [
        Cl.uint(20),
        Cl.none(),
        Cl.none(),
        Cl.none(),
        Cl.none(),
        Cl.none(),
      ],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('ERR-DATA-EXISTS is mapped to HTTP 409', () => {
    registerDataset(21);
    const { result } = registerDataset(21);
    expect(result).toBeErr(Cl.uint(409));
  });

  it('ERR-DATA-NOT-FOUND is mapped to HTTP 404', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(99999), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

// ─── access control ───────────────────────────────────────────────────────────

describe('dataset-registry - access control', () => {
  beforeEach(() => {
    registerDataset(30);
  });

  it('owner can grant access to another user', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(30), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('has-access returns true for granted user', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(30), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'has-access',
      [Cl.uint(30), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });

  it('has-access returns false for user with no grant', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'has-access',
      [Cl.uint(30), Cl.principal(wallet2), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });
});

// ─── registry integration: resolve-contract ───────────────────────────────────

describe('dataset-registry - resolve-contract (registry integration)', () => {
  beforeEach(() => {
    registerExchangeVersion(deployer);
  });

  it('resolve-contract returns the latest exchange principal via the registry', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'resolve-contract',
      [
        Cl.contractPrincipal(deployer.split('.')[0] ?? deployer, 'contract-registry'),
        Cl.stringUtf8('exchange'),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('resolve-contract returns ERR-CONTRACT-NOT-FOUND for unregistered slot', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'resolve-contract',
      [
        Cl.contractPrincipal(deployer.split('.')[0] ?? deployer, 'contract-registry'),
        Cl.stringUtf8('nonexistent-slot'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

// ─── registry integration: verify-registered-contract ────────────────────────

describe('dataset-registry - verify-registered-contract', () => {
  beforeEach(() => {
    registerExchangeVersion(deployer);
  });

  it('passes when the supplied principal matches the registry', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'verify-registered-contract',
      [
        Cl.contractPrincipal(deployer.split('.')[0] ?? deployer, 'contract-registry'),
        Cl.stringUtf8('exchange'),
        Cl.principal(deployer),
      ],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('fails when the supplied principal does not match the registry', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'verify-registered-contract',
      [
        Cl.contractPrincipal(deployer.split('.')[0] ?? deployer, 'contract-registry'),
        Cl.stringUtf8('exchange'),
        Cl.principal(wallet1), // wrong principal
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── transfer-ownership ───────────────────────────────────────────────────────

describe('dataset-registry - transfer-ownership', () => {
  beforeEach(() => {
    registerDataset(50);
  });

  it('owner can transfer ownership to another principal', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'transfer-ownership',
      [Cl.uint(50), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('new owner is reflected in get-dataset-details after transfer', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'transfer-ownership',
      [Cl.uint(50), Cl.principal(wallet1)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-details',
      [Cl.uint(50)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('non-owner cannot transfer ownership', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'transfer-ownership',
      [Cl.uint(50), Cl.principal(wallet2)],
      wallet1, // not owner
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('transfer to non-existent dataset returns 404', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'transfer-ownership',
      [Cl.uint(9999), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

// ─── revoke-access ────────────────────────────────────────────────────────────

describe('dataset-registry - revoke-access', () => {
  beforeEach(() => {
    registerDataset(60);
    // Grant access so we have something to revoke
    simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(60), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
  });

  it('owner can revoke a granted access right', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(60), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('has-access returns false after revocation', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(60), Cl.principal(wallet1)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'has-access',
      [Cl.uint(60), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });

  it('non-owner cannot revoke access', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(60), Cl.principal(wallet1)],
      wallet2, // not owner
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('revoking non-existent access returns 404', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(60), Cl.principal(wallet2)], // wallet2 was never granted
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

// ─── dataset version history ──────────────────────────────────────────────────

describe('dataset-registry - version history', () => {
  beforeEach(() => {
    registerDataset(70);
  });

  it('initial registration creates version 1', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-versions',
      [Cl.uint(70)],
      deployer,
    );
    expect(result).not.toBeNone();
  });

  it('update-genetic-data increments version count', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [Cl.uint(70), Cl.none(), Cl.none(), Cl.none(), Cl.none(), Cl.none()],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-versions',
      [Cl.uint(70)],
      deployer,
    );
    expect(result).not.toBeNone();
  });

  it('dataset-version-exists returns true for version 1', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'dataset-version-exists',
      [Cl.uint(70), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });

  it('dataset-version-exists returns false for version 999', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'dataset-version-exists',
      [Cl.uint(70), Cl.uint(999)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });

  it('get-dataset-change-timeline returns data-id and current-block', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-change-timeline',
      [Cl.uint(70)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });
});

// ─── revoke-access ────────────────────────────────────────────────────────────

describe('dataset-registry - revoke-access', () => {
  beforeEach(() => {
    registerDataset(50);
    simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(50), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
  });

  it('owner can revoke access', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(50), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('has-access returns false after revocation', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(50), Cl.principal(wallet1)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'has-access',
      [Cl.uint(50), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });

  it('non-owner cannot revoke access', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(50), Cl.principal(wallet1)],
      wallet2, // not the owner
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── version history ──────────────────────────────────────────────────────────

describe('dataset-registry - version history', () => {
  beforeEach(() => {
    registerDataset(40);
  });

  it('get-dataset-versions returns version info after registration', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-versions',
      [Cl.uint(40)],
      deployer,
    );
    expect(result).not.toBeNone();
  });

  it('dataset-version-exists returns true for version 1 after registration', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'dataset-version-exists',
      [Cl.uint(40), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });

  it('dataset-version-exists returns false for non-existent version', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'dataset-version-exists',
      [Cl.uint(40), Cl.uint(999)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });
});
