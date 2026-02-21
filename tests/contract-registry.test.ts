import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const admin    = accounts.get('wallet_1')!;
const other    = accounts.get('wallet_2')!;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Register a version for the given name under the deployer (default admin). */
function registerVersion(name: string, principal: string, sender = deployer) {
  return simnet.callPublicFn(
    'contract-registry',
    'register-version',
    [Cl.stringUtf8(name), Cl.principal(principal)],
    sender,
  );
}

// ─── smoke ────────────────────────────────────────────────────────────────────

describe('contract-registry - smoke', () => {
  it('simnet is initialised', () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it('deployer is the initial registry admin', () => {
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'get-registry-admin',
      [],
      deployer,
    );
    expect(result).toStrictEqual(Cl.principal(deployer));
  });

  it('registry is not paused at deployment', () => {
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'is-registry-paused',
      [],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });
});

// ─── register-version ─────────────────────────────────────────────────────────

describe('contract-registry - register-version', () => {
  it('admin can register a new version and receives version number 1', () => {
    const { result } = registerVersion('exchange', deployer);
    expect(result).toBeOk(Cl.uint(1));
  });

  it('registering a second version returns version number 2', () => {
    registerVersion('exchange', deployer);
    const { result } = registerVersion('exchange', admin);
    expect(result).toBeOk(Cl.uint(2));
  });

  it('non-admin cannot register a version', () => {
    const { result } = registerVersion('exchange', other, other);
    expect(result).toBeErr(Cl.uint(401));
  });

  it('empty name is rejected with invalid-input error', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'register-version',
      [Cl.stringUtf8(''), Cl.principal(deployer)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });
});

// ─── get-latest-version ───────────────────────────────────────────────────────

describe('contract-registry - get-latest-version', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
  });

  it('returns the principal of the latest registered version', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'get-latest-version',
      [Cl.stringUtf8('exchange')],
      deployer,
    );
    expect(result).toBeOk(Cl.principal(deployer));
  });

  it('returns ERR-CONTRACT-NOT-FOUND for unknown names', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'get-latest-version',
      [Cl.stringUtf8('unknown-contract')],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });

  it('latest version updates after a second registration', () => {
    registerVersion('exchange', admin);
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'get-latest-version',
      [Cl.stringUtf8('exchange')],
      deployer,
    );
    expect(result).toBeOk(Cl.principal(admin));
  });
});

// ─── get-version ──────────────────────────────────────────────────────────────

describe('contract-registry - get-version', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
    registerVersion('exchange', admin);
  });

  it('returns the principal for version 1', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'get-version',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.principal(deployer));
  });

  it('returns the principal for version 2', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'get-version',
      [Cl.stringUtf8('exchange'), Cl.uint(2)],
      deployer,
    );
    expect(result).toBeOk(Cl.principal(admin));
  });

  it('returns ERR-VERSION-NOT-FOUND for a non-existent version', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'get-version',
      [Cl.stringUtf8('exchange'), Cl.uint(99)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

// ─── version counts ───────────────────────────────────────────────────────────

describe('contract-registry - version-count', () => {
  it('returns 0 for an unregistered name', () => {
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'get-version-count',
      [Cl.stringUtf8('no-such-contract')],
      deployer,
    );
    expect(result).toStrictEqual(Cl.uint(0));
  });

  it('increments as versions are registered', () => {
    registerVersion('registry', deployer);
    registerVersion('registry', admin);
    registerVersion('registry', other);
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'get-version-count',
      [Cl.stringUtf8('registry')],
      deployer,
    );
    expect(result).toStrictEqual(Cl.uint(3));
  });
});

// ─── is-version-active ────────────────────────────────────────────────────────

