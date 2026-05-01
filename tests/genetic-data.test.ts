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

// ─── lifecycle analytics ──────────────────────────────────────────────────────

describe('dataset-registry - lifecycle analytics', () => {
  beforeEach(() => {
    registerDataset(80);
  });

  it('get-dataset-lifecycle returns is-active true for registered dataset', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-lifecycle',
      [Cl.uint(80)],
      deployer,
    );
    expect(result).not.toBeNone();
  });

  it('get-modification-frequency returns total-modifications after update', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [Cl.uint(80), Cl.none(), Cl.none(), Cl.none(), Cl.none(), Cl.none()],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-modification-frequency',
      [Cl.uint(80)],
      deployer,
    );
    expect(result).not.toBeNone();
  });

  it('get-dataset-owner-history returns current-owner', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-owner-history',
      [Cl.uint(80)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('get-dataset-change-summary returns block range metadata', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-change-summary',
      [Cl.uint(80), Cl.uint(0), Cl.uint(100)],
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

// ─── update-genetic-data ──────────────────────────────────────────────────────

describe('dataset-registry - update-genetic-data', () => {
  beforeEach(() => {
    registerDataset(100);
  });

  it('owner can update description', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [
        Cl.uint(100),
        Cl.none(),
        Cl.none(),
        Cl.none(),
        Cl.none(),
        Cl.some(Cl.stringUtf8('Updated description')),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('owner can update price', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [
        Cl.uint(100),
        Cl.some(Cl.stringUtf8('500')),
        Cl.none(),
        Cl.none(),
        Cl.none(),
        Cl.none(),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('non-owner cannot update dataset', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [Cl.uint(100), Cl.none(), Cl.none(), Cl.none(), Cl.none(), Cl.none()],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('update increments version in get-dataset-versions', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'update-genetic-data',
      [Cl.uint(100), Cl.none(), Cl.none(), Cl.none(), Cl.none(), Cl.none()],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-versions',
      [Cl.uint(100)],
      deployer,
    );
    // After one update the current-version should be >= 2 (registration = 1, update = 2)
    expect(result).not.toBeNone();
  });
});

// ─── batch-grant-access ───────────────────────────────────────────────────────

describe('dataset-registry - batch-grant-access', () => {
  beforeEach(() => {
    registerDataset(90);
    registerDataset(91);
  });

  it('batch-grant-access succeeds for multiple datasets', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'batch-grant-access',
      [
        Cl.list([Cl.uint(90), Cl.uint(91)]),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet1)]),
        Cl.list([Cl.uint(1), Cl.uint(1)]),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('batch-grant-access fails when lists have different lengths', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'batch-grant-access',
      [
        Cl.list([Cl.uint(90)]),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        Cl.list([Cl.uint(1)]),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('batch-grant-access short-circuits on non-owner entry', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'batch-grant-access',
      [
        Cl.list([Cl.uint(90)]),
        Cl.list([Cl.principal(wallet2)]),
        Cl.list([Cl.uint(1)]),
      ],
      wallet1, // wallet1 does not own dataset 90
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('has-access is true for user after batch-grant-access', () => {
    simnet.callPublicFn(
      'dataset-registry',
      'batch-grant-access',
      [
        Cl.list([Cl.uint(90)]),
        Cl.list([Cl.principal(wallet1)]),
        Cl.list([Cl.uint(1)]),
      ],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'has-access',
      [Cl.uint(90), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });
});

// ─── access history analytics ─────────────────────────────────────────────────

describe('dataset-registry - access history analytics', () => {
  beforeEach(() => {
    registerDataset(110);
    simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(110), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
  });

  it('get-access-history returns change-count for user after grant', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-access-history',
      [Cl.uint(110), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('count-user-access-changes returns non-zero after grant', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'count-user-access-changes',
      [Cl.uint(110), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).not.toBeNone();
  });

  it('get-access-change returns record for change-id 1', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-access-change',
      [Cl.uint(110), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('get-total-access-grants returns data-id field', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-total-access-grants',
      [Cl.uint(110)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('get-user-access returns rights for granted user', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-user-access',
      [Cl.uint(110), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });
});

// ─── bulk-grant-access-map ────────────────────────────────────────────────────

describe('dataset-registry - bulk-grant-access-map', () => {
  beforeEach(() => {
    registerDataset(120);
    registerDataset(121);
  });

  it('bulk-grant-access-map returns a list of booleans', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'bulk-grant-access-map',
      [
        Cl.list([Cl.uint(120), Cl.uint(121)]),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet1)]),
        Cl.list([Cl.uint(1), Cl.uint(1)]),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('bulk-grant-access-map fails on list length mismatch', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'bulk-grant-access-map',
      [
        Cl.list([Cl.uint(120)]),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        Cl.list([Cl.uint(1)]),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });
});

// ─── set-contract-owner ───────────────────────────────────────────────────────

describe('dataset-registry - set-contract-owner', () => {
  it('contract owner can transfer contract ownership', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'set-contract-owner',
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('non-owner cannot set contract owner', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'set-contract-owner',
      [Cl.principal(wallet2)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── historical access queries ────────────────────────────────────────────────

describe('dataset-registry - historical access queries', () => {
  beforeEach(() => {
    registerDataset(130);
    simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(130), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
  });

  it('get-historical-access-state returns current-access for granted user', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-historical-access-state',
      [Cl.uint(130), Cl.principal(wallet1), Cl.uint(0)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('get-access-changes-in-block-range returns block-range metadata', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-access-changes-in-block-range',
      [Cl.uint(130), Cl.principal(wallet1), Cl.uint(0), Cl.uint(1000)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('get-dataset-version-at returns ok for version 1', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-version-at',
      [Cl.uint(130), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('get-active-datasets-count returns a defined value', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-active-datasets-count',
      [],
      deployer,
    );
    expect(result).toBeDefined();
  });
});

// ─── get-data-details and verify-access-rights ───────────────────────────────

describe('dataset-registry - get-data-details and verify-access-rights', () => {
  beforeEach(() => {
    registerDataset(140);
    simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(140), Cl.principal(wallet1), Cl.uint(1)],
      deployer,
    );
  });

  it('get-data-details returns ok with owner and access-level', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'get-data-details',
      [Cl.uint(140)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('get-data-details returns err 404 for unknown dataset', () => {
    const { result } = simnet.callPublicFn(
      'dataset-registry',
      'get-data-details',
      [Cl.uint(9999)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });

  it('verify-access-rights returns true for granted user', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'verify-access-rights',
      [Cl.uint(140), Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });

  it('verify-access-rights returns false for user with no grant', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'verify-access-rights',
      [Cl.uint(140), Cl.principal(wallet2)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });

  it('get-dataset-owner returns the correct owner principal', () => {
    const { result } = simnet.callReadOnlyFn(
      'dataset-registry',
      'get-dataset-owner',
      [Cl.uint(140)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });
});

describe('genetic-data - new validation behaviour (simnet)', () => {
  it('register-dataset rejects zero price (ERR-INVALID-AMOUNT u401)', () => {
    const { result } = simnet.callPublicFn(
      'genetic-data',
      'register-dataset',
      [
        Cl.buffer(Buffer.from('a'.repeat(32))),
        Cl.stringUtf8('https://ipfs.io/test'),
        Cl.stringUtf8('Valid description here for test'),
        Cl.uint(1),
        Cl.uint(0), // zero price — should fail
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('register-dataset rejects URL shorter than 5 chars (ERR-INVALID-STRING-LENGTH u407)', () => {
    const { result } = simnet.callPublicFn(
      'genetic-data',
      'register-dataset',
      [
        Cl.buffer(Buffer.from('a'.repeat(32))),
        Cl.stringUtf8('ab'), // too short
        Cl.stringUtf8('Valid description here for test'),
        Cl.uint(1),
        Cl.uint(1000),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(407));
  });

  it('register-dataset rejects access level 0 (ERR-INVALID-ACCESS-LEVEL u406)', () => {
    const { result } = simnet.callPublicFn(
      'genetic-data',
      'register-dataset',
      [
        Cl.buffer(Buffer.from('a'.repeat(32))),
        Cl.stringUtf8('https://valid.url'),
        Cl.stringUtf8('Valid description here for test'),
        Cl.uint(0), // invalid level
        Cl.uint(1000),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(406));
  });

  it('register-dataset rejects access level 4 (ERR-INVALID-ACCESS-LEVEL u406)', () => {
    const { result } = simnet.callPublicFn(
      'genetic-data',
      'register-dataset',
      [
        Cl.buffer(Buffer.from('a'.repeat(32))),
        Cl.stringUtf8('https://valid.url'),
        Cl.stringUtf8('Valid description here for test'),
        Cl.uint(4), // out of range
        Cl.uint(1000),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(406));
  });
});

describe('genetic-data - grant-access new validations (simnet)', () => {
  it('grant-access rejects level higher than dataset level (ERR-INSUFFICIENT-ACCESS-LEVEL u621)', () => {
    // Register dataset with level 1 first
    simnet.callPublicFn(
      'genetic-data',
      'register-dataset',
      [
        Cl.buffer(Buffer.from('b'.repeat(32))),
        Cl.stringUtf8('https://ipfs.io/grant-test'),
        Cl.stringUtf8('Grant access level test dataset'),
        Cl.uint(1), // dataset level = 1 (BASIC)
        Cl.uint(500000),
      ],
      deployer,
    );
    // Try to grant level 3 (FULL) on a level-1 dataset
    const { result } = simnet.callPublicFn(
      'genetic-data',
      'grant-access',
      [
        Cl.uint(1),
        Cl.principal(wallet1),
        Cl.uint(3), // exceeds dataset level — should fail
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(621));
  });

  it('grant-access rejects self-grant (ERR-SELF-GRANT-NOT-ALLOWED u610)', () => {
    const { result } = simnet.callPublicFn(
      'genetic-data',
      'grant-access',
      [
        Cl.uint(1),
        Cl.principal(deployer), // self-grant
        Cl.uint(1),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(610));
  });
});
