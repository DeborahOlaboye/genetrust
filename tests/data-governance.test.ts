import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

// ─── helpers ──────────────────────────────────────────────────────────────────

const ZERO_TX_ID = '0000000000000000000000000000000000000000000000000000000000000000';

function setConsent(
  dataId: number,
  research: boolean,
  commercial: boolean,
  clinical: boolean,
  jurisdiction: number,
  duration: number,
  sender = deployer,
) {
  return simnet.callPublicFn(
    'data-governance',
    'set-consent-policy',
    [
      Cl.uint(dataId),
      Cl.bool(research),
      Cl.bool(commercial),
      Cl.bool(clinical),
      Cl.uint(jurisdiction),
      Cl.uint(duration),
    ],
    sender,
  );
}

// ─── smoke ────────────────────────────────────────────────────────────────────

describe('data-governance contract - smoke', () => {
  it('simnet is initialized', () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it('fetch-consent-record returns none before any policy is set', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'fetch-consent-record',
      [Cl.uint(9999)],
      deployer,
    );
    expect(result).toBeNone();
  });
});

// ─── set-consent-policy ───────────────────────────────────────────────────────

describe('data-governance - set-consent-policy', () => {
  it('successfully sets a global consent policy', () => {
    const { result } = setConsent(1, true, false, false, 0, 1000);
    expect(result).toBeOk(Cl.bool(true));
  });

  it('successfully sets an EU consent policy and initialises GDPR record', () => {
    const { result } = setConsent(2, true, true, false, 2, 1000);
    expect(result).toBeOk(Cl.bool(true));

    const gdpr = simnet.callReadOnlyFn(
      'data-governance',
      'fetch-gdpr-record',
      [Cl.uint(2)],
      deployer,
    );
    expect(gdpr.result).toBeSome(expect.anything());
  });

  it('rejects invalid jurisdiction', () => {
    const { result } = setConsent(3, true, false, false, 99, 1000);
    expect(result).toBeErr(Cl.uint(400));
  });

  it('fetch-consent-record returns the policy after it is set', () => {
    setConsent(4, true, false, true, 1, 500);
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'fetch-consent-record',
      [Cl.uint(4)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('sets US jurisdiction policy without creating GDPR record', () => {
    setConsent(5, false, false, true, 1, 500);
    const gdpr = simnet.callReadOnlyFn(
      'data-governance',
      'fetch-gdpr-record',
      [Cl.uint(5)],
      deployer,
    );
    expect(gdpr.result).toBeNone();
  });
});
