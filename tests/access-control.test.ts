import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

// Role bitmask constants that mirror access-control.clar
const ROLE_RESEARCHER    = 0x0002;
const ROLE_DATA_PROVIDER = 0x0004;
const ROLE_VERIFIER      = 0x0008;

// ─── Smoke Tests ──────────────────────────────────────────────────────────────

describe('access-control contract - smoke', () => {
  it('simnet is initialised', () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it('deployer is admin at deployment', () => {
    const { result } = simnet.callReadOnlyFn(
      'access-control',
      'is-admin',
      [Cl.principal(deployer)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('wallet1 is not admin at deployment', () => {
    const { result } = simnet.callReadOnlyFn(
      'access-control',
      'is-admin',
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(false));
  });
});

// ─── Role Management ──────────────────────────────────────────────────────────

describe('access-control - role operations', () => {
  it('admin can grant a role to a user', () => {
    const { result } = simnet.callPublicFn(
      'access-control',
      'grant-role',
      [Cl.principal(wallet1), Cl.uint(ROLE_RESEARCHER)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('has-role reflects granted roles correctly', () => {
    simnet.callPublicFn('access-control', 'grant-role', [Cl.principal(wallet1), Cl.uint(ROLE_RESEARCHER)], deployer);
    const { result } = simnet.callReadOnlyFn(
      'access-control',
      'has-role',
      [Cl.principal(wallet1), Cl.uint(ROLE_RESEARCHER)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('non-admin cannot grant roles', () => {
    const { result } = simnet.callPublicFn(
      'access-control',
      'grant-role',
      [Cl.principal(wallet2), Cl.uint(ROLE_RESEARCHER)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401)); // ERR-NOT-AUTHORIZED
  });

  it('admin can revoke a granted role', () => {
    simnet.callPublicFn('access-control', 'grant-role', [Cl.principal(wallet1), Cl.uint(ROLE_RESEARCHER)], deployer);
    const { result } = simnet.callPublicFn(
      'access-control',
      'revoke-role',
      [Cl.principal(wallet1), Cl.uint(ROLE_RESEARCHER)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});

// ─── Admin Management ─────────────────────────────────────────────────────────

describe('access-control - admin management', () => {
  it('current admin can add a new admin', () => {
    const { result } = simnet.callPublicFn(
      'access-control',
      'add-admin',
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('new admin can perform admin actions (chaining)', () => {
    simnet.callPublicFn('access-control', 'add-admin', [Cl.principal(wallet1)], deployer);
    const { result } = simnet.callPublicFn(
      'access-control',
      'add-admin',
      [Cl.principal(wallet2)],
      wallet1,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('removed admin loses privileges', () => {
    simnet.callPublicFn('access-control', 'add-admin', [Cl.principal(wallet1)], deployer);
    simnet.callPublicFn('access-control', 'remove-admin', [Cl.principal(wallet1)], deployer);
    const { result } = simnet.callPublicFn(
      'access-control',
      'grant-role',
      [Cl.principal(wallet2), Cl.uint(ROLE_VERIFIER)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── Error Context ────────────────────────────────────────────────────────────

describe('access-control - error tracking', () => {
  it('increments error counter and stores context on failure', () => {
    // Fail an auth check
    simnet.callPublicFn('access-control', 'grant-role', [Cl.principal(wallet2), Cl.uint(ROLE_RESEARCHER)], wallet1);
    
    const { result } = simnet.callReadOnlyFn(
      'access-control',
      'get-error-context',
      [Cl.uint(0)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });
});
