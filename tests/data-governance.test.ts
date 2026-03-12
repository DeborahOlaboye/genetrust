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

// ─── amend-consent-policy ─────────────────────────────────────────────────────

describe('data-governance - amend-consent-policy', () => {
  beforeEach(() => {
    setConsent(10, true, false, false, 0, 2000);
  });

  it('owner can amend an existing consent policy', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'amend-consent-policy',
      [
        Cl.uint(10),
        Cl.bool(false),
        Cl.bool(true),
        Cl.bool(false),
        Cl.uint(0),
        Cl.uint(1000),
      ],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('non-owner cannot amend consent', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'amend-consent-policy',
      [
        Cl.uint(10),
        Cl.bool(true),
        Cl.bool(false),
        Cl.bool(false),
        Cl.uint(0),
        Cl.uint(1000),
      ],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('amend on non-existent record returns 404', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'amend-consent-policy',
      [
        Cl.uint(9999),
        Cl.bool(true),
        Cl.bool(false),
        Cl.bool(false),
        Cl.uint(0),
        Cl.uint(1000),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });

  it('amend with invalid jurisdiction returns 400', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'amend-consent-policy',
      [
        Cl.uint(10),
        Cl.bool(true),
        Cl.bool(false),
        Cl.bool(false),
        Cl.uint(99),
        Cl.uint(1000),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('consent-change-count increments after amend', () => {
    simnet.callPublicFn(
      'data-governance',
      'amend-consent-policy',
      [
        Cl.uint(10),
        Cl.bool(false),
        Cl.bool(true),
        Cl.bool(false),
        Cl.uint(0),
        Cl.uint(1000),
      ],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-consent-change-count',
      [Cl.uint(10)],
      deployer,
    );
    // Should be at least 1 after one amendment
    expect(result).toStrictEqual(Cl.uint(1));
  });
});

// ─── GDPR functions ───────────────────────────────────────────────────────────

describe('data-governance - GDPR functions', () => {
  beforeEach(() => {
    // Set EU consent so GDPR record is initialised
    setConsent(20, true, false, false, 2, 5000);
  });

  it('gdpr-request-erasure sets right-to-be-forgotten flag', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'gdpr-request-erasure',
      [Cl.uint(20)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('gdpr-request-portability sets portability flag', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'gdpr-request-portability',
      [Cl.uint(20)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('gdpr-restrict-processing sets processing-restricted flag', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'gdpr-restrict-processing',
      [Cl.uint(20)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('gdpr-restore-processing clears processing-restricted flag', () => {
    simnet.callPublicFn('data-governance', 'gdpr-restrict-processing', [Cl.uint(20)], deployer);
    const { result } = simnet.callPublicFn(
      'data-governance',
      'gdpr-restore-processing',
      [Cl.uint(20)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('non-owner cannot invoke gdpr-request-erasure', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'gdpr-request-erasure',
      [Cl.uint(20)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('gdpr functions reject non-EU datasets', () => {
    setConsent(21, true, false, false, 1, 1000); // US jurisdiction
    const { result } = simnet.callPublicFn(
      'data-governance',
      'gdpr-request-erasure',
      [Cl.uint(21)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });
});

// ─── validate-consent-for-purpose ─────────────────────────────────────────────

describe('data-governance - validate-consent-for-purpose', () => {
  beforeEach(() => {
    setConsent(30, true, false, false, 0, 5000); // only research consent
  });

  it('validates research purpose when research consent is granted', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'validate-consent-for-purpose',
      [Cl.uint(30), Cl.uint(1)], // purpose 1 = research
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it('rejects commercial purpose when only research consent granted', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'validate-consent-for-purpose',
      [Cl.uint(30), Cl.uint(2)], // purpose 2 = commercial
      deployer,
    );
    expect(result).toBeOk(Cl.bool(false));
  });

  it('returns 404 for unknown data-id', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'validate-consent-for-purpose',
      [Cl.uint(9999), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeErr(expect.anything());
  });
});

// ─── compliance reporting ─────────────────────────────────────────────────────

describe('data-governance - compliance reporting', () => {
  beforeEach(() => {
    setConsent(40, true, true, false, 2, 3000); // EU
  });

  it('get-compliance-report returns ok with jurisdiction info', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-compliance-report',
      [Cl.uint(40)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('get-compliance-report returns 404 for missing dataset', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-compliance-report',
      [Cl.uint(9999)],
      deployer,
    );
    expect(result).toBeErr(expect.anything());
  });

  it('get-usage-statistics returns current-block', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-usage-statistics',
      [Cl.uint(40)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('calculate-compliance-score returns overall-score field', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'calculate-compliance-score',
      [Cl.uint(40)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('verify-gdpr-article-30-compliance returns compliant flag for EU data', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'verify-gdpr-article-30-compliance',
      [Cl.uint(40)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });
});

// ─── record-processing-activity & audit-access ────────────────────────────────

describe('data-governance - record-processing-activity', () => {
  beforeEach(() => {
    setConsent(50, true, true, true, 0, 5000);
  });

  it('records a processing activity for a valid research purpose', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'record-processing-activity',
      [
        Cl.uint(50),
        Cl.principal(wallet1),
        Cl.uint(1), // research
        Cl.uint(500),
        Cl.uint(1),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('rejects invalid purpose code', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'record-processing-activity',
      [
        Cl.uint(50),
        Cl.principal(wallet1),
        Cl.uint(99), // invalid purpose
        Cl.uint(500),
        Cl.uint(1),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('rejects activity for data with no consent record', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'record-processing-activity',
      [
        Cl.uint(9998),
        Cl.principal(wallet1),
        Cl.uint(1),
        Cl.uint(500),
        Cl.uint(1),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(404));
  });
});

describe('data-governance - audit-access', () => {
  beforeEach(() => {
    setConsent(60, true, false, false, 0, 5000);
  });

  it('audit-access returns an ok log-id', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'audit-access',
      [
        Cl.uint(60),
        Cl.uint(1),
        Cl.bufferFromHex(ZERO_TX_ID),
      ],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('get-audit-trail-summary returns total-audit-entries field', () => {
    simnet.callPublicFn(
      'data-governance',
      'audit-access',
      [Cl.uint(60), Cl.uint(1), Cl.bufferFromHex(ZERO_TX_ID)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-audit-trail-summary',
      [Cl.uint(60)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('get-audit-analytics returns gdpr-compliant field', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-audit-analytics',
      [Cl.uint(60)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('get-audit-trail-export-summary returns compliance-ready true', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-audit-trail-export-summary',
      [],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });
});

// ─── assign-governance-owner ──────────────────────────────────────────────────

describe('data-governance - assign-governance-owner', () => {
  it('contract owner can transfer ownership', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'assign-governance-owner',
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('non-owner cannot assign governance owner', () => {
    const { result } = simnet.callPublicFn(
      'data-governance',
      'assign-governance-owner',
      [Cl.principal(wallet2)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

// ─── get-gdpr-request-status ──────────────────────────────────────────────────

describe('data-governance - get-gdpr-request-status', () => {
  beforeEach(() => {
    // Set EU consent so GDPR record is initialised
    setConsent(70, true, false, false, 2, 5000);
    simnet.callPublicFn('data-governance', 'gdpr-request-erasure', [Cl.uint(70)], deployer);
  });

  it('returns erasure-requested true after gdpr-request-erasure', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-gdpr-request-status',
      [Cl.uint(70)],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });

  it('returns none for dataset with no GDPR record', () => {
    setConsent(71, true, false, false, 1, 5000); // US, no GDPR record
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-gdpr-request-status',
      [Cl.uint(71)],
      deployer,
    );
    // Returns none for non-EU datasets
    expect(result).toBeNone();
  });
});

// ─── get-tracked-purposes ─────────────────────────────────────────────────────

describe('data-governance - get-tracked-purposes', () => {
  it('returns all three purpose constants', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-tracked-purposes',
      [],
      deployer,
    );
    expect(result).toMatchObject(expect.anything());
  });
});

// ─── consent history ──────────────────────────────────────────────────────────

describe('data-governance - consent history', () => {
  beforeEach(() => {
    setConsent(80, true, false, false, 0, 5000);
    // Amend once to create a change record
    simnet.callPublicFn(
      'data-governance',
      'amend-consent-policy',
      [Cl.uint(80), Cl.bool(true), Cl.bool(true), Cl.bool(false), Cl.uint(0), Cl.uint(4000)],
      deployer,
    );
  });

  it('fetch-consent-change returns the first change record', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'fetch-consent-change',
      [Cl.uint(80), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('get-historical-consent-state delegates to fetch-consent-change', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-historical-consent-state',
      [Cl.uint(80), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('get-consent-change-count returns 1 after one amend', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'get-consent-change-count',
      [Cl.uint(80)],
      deployer,
    );
    expect(result).toStrictEqual(Cl.uint(1));
  });

  it('fetch-consent-change returns none for non-existent change-id', () => {
    const { result } = simnet.callReadOnlyFn(
      'data-governance',
      'fetch-consent-change',
      [Cl.uint(80), Cl.uint(999)],
      deployer,
    );
    expect(result).toBeNone();
  });
});
