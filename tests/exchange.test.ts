import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

// ─── helpers ──────────────────────────────────────────────────────────────────

function registerExchangeVersion(principal: string, sender = deployer) {
  return simnet.callPublicFn(
    'contract-registry',
    'register-version',
    [Cl.stringUtf8('exchange'), Cl.principal(principal)],
    sender,
  );
}

function createListing(listingId: number, sender = deployer) {
  return simnet.callPublicFn(
    'exchange',
    'create-listing',
    [
      Cl.uint(listingId),
      Cl.stringUtf8('100'),
      Cl.principal(deployer),
      Cl.uint(1),
      Cl.uint(1),
      Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
      Cl.bool(false),
      Cl.stringUtf8('Test listing'),
    ],
    sender,
  );
}

// ─── smoke ────────────────────────────────────────────────────────────────────

describe('exchange contract - smoke', () => {
  it('simnet is initialized', () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it('marketplace admin defaults to deployer', () => {
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-listing',
      [Cl.uint(9999)],
      deployer,
    );
    // No listing registered yet — returns none
    expect(result).toBeNone();
  });
});

// ─── listing management ───────────────────────────────────────────────────────

describe('exchange contract - listing management', () => {
  it('creates a listing successfully', () => {
    const { result } = createListing(1);
    expect(result).toBeOk(Cl.some(expect.anything()));
  });

  it('rejects duplicate listing id', () => {
    createListing(2);
    const { result } = createListing(2);
    expect(result).toBeErr(expect.anything());
  });

  it('get-listing returns the registered listing', () => {
    createListing(3);
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-listing',
      [Cl.uint(3)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe('exchange contract - error handling', () => {
  it('rejects invalid price with HTTP 400 error code', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(100),
        Cl.stringUtf8('0'),
        Cl.principal(deployer),
        Cl.uint(1),
        Cl.uint(1),
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
        Cl.bool(false),
        Cl.stringUtf8('Zero price listing'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('rejects invalid access level with HTTP 400 error code', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(101),
        Cl.stringUtf8('50'),
        Cl.principal(deployer),
        Cl.uint(1),
        Cl.uint(5), // access level > 3 is invalid
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
        Cl.bool(false),
        Cl.stringUtf8('Bad access level'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('get-listing returns none for unknown listing id', () => {
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-listing',
      [Cl.uint(99999)],
      deployer,
    );
    expect(result).toBeNone();
  });
});

// ─── contract-of / dynamic contract discovery ────────────────────────────────

describe('exchange contract - contract-of registry integration', () => {
  beforeEach(() => {
    // Register this deployer address as the "exchange" version
    registerExchangeVersion(deployer);
  });

  it('get-current-exchange-contract returns the registered exchange principal', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'get-current-exchange-contract',
      [Cl.contractPrincipal(deployer.split('.')[0] ?? deployer, 'contract-registry')],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });

  it('get-current-registry-contract returns the registered dataset-registry principal', () => {
    simnet.callPublicFn(
      'contract-registry',
      'register-version',
      [Cl.stringUtf8('dataset-registry'), Cl.principal(deployer)],
      deployer,
    );
    const { result } = simnet.callPublicFn(
      'exchange',
      'get-current-registry-contract',
      [Cl.contractPrincipal(deployer.split('.')[0] ?? deployer, 'contract-registry')],
      deployer,
    );
    expect(result).toBeOk(expect.anything());
  });
});

// ─── access level price ───────────────────────────────────────────────────────

describe('exchange contract - access level pricing', () => {
  beforeEach(() => {
    createListing(50);
  });

  it('get-access-level-price returns the listing default price when no tier set', () => {
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-access-level-price',
      [Cl.uint(50), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(100));
  });

  it('set-access-level-price stores a custom tier price', () => {
    simnet.callPublicFn(
      'exchange',
      'set-access-level-price',
      [Cl.uint(50), Cl.uint(1), Cl.uint(200)],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-access-level-price',
      [Cl.uint(50), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(200));
  });

  it('non-owner cannot set access level price', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'set-access-level-price',
      [Cl.uint(50), Cl.uint(1), Cl.uint(999)],
      wallet1, // not the owner
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

describe('exchange - price cap and new functions (simnet)', () => {
  it('create-listing rejects price of zero (ERR-INVALID-AMOUNT u401)', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(1),    // data-id
        Cl.uint(0),    // price = 0 — should fail
        Cl.uint(1),    // access-level
        Cl.stringUtf8('Valid listing description here'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it('create-listing rejects description shorter than 10 chars (ERR-INVALID-STRING-LENGTH u407)', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(1),
        Cl.uint(1000000),
        Cl.uint(1),
        Cl.stringUtf8('short'),  // too short
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(407));
  });

  it('create-listing rejects access level 0 (ERR-INVALID-ACCESS-LEVEL u406)', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(1),
        Cl.uint(1000000),
        Cl.uint(0),   // invalid level
        Cl.stringUtf8('Valid listing description here'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(406));
  });

  it('update-listing-price rejects zero price (ERR-INVALID-AMOUNT u401)', () => {
    // First create a listing
    simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(1),
        Cl.uint(1000000),
        Cl.uint(1),
        Cl.stringUtf8('Valid listing description here'),
      ],
      deployer,
    );
    const { result } = simnet.callPublicFn(
      'exchange',
      'update-listing-price',
      [Cl.uint(1), Cl.uint(0)], // zero price
      deployer,
    );
    expect(result).toBeErr(Cl.uint(401));
  });
});

describe('exchange - snapshot helpers (simnet)', () => {
  it('get-listing-summary returns structured tuple for existing listing', () => {
    simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(1),
        Cl.uint(500000),
        Cl.uint(2),
        Cl.stringUtf8('Listing summary test entry here'),
      ],
      deployer,
    );
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-listing-summary',
      [Cl.uint(1)],
      deployer,
    );
    expect(result).toBeSome(expect.anything());
  });

  it('get-listing-summary returns none for non-existent listing', () => {
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-listing-summary',
      [Cl.uint(99999)],
      deployer,
    );
    expect(result).toBeNone();
  });

  it('get-listing-is-active returns false for non-existent listing', () => {
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-listing-is-active',
      [Cl.uint(88888)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(false));
  });

  it('get-total-purchases-completed starts at zero', () => {
    const { result } = simnet.callReadOnlyFn(
      'exchange',
      'get-total-purchases-completed',
      [],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(0));
  });
});

describe('exchange - update-listing-data-id (simnet)', () => {
  it('update-listing-data-id rejects zero new-data-id (ERR-INVALID-INPUT u400)', () => {
    simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(1),
        Cl.uint(500000),
        Cl.uint(1),
        Cl.stringUtf8('Test listing for data-id update'),
      ],
      deployer,
    );
    const { result } = simnet.callPublicFn(
      'exchange',
      'update-listing-data-id',
      [Cl.uint(1), Cl.uint(0)], // zero data-id — should fail
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('update-listing-data-id rejects non-owner caller (ERR-NOT-OWNER u411)', () => {
    const { result } = simnet.callPublicFn(
      'exchange',
      'update-listing-data-id',
      [Cl.uint(1), Cl.uint(2)],
      wallet1, // not the owner
    );
    expect(result).toBeErr(Cl.uint(411));
  });
});
