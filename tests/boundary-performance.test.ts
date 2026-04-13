// tests/boundary-performance.test.ts
// Boundary condition testing and performance test patterns

import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';
import { MOCK_WALLET_1, MOCK_WALLET_2 } from './test-fixtures';

describe('Boundary Conditions and Performance', () => {
  let simnet: any;

  beforeEach(() => {
    simnet = initSimnet();
  });

  describe('String Length Boundaries', () => {
    it('should accept minimum dataset name (1 char)', () => {
      const result = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('A'), // 1 char
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should accept maximum dataset name (256 chars)', () => {
      const longName = 'A'.repeat(256);
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
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject dataset name exceeding 256 chars', () => {
      const tooLongName = 'A'.repeat(257);
      const result = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii(tooLongName),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(400)); // ERR_INVALID_DATASET
    });

    it('should accept minimum verifier name (1 char)', () => {
      const result = simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('L')],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should accept maximum verifier name (128 chars)', () => {
      const longName = 'L'.repeat(128);
      const result = simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii(longName)],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject verifier name exceeding 128 chars', () => {
      const tooLongName = 'L'.repeat(129);
      const result = simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii(tooLongName)],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(400)); // ERR_INVALID_VERIFIER
    });
  });

  describe('Hash Length Boundaries', () => {
    it('should reject hash with 31 bytes (too short)', () => {
      const result = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Hash Test'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(31), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(400)); // ERR_INVALID_DATASET
    });

    it('should accept hash with 32 bytes (exact)', () => {
      const result = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Hash Test'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject hash with 33 bytes (too long)', () => {
      const result = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Hash Test'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(33), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(400)); // ERR_INVALID_DATASET
    });

    it('should reject proof hash with 31 bytes', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.buffer(Buffer.from('00'.repeat(31), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(413)); // ERR_INVALID_PROOF
    });

    it('should accept proof hash with 32 bytes', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject proof hash with 33 bytes', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.buffer(Buffer.from('00'.repeat(33), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(413)); // ERR_INVALID_PROOF
    });
  });

  describe('Numeric Boundaries', () => {
    it('should accept minimum price (1 uSTX)', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Price Test'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(1), // Minimum price
          Cl.uint(2),
          Cl.stringAscii('IPFS://minimal'),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject zero price', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Zero Price Test'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(0), // Zero price
          Cl.uint(2),
          Cl.stringAscii('IPFS://zero'),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(432)); // ERR_INVALID_PRICE
    });

    it('should accept very large price', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Large Price Test'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'exchange',
        'create-listing',
        [
          Cl.uint(1),
          Cl.uint(9007199254740991), // Max safe integer-like value
          Cl.uint(2),
          Cl.stringAscii('IPFS://large'),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should accept minimum expiry (0)', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Expiry Test'),
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
          Cl.uint(2),
          Cl.uint(0), // Expiry 0
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should accept large expiry value', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Large Expiry Test'),
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
          Cl.uint(2),
          Cl.uint(9999999999), // Large expiry
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });
  });

  describe('Access Level Boundaries', () => {
    it('should reject access level 0 (below minimum)', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Level 0 Test'),
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
          Cl.uint(0), // Below minimum
          Cl.uint(100),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(405)); // ERR_INVALID_ACCESS_LEVEL
    });

    it('should accept access level 1 (minimum valid)', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Level 1 Test'),
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
          Cl.uint(1), // Minimum valid
          Cl.uint(100),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should accept access level 3 (maximum valid)', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Level 3 Test'),
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
          Cl.uint(3), // Maximum valid
          Cl.uint(100),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject access level 4 (above maximum)', () => {
      simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('Level 4 Test'),
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
          Cl.uint(4), // Above maximum
          Cl.uint(100),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(405)); // ERR_INVALID_ACCESS_LEVEL
    });
  });

  describe('Proof Type Boundaries', () => {
    it('should reject proof type 0 (below minimum)', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Type 0 Test Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(0), // Below minimum
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(413)); // ERR_INVALID_PROOF
    });

    it('should accept proof type 1 (minimum valid)', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Type 1 Test Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(1), // Minimum valid
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should accept proof type 4 (maximum valid)', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Type 4 Test Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(4), // Maximum valid
          Cl.buffer(Buffer.from('ff'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject proof type 5 (above maximum)', () => {
      simnet.callPublicFn(
        'attestations',
        'register-verifier',
        [Cl.stringAscii('Type 5 Test Lab')],
        MOCK_WALLET_1
      );

      const result = simnet.callPublicFn(
        'attestations',
        'register-proof',
        [
          Cl.uint(1),
          Cl.uint(5), // Above maximum
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(413)); // ERR_INVALID_PROOF
    });
  });

  describe('Resource ID Boundaries', () => {
    it('should handle dataset ID 1 (first)', () => {
      const result = simnet.callPublicFn(
        'genetic-data',
        'register-dataset',
        [
          Cl.stringAscii('First Dataset'),
          Cl.stringAscii('metadata'),
          Cl.buffer(Buffer.from('00'.repeat(32), 'hex')),
        ],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should handle large dataset IDs', () => {
      // Register multiple datasets
      for (let i = 0; i < 10; i++) {
        simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii(`Dataset ${i}`),
            Cl.stringAscii('metadata'),
            Cl.buffer(Buffer.from(`${i}0`.repeat(31) + '00', 'hex')),
          ],
          MOCK_WALLET_1
        );
      }

      // Lookup last one
      const result = simnet.callReadOnlyFn(
        'genetic-data',
        'get-dataset-details',
        [Cl.uint(10)],
        MOCK_WALLET_1
      );
      expect(result.result).toBeOk(expect.anything());
    });

    it('should reject non-existent dataset ID 999', () => {
      const result = simnet.callPublicFn(
        'genetic-data',
        'deactivate-dataset',
        [Cl.uint(999)],
        MOCK_WALLET_1
      );
      expect(result.result).toBeErr(Cl.uint(404)); // ERR_DATASET_NOT_FOUND
    });
  });

  describe('Performance Pattern Tests', () => {
    it('should handle rapid sequential operations', () => {
      // Register 5 datasets rapidly
      for (let i = 1; i <= 5; i++) {
        const result = simnet.callPublicFn(
          'genetic-data',
          'register-dataset',
          [
            Cl.stringAscii(`Rapid ${i}`),
            Cl.stringAscii('fast'),
            Cl.buffer(Buffer.from(`${i}a`.repeat(31) + 'b', 'hex')),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }

      // Grant 5 accesses rapidly
      for (let i = 1; i <= 5; i++) {
        const result = simnet.callPublicFn(
          'genetic-data',
          'grant-access',
          [
            Cl.uint(i),
            Cl.principal(MOCK_WALLET_2),
            Cl.uint((i % 3) + 1),
            Cl.uint(100 * i),
          ],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }
    });

    it('should handle many registrations', () => {
      // Register 20 verifiers
      for (let i = 1; i <= 20; i++) {
        const result = simnet.callPublicFn(
          'attestations',
          'register-verifier',
          [Cl.stringAscii(`Lab ${i}`)],
          MOCK_WALLET_1
        );
        expect(result.result).toBeOk(expect.anything());
      }

      // Verify 20 succeeds
      const read = simnet.callReadOnlyFn(
        'attestations',
        'get-verifier-details',
        [Cl.uint(20)],
        MOCK_WALLET_1
      );
      expect(read.result).toBeOk(expect.anything());
    });
  });
});