describe('contract-registry - is-version-active', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
  });

  it('newly registered version is active', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'is-version-active',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('superseded version is no longer active after new registration', () => {
    registerVersion('exchange', admin); // version 2 becomes latest
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'is-version-active',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(false));
  });

  it('returns ERR for unknown version', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'is-version-active',
      [Cl.stringUtf8('exchange'), Cl.uint(99)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

// ─── deprecate-version ────────────────────────────────────────────────────────

describe('contract-registry - deprecate-version', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
  });

  it('admin can deprecate a version', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'deprecate-version',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('deprecated version is not active', () => {
    simnet.callPublicFn(
      'contract-registry',
      'deprecate-version',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      deployer,
    );
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'is-version-active',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(false));
  });

  it('non-admin cannot deprecate a version', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'deprecate-version',
      [Cl.stringUtf8('exchange'), Cl.uint(1)],
      other,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── set-capabilities ─────────────────────────────────────────────────────────

describe('contract-registry - set-capabilities', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
  });

  it('admin can set capabilities on a version', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'set-capabilities',
      [
        Cl.stringUtf8('exchange'),
        Cl.uint(1),
        Cl.list([Cl.stringUtf8('purchase'), Cl.stringUtf8('escrow')]),
      ],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('non-admin cannot set capabilities', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'set-capabilities',
      [
        Cl.stringUtf8('exchange'),
        Cl.uint(1),
        Cl.list([Cl.stringUtf8('purchase')]),
      ],
      other,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── migrate-contract ─────────────────────────────────────────────────────────

describe('contract-registry - migrate-contract', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
  });

  it('admin can migrate to a new contract principal', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'migrate-contract',
      [
        Cl.stringUtf8('exchange'),
        Cl.principal(admin),
        Cl.list([Cl.stringUtf8('v2'), Cl.stringUtf8('exchange')]),
        Cl.stringUtf8('Upgraded to v2 with enhanced verification'),
      ],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(2));
  });

  it('migration note is mandatory (empty note rejected)', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'migrate-contract',
      [
        Cl.stringUtf8('exchange'),
        Cl.principal(admin),
        Cl.list([]),
        Cl.stringUtf8(''),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('migration counter increments', () => {
    simnet.callPublicFn(
      'contract-registry',
      'migrate-contract',
      [
        Cl.stringUtf8('exchange'),
        Cl.principal(admin),
        Cl.list([]),
        Cl.stringUtf8('First migration'),
      ],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'get-migration-count',
      [],
      deployer,
    );
    expect(result).toStrictEqual(Cl.uint(1));
  });
});

// ─── admin governance ─────────────────────────────────────────────────────────

describe('contract-registry - admin governance', () => {
  it('admin can transfer admin role', () => {
    simnet.callPublicFn(
      'contract-registry',
      'set-registry-admin',
      [Cl.principal(admin)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'get-registry-admin',
      [],
      deployer,
    );
    expect(result).toStrictEqual(Cl.principal(admin));
  });

  it('non-admin cannot transfer admin role', () => {
    const { result } = simnet.callPublicFn(
      'contract-registry',
      'set-registry-admin',
      [Cl.principal(other)],
      other,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('admin can pause the registry', () => {
    simnet.callPublicFn(
      'contract-registry',
      'set-paused',
      [Cl.bool(true)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'is-registry-paused',
      [],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });

  it('registration is rejected when registry is paused', () => {
    simnet.callPublicFn(
      'contract-registry',
      'set-paused',
      [Cl.bool(true)],
      deployer,
    );
    const { result } = registerVersion('exchange', deployer);
    expect(result).toBeErr(Cl.uint(503));
  });
});

// ─── verify-is-latest ─────────────────────────────────────────────────────────

describe('contract-registry - verify-is-latest', () => {
  beforeEach(() => {
    registerVersion('exchange', deployer);
  });

  it('returns true when principal matches latest', () => {
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'verify-is-latest',
      [Cl.stringUtf8('exchange'), Cl.principal(deployer)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(true));
  });

  it('returns false when principal does not match latest', () => {
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'verify-is-latest',
      [Cl.stringUtf8('exchange'), Cl.principal(other)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });

  it('returns false for an unknown name', () => {
    const { result } = simnet.callReadOnlyFn(
      'contract-registry',
      'verify-is-latest',
      [Cl.stringUtf8('no-such'), Cl.principal(deployer)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.bool(false));
  });
});
