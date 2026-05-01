// tests/phase6-validation-matrix.test.ts
// Validation matrix for all Phase 6 input-hardening error codes across all four contracts

import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;

const VALID_HASH = '0000000000000000000000000000000000000000000000000000000000000001';
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const MAX_PRICE = 1_000_000_000_000_000n;
const OVER_MAX_PRICE = 1_000_000_000_000_001n;

// ── dataset-registry helpers ───────────────────────────────────────────────

function registerDataset(
  hash = VALID_HASH,
  url = 'https://storage.example.com/data',
  price = 1_500_000n,
  level = 2,
  sender = deployer,
) {
  return simnet.callPublicFn(
    'dataset-registry',
    'register-dataset',
    [
      Cl.bufferFromHex(hash),
      Cl.stringUtf8(url),
      Cl.stringUtf8('Dataset description'),
      Cl.uint(level),
      Cl.uint(price),
    ],
    sender,
  );
}

function grantAccess(dataId: number, user: string, level: number, sender = deployer) {
  return simnet.callPublicFn(
    'dataset-registry',
    'grant-access',
    [Cl.uint(dataId), Cl.principal(user), Cl.uint(level)],
    sender,
  );
}

// ── exchange helpers ───────────────────────────────────────────────────────

function createListing(price = 1_000_000n, level = 2, sender = deployer) {
  return simnet.callPublicFn(
    'exchange',
    'create-listing',
    [
      Cl.uint(1),
      Cl.uint(price),
      Cl.uint(level),
      Cl.stringUtf8('Listing description'),
    ],
    sender,
  );
}

function updateListingPrice(listingId: number, price: bigint, sender = deployer) {
  return simnet.callPublicFn(
    'exchange',
    'update-listing-price',
    [Cl.uint(listingId), Cl.uint(price)],
    sender,
  );
}

// ── attestations helpers ───────────────────────────────────────────────────

function registerVerifier(sender = deployer) {
  return simnet.callPublicFn(
    'attestations',
    'register-verifier',
    [Cl.stringUtf8('Trusted Lab'), Cl.principal(wallet1)],
    sender,
  );
}

function registerProof(verifierId: number, dataId: number, hash = VALID_HASH, proofType = 1, sender = wallet1) {
  return simnet.callPublicFn(
    'attestations',
    'register-proof',
    [
      Cl.uint(dataId),
      Cl.uint(verifierId),
      Cl.uint(proofType),
      Cl.bufferFromHex(hash),
      Cl.stringUtf8('proof metadata'),
    ],
    sender,
  );
}

