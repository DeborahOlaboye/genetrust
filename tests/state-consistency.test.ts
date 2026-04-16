// tests/state-consistency.test.ts
// State consistency validation and data integrity tests

import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';
import { MOCK_WALLET_1, MOCK_WALLET_2, MOCK_WALLET_3 } from './test-fixtures';

describe('State Consistency and Data Integrity', () => {
  let simnet: any;

  beforeEach(() => {
    simnet = initSimnet();
  });

  describe('Dataset State Consistency', () => {
    it('should maintain correct state after registration', () => {
      // Register dataset
      const registerResult = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('State Test Dataset'),
          Cl.stringAscii('test metadata'),
          Cl.buffer(Buffer.from('aa'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(registerResult.result).toBeOk(expect.anything());

      // Read dataset and verify state
      const readResult = simnet.callReadOnlyFn(
        'genetic-data',
        'get-dataset-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      expect(readResult.result).toBeOk(expect.anything());
      const dataset = readResult.result.value;

      // Verify state fields
      expect(dataset['is-active']).toBe(true);
      expect(dataset.owner).toEqual(Cl.principal(MOCK_WALLET_1));
      expect(dataset['metadata-hash']).toBeDefined();
    });

    it('should transition state correctly on deactivation', () => {
      // Register and deactivate
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Deactivation Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('bb'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Verify active before deactivation
      let before = simnet.callReadOnlyFn(
        'genetic-data',
        'get-dataset-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(before.result.value['is-active']).toBe(true);

      // Deactivate
      simnet.callPublicFn(
        'genetic-data',
        'deactivate-dataset',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Verify inactive after deactivation
      let after = simnet.callReadOnlyFn(
        'genetic-data',
        'get-dataset-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(after.result.value['is-active']).toBe(false);
    });

    it('should prevent double deactivation', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Double Deactivate'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('cc'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // First deactivation
      simnet.callPublicFn(
        'genetic-data',
        'deactivate-dataset',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Second deactivation should fail (dataset not found state or already inactive)
      const result = simnet.callPublicFn(
        'genetic-data',
        'deactivate-dataset',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Should fail with error
      expect(result.result).toBeErr(expect.anything());
    });
  });

  describe('Access Control State Consistency', () => {
    it('should create correct access record with all fields', () => {
      // Setup
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Access State Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('dd'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Grant specific access
      simnet.callPublicFn(
        'genetic-data',
        'grant-access',
        [
          Cl.uint(1),
          Cl.principal(MOCK_WALLET_2),
          Cl.uint(2), // Read-Write
          Cl.uint(12345),
        ],
        MOCK_WALLET_1
      );

      // Read access and verify all fields
      const accessResult = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );

      expect(accessResult.result).toBeOk(expect.anything());
      const access = accessResult.result.value;

      // Verify access fields
      expect(access['access-level']).toBe(2);
      expect(access['expires-at']).toBe(12345n);
      expect(access['granted-by']).toEqual(Cl.principal(MOCK_WALLET_1));
    });

    it('should remove access record on revocation', () => {
      // Setup
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Revoke State Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('ee'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'genetic-data',
        'grant-access',
        [
          Cl.uint(1),
          Cl.principal(MOCK_WALLET_2),
          Cl.uint(2),
          Cl.uint(100),
        ],
        MOCK_WALLET_1
      );

      // Verify access exists
      let before = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(before.result).toBeOk(expect.anything());

      // Revoke access
      simnet.callPublicFn(
        'genetic-data',
        'revoke-access',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_1
      );

      // Verify access removed (should return None)
      let after = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(after.result).toBeNone();
    });

    it('should maintain separate access records for different users', () => {
      // Setup
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Multi-Access Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('ff'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Grant different access to wallet2 and wallet3
      simnet.callPublicFn(
        'genetic-data',
        'grant-access',
        [
          Cl.uint(1),
          Cl.principal(MOCK_WALLET_2),
          Cl.uint(1), // View
          Cl.uint(100),
        ],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'genetic-data',
        'grant-access',
        [
          Cl.uint(1),
          Cl.principal(MOCK_WALLET_3),
          Cl.uint(3), // Admin
          Cl.uint(200),
        ],
        MOCK_WALLET_1
      );

      // Verify wallet2 has level 1
      let access2 = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(access2.result.value['access-level']).toBe(1);

      // Verify wallet3 has level 3
      let access3 = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_3)],
        MOCK_WALLET_3
      );
      expect(access3.result.value['access-level']).toBe(3);
    });
  });

  describe('Marketplace State Consistency', () => {
    it('should maintain listing state through purchase', () => {
      // Setup
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Listing State Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('11'.repeat(32), 'hex')),
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
          Cl.stringAscii('IPFS://state'),
        ],
        MOCK_WALLET_1
      );

      // Verify active before purchase
      let before = simnet.callReadOnlyFn(
        'exchange',
        'get-listing-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(before.result.value.active).toBe(true);

      // Purchase
      simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_2
      );

      // Verify still active after purchase (not auto-cancelled)
      let after = simnet.callReadOnlyFn(
        'exchange',
        'get-listing-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(after.result.value.active).toBe(true);
    });

    it('should transition listing state on cancellation', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Cancel State Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('22'.repeat(32), 'hex')),
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
          Cl.stringAscii('IPFS://cancel'),
        ],
        MOCK_WALLET_1
      );

      // Verify active
      let before = simnet.callReadOnlyFn(
        'exchange',
        'get-listing-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(before.result.value.active).toBe(true);

      // Cancel
      simnet.callPublicFn(
        'exchange',
        'cancel-listing',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Verify inactive
      let after = simnet.callReadOnlyFn(
        'exchange',
        'get-listing-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(after.result.value.active).toBe(false);
    });

    it('should record all purchase details consistently', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Purchase Detail Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('33'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(750000),
          Cl.uint(1),
          Cl.stringAscii('IPFS://purchase'),
        ],
        MOCK_WALLET_1
      );

      // Purchase and record details
      const purchaseResult = simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_2
      );
      expect(purchaseResult.result).toBeOk(expect.anything());

      // Verify purchase recorded
      const purchaseRead = simnet.callReadOnlyFn(
        'exchange',
        'get-purchase-record',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(purchaseRead.result).toBeOk(expect.anything());
    });
  });

  describe('Attestation State Consistency', () => {
    it('should create verifier with correct initial state', () => {
      // Register verifier
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('State Test Lab')],
        MOCK_WALLET_1
      );

      // Read and verify state
      const result = simnet.callReadOnlyFn(
        'attestations',
        'get-verifier-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      expect(result.result).toBeOk(expect.anything());
      const verifier = result.result.value;
      expect(verifier.active).toBe(true);
      expect(verifier.owner).toEqual(Cl.principal(MOCK_WALLET_1));
    });

    it('should transition verifier state on deactivation', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Deactivate Test Lab')],
        MOCK_WALLET_1
      );

      // Verify active
      let before = simnet.callReadOnlyFn(
        'attestations',
        'get-verifier-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(before.result.value.active).toBe(true);

      // Deactivate
      simnet.callPublicFn(
        'attestations',
        'deactivate-verifier',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Verify inactive
      let after = simnet.callReadOnlyFn(
        'attestations',
        'get-verifier-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(after.result.value.active).toBe(false);
    });

    it('should create proof with correct initial state', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Proof State Lab')],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(2),
          Cl.buffer(Buffer.from('44'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Read proof
      const result = simnet.callReadOnlyFn(
        'attestations',
        'get-proof-details',
        [Cl.uint(1), Cl.uint(1)],
        MOCK_WALLET_1
      );

      expect(result.result).toBeOk(expect.anything());
      const proof = result.result.value;
      expect(proof.verified).toBe(false);
      expect(proof['proof-type']).toBe(2);
      expect(proof.creator).toBeDefined();
    });

    it('should transition proof state on verification', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Verify State Lab')],
        MOCK_WALLET_1
      );

      simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(3),
          Cl.buffer(Buffer.from('55'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Verify initially not verified
      let before = simnet.callReadOnlyFn(
        'attestations',
        'get-proof-details',
        [Cl.uint(1), Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(before.result.value.verified).toBe(false);

      // Verify proof
      simnet.callPublicFn(
        'attestations',
        'verify-proof',
        [Cl.uint(1), Cl.uint(1)],
        MOCK_WALLET_1
      );

      // Verify now verified
      let after = simnet.callReadOnlyFn(
        'attestations',
        'get-proof-details',
        [Cl.uint(1), Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(after.result.value.verified).toBe(true);
    });
  });

  describe('Cross-Contract State Consistency', () => {
    it('should maintain state consistency across register→list→purchase flow', () => {
      // Register dataset
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Flow State Test'),
          Cl.stringAscii('test'),
          Cl.buffer(Buffer.from('66'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      // Create listing
      simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(500000),
          Cl.uint(2),
          Cl.stringAscii('IPFS://flow'),
        ],
        MOCK_WALLET_1
      );

      // Purchase and auto-grant access
      simnet.callPublicFn(
        'exchange',
        'purchase-listing',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
        MOCK_WALLET_2
      );

      // Verify dataset still active
      let dataset = simnet.callReadOnlyFn(
        'genetic-data',
        'get-dataset-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(dataset.result.value['is-active']).toBe(true);

      // Verify listing still active
      let listing = simnet.callReadOnlyFn(
        'exchange',
        'get-listing-details',
        [Cl.uint(1)],
        MOCK_WALLET_1
      );
      expect(listing.result.value.active).toBe(true);

      // Verify access created
      let access = simnet.callReadOnlyFn(
        'genetic-data',
        'get-access-details',
        [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
        MOCK_WALLET_2
      );
      expect(access.result).toBeOk(expect.anything());
    });
  });
});
