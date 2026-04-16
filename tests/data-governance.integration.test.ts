import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const dataOwner = accounts.get('wallet_1')!;
const user = accounts.get('wallet_2')!;

function registerDataset(sender = dataOwner) {
  return simnet.callPublicFn(
    'dataset-registry',
    'register-dataset',
    [
      Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
      Cl.stringUtf8('https://storage.example.com/dataset'),
      Cl.stringUtf8('Test dataset for governance'),
      Cl.uint(2),
      Cl.uint(1000000),
    ],
    sender,
  );
}

function deactivateDataset(dataId: number, sender = dataOwner) {
  return simnet.callPublicFn(
    'dataset-registry',
    'deactivate-dataset',
    [Cl.uint(dataId)],
    sender,
  );
}

function grantAccess(dataId: number, recipient: string, sender = dataOwner) {
  return simnet.callPublicFn(
    'dataset-registry',
    'grant-access',
    [Cl.uint(dataId), Cl.principal(recipient), Cl.uint(2)],
    sender,
  );
}

function revokeAccess(dataId: number, recipient: string, sender = dataOwner) {
  return simnet.callPublicFn(
    'dataset-registry',
    'revoke-access',
    [Cl.uint(dataId), Cl.principal(recipient)],
    sender,
  );
}

function getDataset(dataId: number) {
  return simnet.callReadOnlyFn(
    'dataset-registry',
    'get-dataset',
    [Cl.uint(dataId)],
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

function toNumber(value: any): number {
  if (typeof value === 'bigint') return Number(value);
  if (value?.toString) return Number(value.toString());
  return Number(value);
}

describe('data-governance integration', () => {
  it('registers dataset and manages lifecycle (active → deactivated)', () => {
    const registerResult = registerDataset();
    expect(registerResult.result).toBeOk(expect.anything());
    const dataId = toNumber(registerResult.result.value);

    const dataset = getDataset(dataId);
    expect(dataset.result).toBeSome(expect.anything());
    expect(dataset.result.value['is-active']).toBe(true);

    const deactivateResult = deactivateDataset(dataId);
    expect(deactivateResult.result).toBeOk(Cl.bool(true));

    const deactivatedDataset = getDataset(dataId);
    expect(deactivatedDataset.result.value['is-active']).toBe(false);
  });

  it('grants and revokes access to dataset with ownership verification', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const grantResult = grantAccess(dataId, user);
    expect(grantResult.result).toBeOk(Cl.bool(true));

    const accessRecord = getAccess(dataId, user);
    expect(accessRecord.result).toBeSome(expect.anything());

    const revokeResult = revokeAccess(dataId, user);
    expect(revokeResult.result).toBeOk(Cl.bool(true));

    const revokedAccess = getAccess(dataId, user);
    expect(revokedAccess.result).toBeNone();
  });

  it('prevents non-owner from granting or revoking access', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const unauthorizedGrant = simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(dataId), Cl.principal(user), Cl.uint(1)],
      user,
    );
    expect(unauthorizedGrant.result).toBeErr(Cl.uint(411));

    const unauthorizedRevoke = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(dataId), Cl.principal(user)],
      user,
    );
    expect(unauthorizedRevoke.result).toBeErr(Cl.uint(411));
  });

  it('prevents deactivation by non-owner', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const unauthorizedDeactivate = simnet.callPublicFn(
      'dataset-registry',
      'deactivate-dataset',
      [Cl.uint(dataId)],
      user,
    );
    expect(unauthorizedDeactivate.result).toBeErr(Cl.uint(411));
  });

  it('prevents deactivation of already-inactive dataset', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    deactivateDataset(dataId);

    const doubleDeactivate = deactivateDataset(dataId);
    expect(doubleDeactivate.result).toBeErr(Cl.uint(450));
  });

  it('grants access with correct access level and expiry', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    grantAccess(dataId, user);

    const accessRecord = getAccess(dataId, user);
    expect(accessRecord.result).toBeSome(expect.anything());
    const record = accessRecord.result.value;
    expect(record['access-level']).toBe(2n);
    expect(record['expires-at']).toBeGreaterThan(8640n);
  });

  it('allows duplicate access grants to be prevented', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const firstGrant = grantAccess(dataId, user);
    expect(firstGrant.result).toBeOk(Cl.bool(true));

    const duplicateGrant = grantAccess(dataId, user);
    expect(duplicateGrant.result).toBeErr(Cl.uint(444));
  });

  it('prevents self-grant scenarios', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const selfGrant = simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(dataId), Cl.principal(dataOwner), Cl.uint(2)],
      dataOwner,
    );
    expect(selfGrant.result).toBeErr(Cl.uint(610));
  });

  it('prevents access grant to inactive dataset', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    deactivateDataset(dataId);

    const grantToInactive = grantAccess(dataId, user);
    expect(grantToInactive.result).toBeErr(Cl.uint(450));
  });

  it('prevents self-revoke (cannot revoke own access)', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const selfRevoke = simnet.callPublicFn(
      'dataset-registry',
      'revoke-access',
      [Cl.uint(dataId), Cl.principal(dataOwner)],
      dataOwner,
    );
    expect(selfRevoke.result).toBeErr(Cl.uint(611));
  });

  it('validates access status with has-valid-access', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const noAccessBefore = hasValidAccess(dataId, user);
    expect(noAccessBefore.result).toBeOk(Cl.bool(false));

    grantAccess(dataId, user);

    const hasAccessAfter = hasValidAccess(dataId, user);
    expect(hasAccessAfter.result).toBeOk(Cl.bool(true));

    revokeAccess(dataId, user);

    const noAccessAfterRevoke = hasValidAccess(dataId, user);
    expect(noAccessAfterRevoke.result).toBeOk(Cl.bool(false));
  });

  it('rejects invalid access level in grant', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const invalidLevel = simnet.callPublicFn(
      'dataset-registry',
      'grant-access',
      [Cl.uint(dataId), Cl.principal(user), Cl.uint(4)],
      dataOwner,
    );
    expect(invalidLevel.result).toBeErr(Cl.uint(406));
  });

  it('rejects revoke for non-existent access', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const revokeNonExistent = revokeAccess(dataId, user);
    expect(revokeNonExistent.result).toBeErr(Cl.uint(436));
  });

  it('tracks owner in dataset metadata', () => {
    const registerResult = registerDataset();
    const dataId = toNumber(registerResult.result.value);

    const dataset = getDataset(dataId);
    expect(dataset.result).toBeSome(expect.anything());
    const data = dataset.result.value;
    expect(data.owner).toContain(dataOwner ? dataOwner.slice(0, 10) : '');
  });
});
