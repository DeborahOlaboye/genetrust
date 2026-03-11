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

// ─── smoke ────────────────────────────────────────────────────────────────────

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