function verifyProof(verifierId: number, proofId: number, sender = wallet1) {
  return simnet.callPublicFn(
    'attestations',
    'verify-proof',
    [Cl.uint(verifierId), Cl.uint(proofId)],
    sender,
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PHASE 6 VALIDATION MATRIX
// ══════════════════════════════════════════════════════════════════════════

describe('Phase 6 — validation matrix', () => {

  // ── u402 ERR-PRICE-TOO-HIGH ─────────────────────────────────────────────

  describe('u402 ERR-PRICE-TOO-HIGH', () => {
    it('register-dataset: rejects price one unit above MAX-PRICE', () => {
      const result = registerDataset(VALID_HASH, 'https://storage.example.com/data', OVER_MAX_PRICE);
      expect(result.result).toBeErr(Cl.uint(402));
    });

    it('register-dataset: accepts price exactly at MAX-PRICE', () => {
      const result = registerDataset(VALID_HASH, 'https://storage.example.com/data', MAX_PRICE);
      expect(result.result).toBeOk(expect.anything());
    });

    it('create-listing: rejects price one unit above MAX-PRICE', () => {
      registerDataset();
      const result = createListing(OVER_MAX_PRICE);
      expect(result.result).toBeErr(Cl.uint(402));
    });

    it('create-listing: accepts price exactly at MAX-PRICE', () => {
      registerDataset();
      const result = createListing(MAX_PRICE);
      expect(result.result).toBeOk(expect.anything());
    });

    it('update-listing-price: rejects update to price above MAX-PRICE', () => {
      registerDataset();
      const createResult = createListing(1_000_000n);
      const listingId = Number(createResult.result.value);
      const result = updateListingPrice(listingId, OVER_MAX_PRICE);
      expect(result.result).toBeErr(Cl.uint(402));
    });

    it('update-listing-price: accepts price exactly at MAX-PRICE', () => {
      registerDataset();
      const createResult = createListing(1_000_000n);
      const listingId = Number(createResult.result.value);
      const result = updateListingPrice(listingId, MAX_PRICE);
      expect(result.result).toBeOk(expect.anything());
    });
  });

  // ── u408 ERR-ZERO-HASH ──────────────────────────────────────────────────

  describe('u408 ERR-ZERO-HASH', () => {
    it('register-dataset: rejects all-zero 32-byte hash', () => {
      const result = registerDataset(ZERO_HASH);
      expect(result.result).toBeErr(Cl.uint(408));
    });

    it('register-dataset: accepts a non-zero 32-byte hash', () => {
      const result = registerDataset(VALID_HASH);
      expect(result.result).toBeOk(expect.anything());
    });

    it('register-dataset: accepts a hash with only the last byte non-zero', () => {
      const almostZero = '0000000000000000000000000000000000000000000000000000000000000001';
      const result = registerDataset(almostZero);
      expect(result.result).toBeOk(expect.anything());
    });

    it('register-dataset: accepts a hash with only the first byte non-zero', () => {
      const firstByteSet = 'ff00000000000000000000000000000000000000000000000000000000000000';
      const result = registerDataset(firstByteSet);
      expect(result.result).toBeOk(expect.anything());
    });
  });

  // ── u401 ERR-INVALID-AMOUNT (zero price) ────────────────────────────────

  describe('u401 ERR-INVALID-AMOUNT (zero price)', () => {
    it('register-dataset: rejects price of zero', () => {
      const result = registerDataset(VALID_HASH, 'https://storage.example.com/data', 0n);
      expect(result.result).toBeErr(Cl.uint(401));
    });

    it('register-dataset: accepts price of one', () => {
      const result = registerDataset(VALID_HASH, 'https://storage.example.com/data', 1n);
      expect(result.result).toBeOk(expect.anything());
    });
  });

  // ── URL length validation ────────────────────────────────────────────────

  describe('u404 ERR-INVALID-STRING-LENGTH (URL too short)', () => {
    it('register-dataset: rejects URL shorter than MIN-URL-LENGTH (5 chars)', () => {
      const result = registerDataset(VALID_HASH, 'http');
      expect(result.result).toBeErr(Cl.uint(404));
    });

    it('register-dataset: accepts URL of exactly MIN-URL-LENGTH (5 chars)', () => {
      const result = registerDataset(VALID_HASH, 'http:');
      expect(result.result).toBeOk(expect.anything());
    });

    it('register-dataset: accepts URL of standard length', () => {
      const result = registerDataset(VALID_HASH, 'https://storage.example.com/data');
      expect(result.result).toBeOk(expect.anything());
    });
  });

  // ── access-level cap (grant cannot exceed dataset level) ─────────────────

  describe('u621 ERR-INSUFFICIENT-ACCESS-LEVEL (grant exceeds dataset level)', () => {
    it('grant-access: rejects level 3 on a level-2 dataset', () => {
      const reg = registerDataset(VALID_HASH, 'https://storage.example.com/data', 1_500_000n, 2);
      const dataId = Number(reg.result.value);
      const result = grantAccess(dataId, wallet1, 3);
      expect(result.result).toBeErr(Cl.uint(621));
    });

    it('grant-access: rejects level 2 on a level-1 dataset', () => {
      const reg = registerDataset(VALID_HASH, 'https://storage.example.com/data2', 1_500_000n, 1);
      const dataId = Number(reg.result.value);
      const result = grantAccess(dataId, wallet1, 2);
      expect(result.result).toBeErr(Cl.uint(621));
    });

    it('grant-access: accepts level exactly matching dataset level', () => {
      const reg = registerDataset(VALID_HASH, 'https://storage.example.com/data3', 1_500_000n, 2);
      const dataId = Number(reg.result.value);
      const result = grantAccess(dataId, wallet2, 2);
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it('grant-access: accepts level below dataset level', () => {
      const reg = registerDataset(VALID_HASH, 'https://storage.example.com/data4', 1_500_000n, 3);
      const dataId = Number(reg.result.value);
      const result = grantAccess(dataId, wallet2, 1);
      expect(result.result).toBeOk(Cl.bool(true));
    });
  });

  // ── contract-address self-grant guard ────────────────────────────────────

  describe('u400 ERR-INVALID-INPUT (contract address granted access)', () => {
    it('grant-access: rejects granting access to the contract address itself', () => {
      const reg = registerDataset();
      const dataId = Number(reg.result.value);
      const contractAddress = simnet.deployer + '.dataset-registry';
      const result = simnet.callPublicFn(
        'dataset-registry',
        'grant-access',
        [Cl.uint(dataId), Cl.principal(contractAddress), Cl.uint(1)],
        deployer,
      );
      expect(result.result).toBeErr(Cl.uint(400));
    });
  });

  // ── u446 ERR-ALREADY-VERIFIED ────────────────────────────────────────────

  describe('u446 ERR-ALREADY-VERIFIED (attestations)', () => {
    it('verify-proof: rejects re-verification of an already-verified proof', () => {
      registerVerifier();
      registerDataset();

      const proofResult = registerProof(1, 1);
      const proofId = Number(proofResult.result.value);

      verifyProof(1, proofId);

      const result = verifyProof(1, proofId);
      expect(result.result).toBeErr(Cl.uint(446));
    });

    it('verify-proof: first verification succeeds', () => {
      registerVerifier();
      registerDataset();

      const proofResult = registerProof(1, 1);
      const proofId = Number(proofResult.result.value);

      const result = verifyProof(1, proofId);
      expect(result.result).toBeOk(expect.anything());
    });
  });

  // ── cross-validation: price boundary is consistent across contracts ──────

  describe('price cap boundary consistency', () => {
    it('MAX-PRICE (u1000000000000000) is accepted by both register-dataset and create-listing', () => {
      const regResult = registerDataset(VALID_HASH, 'https://storage.example.com/boundary', MAX_PRICE);
      expect(regResult.result).toBeOk(expect.anything());

      const listResult = createListing(MAX_PRICE);
      expect(listResult.result).toBeOk(expect.anything());
    });

    it('MAX-PRICE + 1 is rejected by both register-dataset and create-listing', () => {
      const regResult = registerDataset(VALID_HASH, 'https://storage.example.com/over', OVER_MAX_PRICE);
      expect(regResult.result).toBeErr(Cl.uint(402));

      const listResult = createListing(OVER_MAX_PRICE);
      expect(listResult.result).toBeErr(Cl.uint(402));
    });
  });
});
