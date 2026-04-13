// tests/multi-contract-workflows.test.ts
// Complex multi-contract workflow scenarios and end-to-end tests

import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';
import { generateDatasetParams, generateListingParams, generateVerifierParams, generateProofParams, MOCK_DEPLOYER, MOCK_WALLET_1, MOCK_WALLET_2, MOCK_WALLET_3 } from './test-fixtures';

describe('Multi-Contract Workflows - End-to-End Scenarios', () => {
  let simnet: any;

  beforeEach(() => {
    simnet = initSimnet();
  });

  describe('Complete Data Marketplace Flow', () => {
    it('should execute full workflow: register → list → purchase → verify', () => {
      // Step 1: Register dataset
      const datasetResult = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Complete Genome Sequence'),
          Cl.stringAscii('Full genome sequencing data'),
          Cl.buffer(Buffer.from('01'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(datasetResult.result).toBeOk(expect.anything());

      // Step 2: Create marketplace listing
      const listingResult = simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(1000000), // 1M uSTX
          Cl.uint(2), // Read access
          Cl.stringAscii('IPFS://QmXxxx/metadata'),
        ],
        MOCK_WALLET_1
      );
      expect(listingResult.result).toBeOk(expect.anything());

      // Step 3: Verify listing exists
      const listingRead = simnet.callReadOnlyFn(
        'exchange',
        'get-listing-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(listingRead.result).toBeOk(expect.anything());

      // Step 4: Purchase from marketplace
      const purchaseResult = simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_2
      );
      expect(purchaseResult.result).toBeOk(expect.anything());

      // Step 5: Access grant automatically created (verified via read-only)
      const accessRead = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(accessRead.result).toBeOk(expect.anything());
    });
  });

  describe('Multi-Dataset Registry with Access Control', () => {
    it('should manage 3 datasets with different access patterns', () => {
      // Register 3 datasets
      const datasets = [];
      for (let i = 0; i < 3; i++) {
        const result = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii(`Dataset ${i + 1}`),
            Cl.stringAscii(`Metadata ${i + 1}`),
            Cl.buffer(Buffer.from(`0${i}`.repeat(32).slice(0, 64), 'hex')),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
        datasets.push(i + 1);
      }

      // Grant different access levels
      // Dataset 1: Read to wallet2
      expect(
        simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(1),
            Cl.principal(MOCK_WALLET_2),
            Cl.uint(1), // View only
            Cl.uint(1000),
          ],
          MOCK_WALLET_1
        ).result
      ).toBeOk(expect.anything());

      // Dataset 2: Read-Write to wallet2
      expect(
        simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(2),
            Cl.principal(MOCK_WALLET_2),
            Cl.uint(2), // Read-write
            Cl.uint(1000),
          ],
          MOCK_WALLET_1
        ).result
      ).toBeOk(expect.anything());

      // Dataset 3: Admin to wallet3
      expect(
        simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(3),
            Cl.principal(MOCK_WALLET_3),
            Cl.uint(3), // Admin
            Cl.uint(1000),
          ],
          MOCK_WALLET_1
        ).result
      ).toBeOk(expect.anything());

      // Verify all access records exist
      for (let i = 0; i < 3; i++) {
        const access = simnet.callReadOnlyFn(
          'genetic-data',
          'get-access-details',
          [Cl.uint(i + 1), Cl.principal(i === 0 ? MOCK_WALLET_2 : i === 1 ? MOCK_WALLET_2 : MOCK_WALLET_3)],
          MOCK_WALLET_1
        );
        expect(access.result).toBeOk(expect.anything());
      }
    });
  });

  describe('Marketplace with Multiple Buyers', () => {
    it('should allow multiple different buyers for same dataset listing', () => {
      // Setup: Register dataset and create listing
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Multi-Buyer Dataset'),
          Cl.stringAscii('Research data for multiple institutions'),
          Cl.buffer(Buffer.from('aa'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(500000),
          Cl.uint(2),
          Cl.stringAscii('IPFS://QmMultiBuyer'),
        ],
        MOCK_WALLET_1
      );

      // Buyer 1 purchases
      const purchase1 = simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_2
      );
      expect(purchase1.result).toBeOk(expect.anything());

      // Verify wallet2 gained access
      let access = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(access.result).toBeOk(expect.anything());

      // Buyer 2 purchases
      const purchase2 = simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_3
      );
      expect(purchase2.result).toBeOk(expect.anything());

      // Verify wallet3 gained access
      access = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_3)],
        MOCK_WALLET_3
      );
      expect(access.result).toBeOk(expect.anything());
    });
  });

  describe('Verifier Network with Proof Attestations', () => {
    it('should create multi-verifier chain with proofs', () => {
      // Register 3 verifiers
      const verifiers = [];
      for (let i = 0; i < 3; i++) {
        const result = simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii(`Lab ${String.fromCharCode(65 + i)}`)],
          [MOCK_WALLET_1, MOCK_WALLET_2, MOCK_WALLET_3][i]
        );
        expect(result.result).toBeOk(expect.anything());
        verifiers.push(i + 1);
      }

      // Each verifier creates a proof
      for (let i = 0; i < 3; i++) {
        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(i + 1),
            Cl.uint((i % 4) + 1), // Proof types 1-4
            Cl.buffer(Buffer.from(`${i}a`.repeat(31) + 'b', 'hex')),
          ],
          [MOCK_WALLET_1, MOCK_WALLET_2, MOCK_WALLET_3][i]
        );
        expect(result.result).toBeOk(expect.anything());
      }

      // Verify all proofs exist and verify them
      for (let i = 0; i < 3; i++) {
        const verifyResult = simnet.callPublicFn(
          'attestations',
          'verify-proof',
          [Cl.uint(i + 1), Cl.uint(i + 1)],
          [MOCK_WALLET_1, MOCK_WALLET_2, MOCK_WALLET_3][i]
        );
        expect(verifyResult.result).toBeOk(expect.anything());
      }
    });

    it('should validate proof types across all verifiers', () => {
      // Register 4 verifiers
      for (let i = 0; i < 4; i++) {
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii(`Type ${i + 1} Lab`)],
          MOCK_WALLET_1
        );
      }

      // Register one proof of each type
      for (let proofType = 1; proofType <= 4; proofType++) {
        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(proofType),
            Cl.uint(proofType),
            Cl.buffer(Buffer.from(`${proofType.toString().repeat(64).slice(0, 64)}`, 'hex')),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }

      // Verify all proof types
      for (let proofType = 1; proofType <= 4; proofType++) {
        const result = simnet.callPublicFn(
          'attestations',
          'verify-proof',
          [Cl.uint(proofType), Cl.uint(proofType)],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }
    });
  });

  describe('Complex Access Revocation Scenarios', () => {
    it('should handle revocation after marketplace purchase', () => {
      // Register and list dataset
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Revocable Dataset'),
          Cl.stringAscii('Test revocation'),
          Cl.buffer(Buffer.from('cc'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(500000),
          Cl.uint(2),
          Cl.stringAscii('IPFS://revocable'),
        ],
        MOCK_WALLET_1
      );

      // Wallet2 purchases
      simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_2
      );

      // Verify access granted
      let accessBefore = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(accessBefore.result).toBeOk(expect.anything());

      // Owner revokes access
      const revokeResult = simnet.callPublicFn(
        'genetic-data',
        'revoke-access',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_1
      );
      expect(revokeResult.result).toBeOk(expect.anything());

      // Verify access revoked (should return None)
      let accessAfter = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(accessAfter.result).toBeNone();
    });
  });

  describe('Deactivation Lifecycle Management', () => {
    it('should prevent operations on deactivated datasets', () => {
      // Setup: Register dataset and list it
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Deactivatable Dataset'),
          Cl.stringAscii('Will be deactivated'),
          Cl.buffer(Buffer.from('dd'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(500000),
          Cl.uint(2),
          Cl.stringAscii('IPFS://deactivatable'),
        ],
        MOCK_WALLET_1
      );

      // Deactivate dataset
      simnet.callPublicFn(
        'genetic-data',
        'deactivate-dataset',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Attempt to grant access should fail
      const grantResult = simnet.callPublicFn(
        'genetic-data',
        'grant-access',
        [
          Cl.uint(1),
          Cl.principal(MOCK_WALLET_2),
          Cl.uint(2),
          Cl.uint(1000),
        ],
        MOCK_WALLET_1
      );
      expect(grantResult.result).toBeErr(Cl.uint(407)); // ERR_DATASET_INACTIVE

      // Revoke should still work (dataset owner management)
      const revokeResult = simnet.callPublicFn(
        'genetic-data',
        'revoke-access',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_1
      );
      // Should succeed or fail based on contract design
      // but grant should definitely fail
    });

    it('should prevent verifier operations after deactivation', () => {
      // Register verifier
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Deactivatable Lab')],
        MOCK_WALLET_1
      );

      // Register proof
      simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.buffer(Buffer.from('ee'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Deactivate verifier
      simnet.callPublicFn(
        'attestations',
        'deactivate-verifier',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Attempt to verify proof should fail
      const verifyResult = simnet.callPublicFn(
        'attestations',
        'verify-proof',
        [Cl.uint(1), Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(verifyResult.result).toBeErr(Cl.uint(415)); // ERR_VERIFIER_INACTIVE
    });
  });

  describe('Concurrent Operations and State Consistency', () => {
    it('should maintain consistency with rapid sequential operations', () => {
      // Register 5 datasets rapidly
      for (let i = 1; i <= 5; i++) {
        const result = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii(`Rapid Dataset ${i}`),
            Cl.stringAscii(`Metadata ${i}`),
            Cl.buffer(Buffer.from(`${i.toString().repeat(64).slice(0, 64)}`, 'hex')),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }

      // Create listings for all 5 datasets
      for (let i = 1; i <= 5; i++) {
        const result = simnet.callPublicFn(
          'exchange',
          'create-listing',
          [
            Cl.uint(i),
            Cl.uint(100000 * i),
            Cl.uint(2),
            Cl.stringAscii(`IPFS://rapid${i}`),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }

      // Verify all listings exist and are active
      for (let i = 1; i <= 5; i++) {
        const listing = simnet.callReadOnlyFn(
          'exchange',
          'get-listing-details',
          [Cl.uint(i)],
          MOCK_WALLET_1
        );
        expect(listing.result).toBeOk(expect.anything());
      }
    });
  });
});
