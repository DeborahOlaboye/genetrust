// tests/error-scenarios.test.ts
// Comprehensive error scenario testing across all contract error codes

import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';
import { errorExpectations, generateDatasetParams, generateListingParams, generateVerifierParams, generateProofParams, MOCK_DEPLOYER, MOCK_WALLET_1, MOCK_WALLET_2, INVALID_HASH } from './test-fixtures';

describe('Error Scenarios - Comprehensive Coverage', () => {
  let simnet: any;

  beforeEach(() => {
    simnet = initSimnet();
  });

  describe('Genetic Data Contract - Error Codes', () => {
    describe('ERR_INVALID_DATASET (400)', () => {
      it('should reject register with empty name', () => {
        const result = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii(''),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidInput.code));
      });

      it('should reject register with name exceeding 256 chars', () => {
        const longName = 'a'.repeat(257);
        const result = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii(longName),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidInput.code));
      });

      it('should reject register with invalid hash (wrong length)', () => {
        const result = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(31), 'hex')), // 31 bytes, not 32
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidInput.code));
      });
    });

    describe('ERR_UNAUTHORIZED (403)', () => {
      it('should prevent non-owner from deactivating dataset', () => {
        // First register a dataset
        const registerResult = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        // Then try to deactivate as different user
        const deactivateResult = simnet.callPublicFn(
          'genetic-data',
          'deactivate-dataset',
          [Cl.uint(1)],
          MOCK_WALLET_2
        );

        expect(deactivateResult.result).toBeErr(Cl.uint(errorExpectations.unauthorized.code));
      });

      it('should prevent non-owner from revoking access', () => {
        // Register dataset and grant access as wallet1
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
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

        // Try to revoke as wallet2
        const revokeResult = simnet.callPublicFn(
          'genetic-data',
          'revoke-access',
          [Cl.uint(1), Cl.principal(MOCK_WALLET_2)],
          MOCK_WALLET_2
        );

        expect(revokeResult.result).toBeErr(Cl.uint(errorExpectations.unauthorized.code));
      });
    });

    describe('ERR_DATASET_NOT_FOUND (404)', () => {
      it('should reject grant-access for non-existent dataset', () => {
        const result = simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(999), // Non-existent ID
            Cl.principal(MOCK_WALLET_2),
            Cl.uint(2),
            Cl.uint(100),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.notFound.code));
      });

      it('should reject deactivate for non-existent dataset', () => {
        const result = simnet.callPublicFn(
          'genetic-data',
          'deactivate-dataset',
          [Cl.uint(999)],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.notFound.code));
      });

      it('should reject revoke-access for non-existent dataset', () => {
        const result = simnet.callPublicFn(
          'genetic-data',
          'revoke-access',
          [Cl.uint(999), Cl.principal(MOCK_WALLET_2)],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.notFound.code));
      });
    });

    describe('ERR_INVALID_ACCESS_LEVEL (405)', () => {
      it('should reject access level 0', () => {
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(1),
            Cl.principal(MOCK_WALLET_2),
            Cl.uint(0), // Invalid level
            Cl.uint(100),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidAccessLevel.code));
      });

      it('should reject access level 4', () => {
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(1),
            Cl.principal(MOCK_WALLET_2),
            Cl.uint(4), // Invalid level
            Cl.uint(100),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidAccessLevel.code));
      });
    });

    describe('ERR_DATASET_INACTIVE (407)', () => {
      it('should prevent access grant to inactive dataset', () => {
        // Register and deactivate
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        simnet.callPublicFn(
          'genetic-data',
          'deactivate-dataset',
          [Cl.uint(1)],
          MOCK_WALLET_1
        );

        // Try to grant access
        const result = simnet.callPublicFn(
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

        expect(result.result).toBeErr(Cl.uint(errorExpectations.datasetInactive.code));
      });
    });

    describe('ERR_DUPLICATE_GRANT (408)', () => {
      it('should prevent duplicate access grants', () => {
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        // Grant access first time
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

        // Try to grant again
        const result = simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(1),
            Cl.principal(MOCK_WALLET_2),
            Cl.uint(3),
            Cl.uint(200),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.duplicateGrant.code));
      });
    });

    describe('ERR_SELF_GRANT (409)', () => {
      it('should prevent granting access to self', () => {
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii('Test Dataset'),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(1),
            Cl.principal(MOCK_WALLET_1), // Self
            Cl.uint(2),
            Cl.uint(100),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.selfGrant.code));
      });
    });
  });

  describe('Attestations Contract - Error Codes', () => {
    describe('ERR_INVALID_PROOF (413)', () => {
      it('should reject proof with hash too short', () => {
        // Register verifier first
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        // Try to register proof with invalid hash
        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(1),
            Cl.uint(1), // proof type
            Cl.buffer(Buffer.from('00'.repeat(31), 'hex')), // Only 31 bytes
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidProof.code));
      });

      it('should reject proof with hash too long', () => {
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(1),
            Cl.uint(1),
            Cl.buffer(Buffer.from('00'.repeat(33), 'hex')), // 33 bytes
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidProof.code));
      });

      it('should reject invalid proof type (0)', () => {
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(1),
            Cl.uint(0), // Invalid type
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidProof.code));
      });

      it('should reject invalid proof type (5)', () => {
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(1),
            Cl.uint(5), // Invalid type (max is 4)
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidProof.code));
      });
    });

    describe('ERR_VERIFIER_NOT_FOUND (414)', () => {
      it('should reject proof for non-existent verifier', () => {
        const result = simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(999), // Non-existent verifier
            Cl.uint(1),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.verifierNotFound.code));
      });

      it('should reject verify with non-existent verifier', () => {
        const result = simnet.callPublicFn(
          'attestations',
          'verify-proof',
          [
            Cl.uint(999), // Non-existent
            Cl.uint(1),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.verifierNotFound.code));
      });
    });

    describe('ERR_VERIFIER_INACTIVE (415)', () => {
      it('should prevent proof verification with inactive verifier', () => {
        // Register and deactivate verifier
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        simnet.callPublicFn(
          'attestations',
          'deactivate-verifier',
          [Cl.uint(1)],
          MOCK_WALLET_1
        );

        // Try to verify proof
        const result = simnet.callPublicFn(
          'attestations',
          'verify-proof',
          [Cl.uint(1), Cl.uint(1)],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.verifierInactive.code));
      });
    });

    describe('ERR_PROOF_NOT_FOUND (416)', () => {
      it('should reject verify for non-existent proof', () => {
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'attestations',
          'verify-proof',
          [Cl.uint(1), Cl.uint(999)],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.proofNotFound.code));
      });
    });

    describe('ERR_VERIFIER_NOT_AUTHORIZED (417)', () => {
      it('should prevent verification by non-owner verifier', () => {
        // Wallet1 registers verifier
        simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii('Lab 1')],
          MOCK_WALLET_1
        );

        // Wallet1 registers proof
        simnet.callPublicFn(
          'attestations',
          'register-proof',
          [
            Cl.uint(1),
            Cl.uint(1),
            Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
          ],
          MOCK_WALLET_1
        );

        // Wallet2 tries to verify (not the verifier owner)
        const result = simnet.callPublicFn(
          'attestations',
          'verify-proof',
          [Cl.uint(1), Cl.uint(1)],
          MOCK_WALLET_2
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.verifierNotAuthorized.code));
      });
    });
  });

  describe('Exchange Contract - Error Codes', () => {
    describe('ERR_LISTING_NOT_FOUND (430)', () => {
      it('should reject purchase for non-existent listing', () => {
        const result = simnet.callPublicFn(
          'exchange',
          'purchase-listing',
          [Cl.uint(999), Cl.principal(MOCK_WALLET_1)],
          MOCK_WALLET_2
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.listingNotFound.code));
      });

      it('should reject cancel for non-existent listing', () => {
        const result = simnet.callPublicFn(
          'exchange',
          'cancel-listing',
          [Cl.uint(999)],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.listingNotFound.code));
      });
    });

    describe('ERR_LISTING_INACTIVE (431)', () => {
      it('should reject purchase of cancelled listing', () => {
        // Create and cancel listing first
        const createResult = simnet.callPublicFn(
          'exchange',
          'create-listing',
          [
            Cl.uint(1),
            Cl.uint(500000),
            Cl.uint(2),
            Cl.stringAscii('IPFS://metadata'),
          ],
          MOCK_WALLET_1
        );

        simnet.callPublicFn(
          'exchange',
          'cancel-listing',
          [Cl.uint(1)],
          MOCK_WALLET_1
        );

        // Try to purchase
        const result = simnet.callPublicFn(
          'exchange',
          'purchase-listing',
          [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
          MOCK_WALLET_2
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.listingInactive.code));
      });
    });

    describe('ERR_INVALID_PRICE (432)', () => {
      it('should reject listing with zero price', () => {
        const result = simnet.callPublicFn(
          'exchange',
          'create-listing',
          [
            Cl.uint(1),
            Cl.uint(0), // Invalid price
            Cl.uint(2),
            Cl.stringAscii('IPFS://metadata'),
          ],
          MOCK_WALLET_1
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.invalidPrice.code));
      });
    });

    describe('ERR_SELF_PURCHASE (433)', () => {
      it('should prevent self-purchase of listing', () => {
        simnet.callPublicFn(
          'exchange',
          'create-listing',
          [
            Cl.uint(1),
            Cl.uint(500000),
            Cl.uint(2),
            Cl.stringAscii('IPFS://metadata'),
          ],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'exchange',
          'purchase-listing',
          [Cl.uint(1), Cl.principal(MOCK_WALLET_1)], // Self as owner
          MOCK_WALLET_1 // Self as buyer
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.selfPurchase.code));
      });
    });

    describe('ERR_DUPLICATE_PURCHASE (434)', () => {
      it('should prevent duplicate purchase by same buyer', () => {
        simnet.callPublicFn(
          'exchange',
          'create-listing',
          [
            Cl.uint(1),
            Cl.uint(500000),
            Cl.uint(2),
            Cl.stringAscii('IPFS://metadata'),
          ],
          MOCK_WALLET_1
        );

        // First purchase
        simnet.callPublicFn(
          'exchange',
          'purchase-listing',
          [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
          MOCK_WALLET_2
        );

        // Try duplicate purchase
        const result = simnet.callPublicFn(
          'exchange',
          'purchase-listing',
          [Cl.uint(1), Cl.principal(MOCK_WALLET_1)],
          MOCK_WALLET_2
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.duplicatePurchase.code));
      });
    });

    describe('ERR_LISTING_NOT_AUTHORIZED (435)', () => {
      it('should prevent non-owner from cancelling listing', () => {
        simnet.callPublicFn(
          'exchange',
          'create-listing',
          [
            Cl.uint(1),
            Cl.uint(500000),
            Cl.uint(2),
            Cl.stringAscii('IPFS://metadata'),
          ],
          MOCK_WALLET_1
        );

        const result = simnet.callPublicFn(
          'exchange',
          'cancel-listing',
          [Cl.uint(1)],
          MOCK_WALLET_2 // Different wallet
        );

        expect(result.result).toBeErr(Cl.uint(errorExpectations.listingNotAuthorized.code));
      });
    });
  });
});
