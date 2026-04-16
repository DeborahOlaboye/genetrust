import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const verifier = accounts.get('wallet_1')!;
const dataOwner = accounts.get('wallet_2')!;
const buyer = accounts.get('wallet_3')!;

function registerVerifier(name: string, sender = deployer) {
  return simnet.callPublicFn(
    'attestations',
    'register-verifier',
    [Cl.stringUtf8(name)],
    sender,
  );
}

function deactivateVerifier(verifierId: number, sender = deployer) {
  return simnet.callPublicFn(
    'attestations',
    'deactivate-verifier',
    [Cl.uint(verifierId)],
    sender,
  );
}

function registerProof(dataId: number, proofType: number, proofHash: string, sender = dataOwner) {
  return simnet.callPublicFn(
    'attestations',
    'register-proof',
    [
      Cl.uint(dataId),
      Cl.uint(proofType),
      Cl.bufferFromHex(proofHash),
      Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
      Cl.stringUtf8('Test proof metadata'),
    ],
    sender,
  );
}

function verifyProof(proofId: number, verifierId: number, sender = verifier) {
  return simnet.callPublicFn(
    'attestations',
    'verify-proof',
    [Cl.uint(proofId), Cl.uint(verifierId)],
    sender,
  );
}

function getProof(proofId: number) {
  return simnet.callReadOnlyFn(
    'attestations',
    'get-proof',
    [Cl.uint(proofId)],
    deployer,
  );
}

function getVerifier(verifierId: number) {
  return simnet.callReadOnlyFn(
    'attestations',
    'get-verifier',
    [Cl.uint(verifierId)],
    deployer,
  );
}

function isVerified(proofId: number) {
  return simnet.callReadOnlyFn(
    'attestations',
    'is-verified',
    [Cl.uint(proofId)],
    deployer,
  );
}

function toNumber(value: any): number {
  if (typeof value === 'bigint') return Number(value);
  if (value?.toString) return Number(value.toString());
  return Number(value);
}

describe('attestations-proof integration', () => {
  it('registers a verifier and creates a proof for verification', () => {
    const verifierResult = registerVerifier('GeneLab Medical');
    expect(verifierResult.result).toBeOk(expect.anything());
    const verifierId = toNumber(verifierResult.result.value);

    const proofResult = registerProof(1, 1, 'a'.repeat(64));
    expect(proofResult.result).toBeOk(expect.anything());
    const proofId = toNumber(proofResult.result.value);

    const proof = getProof(proofId);
    expect(proof.result).toBeSome(expect.anything());
  });

  it('verifies a proof using an active verifier', () => {
    const verifierResult = registerVerifier('VerifiLab Inc');
    const verifierId = toNumber(verifierResult.result.value);

    const proofResult = registerProof(2, 2, 'b'.repeat(64));
    const proofId = toNumber(proofResult.result.value);

    const verifyResult = verifyProof(proofId, verifierId);
    expect(verifyResult.result).toBeOk(Cl.bool(true));

    const verified = isVerified(proofId);
    expect(verified.result).toBeOk(Cl.bool(true));
  });

  it('prevents proof verification using an inactive verifier', () => {
    const verifierResult = registerVerifier('InactiveLab');
    const verifierId = toNumber(verifierResult.result.value);

    deactivateVerifier(verifierId);

    const proofResult = registerProof(3, 3, 'c'.repeat(64));
    const proofId = toNumber(proofResult.result.value);

    const verifyResult = verifyProof(proofId, verifierId);
    expect(verifyResult.result).toBeErr(Cl.uint(503));
  });

  it('allows multiple verifiers with distinct proofs', () => {
    const verifier1Result = registerVerifier('Lab One');
    const verifierId1 = toNumber(verifier1Result.result.value);

    const verifier2Result = registerVerifier('Lab Two');
    const verifierId2 = toNumber(verifier2Result.result.value);

    const proof1Result = registerProof(4, 1, 'd'.repeat(64));
    const proofId1 = toNumber(proof1Result.result.value);

    const proof2Result = registerProof(5, 2, 'e'.repeat(64));
    const proofId2 = toNumber(proof2Result.result.value);

    verifyProof(proofId1, verifierId1);
    verifyProof(proofId2, verifierId2);

    const verified1 = isVerified(proofId1);
    const verified2 = isVerified(proofId2);

    expect(verified1.result).toBeOk(Cl.bool(true));
    expect(verified2.result).toBeOk(Cl.bool(true));
  });

  it('rejects proof registration with invalid proof type', () => {
    const proofResult = simnet.callPublicFn(
      'attestations',
      'register-proof',
      [
        Cl.uint(6),
        Cl.uint(5),
        Cl.bufferFromHex('f'.repeat(64)),
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
        Cl.stringUtf8('Invalid type'),
      ],
      dataOwner,
    );

    expect(proofResult.result).toBeErr(Cl.uint(405));
  });

  it('rejects proof registration with invalid hash length', () => {
    const proofResult = simnet.callPublicFn(
      'attestations',
      'register-proof',
      [
        Cl.uint(7),
        Cl.uint(1),
        Cl.bufferFromHex('a'.repeat(62)),
        Cl.bufferFromHex('0000000000000000000000000000000000000000000000000000000000000001'),
        Cl.stringUtf8('Hash too short'),
      ],
      dataOwner,
    );

    expect(proofResult.result).toBeErr(Cl.uint(403));
  });

  it('rejects verifier registration with empty name', () => {
    const verifierResult = registerVerifier('');
    expect(verifierResult.result).toBeErr(Cl.uint(407));
  });

  it('rejects verifier registration with name exceeding max length', () => {
    const longName = 'x'.repeat(65);
    const verifierResult = registerVerifier(longName);
    expect(verifierResult.result).toBeErr(Cl.uint(407));
  });

  it('confirms registered verifier is returned with active status', () => {
    const verifierResult = registerVerifier('Active Verifier');
    const verifierId = toNumber(verifierResult.result.value);

    const verifierData = getVerifier(verifierId);
    expect(verifierData.result).toBeSome(expect.anything());
    const verifier = verifierData.result.value;
    expect(verifier.active).toBe(true);
  });

  it('confirms proof creator matches the caller', () => {
    const proofResult = registerProof(8, 1, 'aa'.repeat(32), dataOwner);
    const proofId = toNumber(proofResult.result.value);

    const proof = getProof(proofId);
    expect(proof.result).toBeSome(expect.anything());
    const proofData = proof.result.value;
    expect(proofData.creator).toContain(dataOwner ? dataOwner.slice(0, 10) : '');
  });

  it('handles all four proof types in registration', () => {
    const proofTypes = [1, 2, 3, 4];
    
    for (const proofType of proofTypes) {
      const proofResult = registerProof(100 + proofType, proofType, 'b'.repeat(64));
      expect(proofResult.result).toBeOk(expect.anything());
      expect(toNumber(proofResult.result.value)).toBeGreaterThan(0);
    }
  });
});
