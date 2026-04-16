import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;

function registerDataset(sender = deployer) {
  return simnet.callPublicFn(
    'dataset-registry',
    'register-dataset',
    [
      Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
      Cl.stringUtf8('https://storage.example.com/dataset'),
      Cl.stringUtf8('Test dataset for cross-contract flow'),
      Cl.uint(2),
      Cl.uint(1500000),
    ],
    sender,
  );
}

function createListing(dataId: number, sender = deployer) {
  return simnet.callPublicFn(
    'exchange',
    'create-listing',
    [
      Cl.uint(dataId),
      Cl.uint(1500000),
      Cl.uint(2),
      Cl.stringUtf8('Exchange listing for purchased dataset'),
    ],
    sender,
  );
}

function cancelListing(listingId: number, sender = deployer) {
  return simnet.callPublicFn(
    'exchange',
    'cancel-listing',
    [Cl.uint(listingId)],
    sender,
  );
}

function purchaseListing(listingId: number, desiredAccessLevel: number, sender = wallet1) {
  return simnet.callPublicFn(
    'exchange',
    'purchase-listing',
    [Cl.uint(listingId), Cl.uint(desiredAccessLevel)],
    sender,
  );
}

function grantDataAccess(dataId: number, user: string, sender = deployer) {
  return simnet.callPublicFn(
    'dataset-registry',
    'grant-access',
    [Cl.uint(dataId), Cl.principal(user), Cl.uint(2)],
    sender,
  );
}

function getListing(listingId: number) {
  return simnet.callReadOnlyFn(
    'exchange',
    'get-listing',
    [Cl.uint(listingId)],
    deployer,
  );
}

function toNumber(value: any) {
  if (typeof value === 'bigint') return Number(value);
  if (value?.toString) return Number(value.toString());
  return Number(value);
}

function getPurchase(listingId: number, buyer: string) {
  return simnet.callReadOnlyFn(
    'exchange',
    'get-purchase',
    [Cl.uint(listingId), Cl.principal(buyer)],
    deployer,
  );
}

function getAccess(dataId: number, user: string) {
  return simnet.callReadOnlyFn(
    'dataset-registry',
    'get-access',
    [Cl.uint(dataId), Cl.principal(user)],
    deployer,
  );
}

function hasValidAccess(dataId: number, user: string) {
  return simnet.callReadOnlyFn(
    'dataset-registry',
    'has-valid-access',
    [Cl.uint(dataId), Cl.principal(user)],
    deployer,
  );
}

const listingDescription = 'Premium dataset listing for integrated purchase flow';

beforeEach(() => {
  // This test file uses isolated dataset and listing IDs
});

describe('cross-contract integration', () => {
  it('registers a dataset and creates a marketplace listing for it', () => {
    const registerResult = registerDataset();
    expect(registerResult.result).toBeOk(expect.anything());
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    expect(createResult.result).toBeOk(expect.anything());
    const listingId = toNumber(createResult.result.value);

    const listing = getListing(listingId);
    expect(listing.result).toBeSome(expect.anything());
  });

  it('allows a buyer to purchase a listed dataset and records the purchase', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    const listingId = toNumber(createResult.result.value);

    const purchaseResult = purchaseListing(listingId, 2, wallet1);
    expect(purchaseResult.result).toBeOk(expect.anything());

    const purchaseRecord = getPurchase(listingId, wallet1);
    expect(purchaseRecord.result).toBeSome(expect.anything());
  });

  it('prevents self-purchase by the listing owner', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    const listingId = toNumber(createResult.result.value);

    const purchaseResult = purchaseListing(listingId, 1, deployer);
    expect(purchaseResult.result).toBeErr(Cl.uint(400));
  });

  it('prevents purchase on a cancelled listing', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    const listingId = toNumber(createResult.result.value);

    cancelListing(listingId);

    const purchaseResult = purchaseListing(listingId, 1, wallet2);
    expect(purchaseResult.result).toBeErr(Cl.uint(430));
  });

  it('allows dataset owner to grant access after purchase and returns valid access', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    const listingId = toNumber(createResult.result.value);

    purchaseListing(listingId, 2, wallet1);
    const grantResult = grantDataAccess(dataId, wallet1);
    expect(grantResult.result).toBeOk(Cl.bool(true));

    const accessRecord = getAccess(dataId, wallet1);
    expect(accessRecord.result).toBeSome(expect.anything());

    const validAccess = hasValidAccess(dataId, wallet1);
    expect(validAccess.result).toBeOk(Cl.bool(true));
  });

  it('records distinct purchase details for different buyers', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    const listingId = toNumber(createResult.result.value);

    purchaseListing(listingId, 1, wallet1);
    purchaseListing(listingId, 2, wallet2);

    const purchase1 = getPurchase(listingId, wallet1);
    const purchase2 = getPurchase(listingId, wallet2);

    expect(purchase1.result).toBeSome(expect.anything());
    expect(purchase2.result).toBeSome(expect.anything());
  });

  it('rejects a listing with invalid access level when creating a listed dataset', () => {
    const result = simnet.callPublicFn(
      'exchange',
      'create-listing',
      [
        Cl.uint(106),
        Cl.uint(1500000),
        Cl.uint(4),
        Cl.stringUtf8(listingDescription),
      ],
      deployer,
    );

    expect(result.result).toBeErr(Cl.uint(406));
  });

  it('rejects a dataset registration with zero price in a cross-contract flow', () => {
    const result = simnet.callPublicFn(
      'dataset-registry',
      'register-dataset',
      [
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000002'),
        Cl.stringUtf8('https://storage.example.com/dataset'),
        Cl.stringUtf8('Free dataset should fail'),
        Cl.uint(1),
        Cl.uint(0),
      ],
      deployer,
    );

    expect(result.result).toBeErr(Cl.uint(401));
  });

  it('confirms purchase record includes the expected paid amount and access level', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const createResult = createListing(dataId);
    const listingId = toNumber(createResult.result.value);

    purchaseListing(listingId, 2, wallet1);

    const purchaseRecord = getPurchase(listingId, wallet1);
    expect(purchaseRecord.result).toBeSome(expect.anything());
    const record = purchaseRecord.result.value;
    expect(record['access-level']).toBe(2n);
    expect(record.paid).toBe(1500000n);
  });
});
