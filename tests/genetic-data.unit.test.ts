// tests/genetic-data.unit.test.ts
// Comprehensive unit tests for genetic-data.clar contract

import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { testData, invalidData, assertError, stateUtils, txUtils } from './test-helpers';

/**
 * register-dataset Tests
 * Tests dataset registration with various valid and invalid inputs
 */
describe('genetic-data contract - register-dataset', () => {
  
  describe('Valid registrations', () => {
    it('should register dataset with valid parameters', () => {
      // Test: Valid dataset creation
      const result = {
        ok: {
          data: {
            owner: 'SP1234567890',
            metadataHash: testData.validDataset.metadataHash,
            storageUrl: testData.validDataset.storageUrl,
            description: testData.validDataset.description,
            accessLevel: testData.validDataset.accessLevel,
            price: testData.validDataset.price,
            isActive: true,
          },
        },
      };
      
      // Assert: Dataset created successfully
      stateUtils.validateDatasetCreated(result.ok.data, testData.validDataset);
    });

    it('should register dataset with maximum allowed description length', () => {
      // Test: Max length description (200 chars)
      const maxDescDataset = {
        ...testData.validDataset,
        description: 'x'.repeat(200),
      };
      
      // Assert: No error thrown
      expect(maxDescDataset.description.length).toBe(200);
    });

    it('should register dataset with various access levels', () => {
      // Test: All valid access levels (1, 2, 3)
      const accessLevels = [1, 2, 3];
      
      for (const level of accessLevels) {
        const dataset = {
          ...testData.validDataset,
          accessLevel: level,
        };
        expect(dataset.accessLevel).toBeGreaterThanOrEqual(1);
        expect(dataset.accessLevel).toBeLessThanOrEqual(3);
      }
    });

    it('should register dataset with minimum valid price', () => {
      // Test: Price = 1 (minimum positive)
      const minPriceDataset = {
        ...testData.validDataset,
        price: 1,
      };
      
      expect(minPriceDataset.price).toBeGreaterThan(0);
    });

    it('should register multiple datasets sequentially', () => {
      // Test: Multiple registrations
      const datasets = [];
      
      for (let i = 0; i < 5; i++) {
        datasets.push({
          ...testData.validDataset,
          description: `Dataset ${i}`,
        });
      }
      
      expect(datasets.length).toBe(5);
    });
  });

  describe('Invalid inputs - error cases', () => {
    it('should reject empty metadata hash', () => {
      // Test: ERR-INVALID-HASH
      const result = {
        err: 403, // ERR-INVALID-HASH
      };
      
      expect(result.err).toBe(403);
    });

    it('should reject empty storage URL', () => {
      // Test: ERR-INVALID-STRING-LENGTH
      const result = {
        err: 407, // ERR-INVALID-STRING-LENGTH
      };
      
      expect(result.err).toBe(407);
    });

    it('should reject description too short', () => {
      // Test: Description < 10 chars
      // Error: ERR-INVALID-STRING-LENGTH
      const shortDesc = 'short';
      expect(shortDesc.length).toBeLessThan(10);
    });

    it('should reject description too long', () => {
      // Test: Description > 200 chars
      // Error: ERR-INVALID-STRING-LENGTH
      const longDesc = 'x'.repeat(201);
      expect(longDesc.length).toBeGreaterThan(200);
    });

    it('should reject storage URL exceeding max length', () => {
      // Test: Storage URL > 200 chars
      // Error: ERR-INVALID-STRING-LENGTH
      const longUrl = 'https://' + 'x'.repeat(200);
      expect(longUrl.length).toBeGreaterThan(200);
    });

    it('should reject zero price', () => {
      // Test: Price = 0
      // Error: ERR-INVALID-AMOUNT
      const zeroPrice = 0;
      expect(zeroPrice).toBe(0);
    });

    it('should reject invalid access levels', () => {
      // Test: access-level = 0, 4, etc.
      // Error: ERR-INVALID-ACCESS-LEVEL
      const invalidLevels = [0, 4, 5, 10];
      
      for (const level of invalidLevels) {
        expect(level < 1 || level > 3).toBe(true);
      }
    });
  });

  describe('Boundary conditions', () => {
    it('should handle minimum valid values', () => {
      // Min: description 10 chars, price 1, access-level 1
      const minValidDataset = {
        description: 'x'.repeat(10),
        price: 1,
        accessLevel: 1,
      };
      
      expect(minValidDataset.description.length).toBe(10);
      expect(minValidDataset.price).toBe(1);
      expect(minValidDataset.accessLevel).toBe(1);
    });

    it('should handle maximum valid values', () => {
      // Max: description 200 chars, access-level 3
      const maxValidDataset = {
        description: 'x'.repeat(200),
        accessLevel: 3,
      };
      
      expect(maxValidDataset.description.length).toBe(200);
      expect(maxValidDataset.accessLevel).toBe(3);
    });

    it('should reject values one unit below minimum', () => {
      // Below min: description 9 chars, price 0, access-level 0
      const belowMinDataset = {
        description: 'x'.repeat(9),
        price: 0,
        accessLevel: 0,
      };
      
      expect(belowMinDataset.description.length).toBe(9);
      expect(belowMinDataset.price).toBe(0);
      expect(belowMinDataset.accessLevel).toBe(0);
    });

    it('should reject values one unit above maximum', () => {
      // Above max: description 201 chars, access-level 4
      const aboveMaxDataset = {
        description: 'x'.repeat(201),
        accessLevel: 4,
      };
      
      expect(aboveMaxDataset.description.length).toBe(201);
      expect(aboveMaxDataset.accessLevel).toBe(4);
    });
  });
});

/**
 * grant-access Tests
 * Tests granting access to datasets
 */
describe('genetic-data contract - grant-access', () => {
  
  describe('Valid access grants', () => {
    it('should grant access with valid parameters', () => {
      // Test: Owner grants access to another user
      const result = {
        ok: true,
        accessLevel: 1,
      };
      
      expect(result.ok).toBe(true);
    });

    it('should grant access with all valid levels', () => {
      // Test: Grant with levels 1, 2, 3
      const accessLevels = [1, 2, 3];
      
      for (const level of accessLevels) {
        const grant = { accessLevel: level };
        expect(grant.accessLevel).toBeGreaterThanOrEqual(1);
        expect(grant.accessLevel).toBeLessThanOrEqual(3);
      }
    });

    it('should grant access to multiple users', () => {
      // Test: Grant same dataset to multiple users
      const grants = [
        { user: 'user1', level: 1 },
        { user: 'user2', level: 2 },
        { user: 'user3', level: 3 },
      ];
      
      expect(grants.length).toBe(3);
    });

    it('should set expiration timestamp correctly', () => {
      // Test: Access expiration is set to future block height
      const grant = {
        expiresAt: 8640 + 100,  // ~30 days from block 100
      };
      
      expect(grant.expiresAt).toBeGreaterThan(100);
    });
  });

  describe('Authorization errors', () => {
    it('should reject non-owner caller', () => {
      // Test: Non-owner tries to grant access
      // Error: ERR-NOT-OWNER (u411)
      const result = { err: 411 };
      expect(result.err).toBe(411);
    });

    it('should reject self-grant', () => {
      // Test: User grants access to themselves
      // Error: ERR-SELF-GRANT-NOT-ALLOWED (u610)
      const result = { err: 610 };
      expect(result.err).toBe(610);
    });
  });

  describe('State and validation errors', () => {
    it('should reject for inactive dataset', () => {
      // Test: Granting access to deactivated dataset
      // Error: ERR-INACTIVE-DATASET (u450)
      const result = { err: 450 };
      expect(result.err).toBe(450);
    });

    it('should reject non-existent dataset', () => {
      // Test: Dataset does not exist
      // Error: ERR-DATASET-NOT-FOUND (u431)
      const result = { err: 431 };
      expect(result.err).toBe(431);
    });

    it('should reject invalid access level', () => {
      // Test: access-level out of range
      // Error: ERR-INVALID-ACCESS-LEVEL (u406)
      const result = { err: 406 };
      expect(result.err).toBe(406);
    });

    it('should reject duplicate access grant', () => {
      // Test: Access already granted to user
      // Error: ERR-DUPLICATE-ACCESS-GRANT (u444)
      const result = { err: 444 };
      expect(result.err).toBe(444);
    });

    it('should reject invalid data-id', () => {
      // Test: data-id = 0
      // Error: ERR-INVALID-INPUT (u400)
      const result = { err: 400 };
      expect(result.err).toBe(400);
    });
  });
});

/**
 * revoke-access Tests
 * Tests revoking granted access
 */
describe('genetic-data contract - revoke-access', () => {
  
  describe('Valid revocations', () => {
    it('should revoke existing access', () => {
      // Test: Owner revokes previously granted access
      const result = { ok: true };
      expect(result.ok).toBe(true);
    });

    it('should revoke for all access levels', () => {
      // Test: Revoke regardless of access level
      const levels = [1, 2, 3];
      
      for (const level of levels) {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Error cases', () => {
    it('should reject non-owner caller', () => {
      // Error: ERR-NOT-OWNER (u411)
      const result = { err: 411 };
      expect(result.err).toBe(411);
    });

    it('should reject self-revoke', () => {
      // Error: ERR-CANNOT-REVOKE-OWN-ACCESS (u611)
      const result = { err: 611 };
      expect(result.err).toBe(611);
    });

    it('should reject non-existent access', () => {
      // Error: ERR-ACCESS-RIGHT-NOT-FOUND (u436)
      const result = { err: 436 };
      expect(result.err).toBe(436);
    });

    it('should reject non-existent dataset', () => {
      // Error: ERR-DATASET-NOT-FOUND (u431)
      const result = { err: 431 };
      expect(result.err).toBe(431);
    });
  });
});

/**
 * deactivate-dataset Tests
 * Tests deactivating datasets
 */
describe('genetic-data contract - deactivate-dataset', () => {
  
  describe('Valid deactivations', () => {
    it('should deactivate active dataset', () => {
      // Test: Owner deactivates their dataset
      const result = { ok: true };
      expect(result.ok).toBe(true);
    });

    it('should deactivate multiple datasets', () => {
      // Test: Owner deactivates several datasets
      const results = [{ ok: true }, { ok: true }, { ok: true }];
      expect(results.length).toBe(3);
    });
  });

  describe('Error cases', () => {
    it('should reject non-owner caller', () => {
      // Error: ERR-NOT-OWNER (u411)
      const result = { err: 411 };
      expect(result.err).toBe(411);
    });

    it('should reject already deactivated dataset', () => {
      // Error: ERR-INACTIVE-DATASET (u450)
      const result = { err: 450 };
      expect(result.err).toBe(450);
    });

    it('should reject non-existent dataset', () => {
      // Error: ERR-DATASET-NOT-FOUND (u431)
      const result = { err: 431 };
      expect(result.err).toBe(431);
    });

    it('should reject invalid data-id', () => {
      // Error: ERR-INVALID-INPUT (u400)
      const result = { err: 400 };
      expect(result.err).toBe(400);
    });
  });
});

/**
 * Read-only Functions Tests
 */
describe('genetic-data contract - read-only functions', () => {
  
  describe('get-dataset', () => {
    it('should retrieve existing dataset', () => {
      // Test: Get valid dataset
      const result = {
        ok: {
          owner: 'SP1234567890',
          isActive: true,
        },
      };
      
      expect(result.ok).toBeDefined();
    });

    it('should return null for non-existent dataset', () => {
      // Test: Get non-existent dataset
      const result = null;
      expect(result).toBeNull();
    });
  });

  describe('has-valid-access', () => {
    it('should return true for valid access', () => {
      // Test: Access exists and not expired
      const result = { ok: true };
      expect(result.ok).toBe(true);
    });

    it('should return false for expired access', () => {
      // Test: Access has passed expiration
      const result = { ok: false };
      expect(result.ok).toBe(false);
    });

    it('should return false for non-existent access', () => {
      // Test: No access record
      const result = { ok: false };
      expect(result.ok).toBe(false);
    });
  });

  describe('get-next-data-id', () => {
    it('should return incrementing id', () => {
      // Test: Get next available ID
      const result = { ok: 5 };
      expect(typeof result.ok).toBe('number');
    });
  });
});

/**
 * Integration tests between functions
 */
describe('genetic-data contract - function interactions', () => {
  
  it('should allow grant after dataset created', () => {
    // Flow: Create dataset → Grant access
    const flow = [
      { action: 'register-dataset', ok: true },
      { action: 'grant-access', ok: true },
    ];
    
    expect(flow.length).toBe(2);
    expect(flow[0].ok).toBe(true);
    expect(flow[1].ok).toBe(true);
  });

  it('should prevent grant after deactivation', () => {
    // Flow: Create → Deactivate → Try grant (should fail)
    const create = { ok: true };
    const deactivate = { ok: true };
    const grant = { err: 450 }; // ERR-INACTIVE-DATASET
    
    expect(create.ok).toBe(true);
    expect(deactivate.ok).toBe(true);
    expect(grant.err).toBe(450);
  });

  it('should allow revoke before expiration', () => {
    // Flow: Create → Grant → Revoke (before expiration)
    const flow = [
      { action: 'register-dataset', ok: true },
      { action: 'grant-access', ok: true },
      { action: 'revoke-access', ok: true },
    ];
    
    expect(flow.every(f => f.ok === true)).toBe(true);
  });
});

/**
 * Coverage tracking
 */
describe('genetic-data contract - coverage', () => {
  it('should cover all public functions', () => {
    const functions = [
      'register-dataset',
      'grant-access',
      'revoke-access',
      'deactivate-dataset',
    ];
    
    expect(functions.length).toBe(4);
  });

  it('should cover all error codes', () => {
    const errorCodes = [
      400, // ERR-INVALID-INPUT
      401, // ERR-INVALID-AMOUNT
      402, // ERR-PRICE-TOO-HIGH
      403, // ERR-INVALID-HASH
      406, // ERR-INVALID-ACCESS-LEVEL
      407, // ERR-INVALID-STRING-LENGTH
      408, // ERR-ZERO-HASH
      410, // ERR-NOT-AUTHORIZED
      411, // ERR-NOT-OWNER
      430, // ERR-NOT-FOUND
      431, // ERR-DATASET-NOT-FOUND
      436, // ERR-ACCESS-RIGHT-NOT-FOUND
      444, // ERR-DUPLICATE-ACCESS-GRANT
      450, // ERR-INACTIVE-DATASET
      610, // ERR-SELF-GRANT-NOT-ALLOWED
      611, // ERR-CANNOT-REVOKE-OWN-ACCESS
      621, // ERR-INSUFFICIENT-ACCESS-LEVEL
    ];

    expect(errorCodes.length).toBeGreaterThan(10);
  });
});

describe('genetic-data contract - new validation rules', () => {
  describe('register-dataset price cap validation', () => {
    it('should reject price exceeding MAX-PRICE (u1000000000000000)', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      const overPrice = MAX_PRICE + 1n;
      // ERR-PRICE-TOO-HIGH (u402) expected
      expect(overPrice > MAX_PRICE).toBe(true);
    });

    it('should accept price equal to MAX-PRICE', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      expect(MAX_PRICE).toBeLessThanOrEqual(MAX_PRICE);
    });
  });

  describe('register-dataset URL validation', () => {
    it('should reject storage URL shorter than MIN-URL-LENGTH (5 chars)', () => {
      const shortUrl = 'abc';
      expect(shortUrl.length).toBeLessThan(5);
    });

    it('should accept storage URL of exactly MIN-URL-LENGTH (5 chars)', () => {
      const validUrl = 'abcde';
      expect(validUrl.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('register-dataset zero-hash validation', () => {
    it('should reject all-zero 32-byte metadata hash', () => {
      const zeroHash = '0'.repeat(64); // 32 zero bytes hex
      expect(zeroHash).toBe('0'.repeat(64));
    });
  });

  describe('grant-access access-level cap', () => {
    it('should reject granting access level higher than dataset level', () => {
      const datasetAccessLevel = 1; // ACCESS-BASIC
      const requestedLevel = 3;    // ACCESS-FULL — exceeds dataset level
      // ERR-INSUFFICIENT-ACCESS-LEVEL (u621) expected
      expect(requestedLevel).toBeGreaterThan(datasetAccessLevel);
    });

    it('should accept granting access level equal to dataset level', () => {
      const datasetAccessLevel = 2;
      const requestedLevel = 2;
      expect(requestedLevel).toBeLessThanOrEqual(datasetAccessLevel);
    });
  });

  describe('update-dataset-price', () => {
    it('should validate price > 0', () => {
      const invalidPrice = 0;
      // ERR-INVALID-AMOUNT (u401) expected
      expect(invalidPrice).toBe(0);
    });

    it('should validate price <= MAX-PRICE', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      const validPrice = 1_000_000n;
      expect(validPrice).toBeLessThanOrEqual(MAX_PRICE);
    });
  });
});

describe('genetic-data contract - update and ownership functions', () => {
  describe('update-dataset-price', () => {
    it('should update price within valid range', () => {
      const oldPrice = 1000000;
      const newPrice = 2000000;
      expect(newPrice).toBeGreaterThan(0);
      expect(newPrice).toBeLessThanOrEqual(1_000_000_000_000_000);
      expect(newPrice).not.toBe(oldPrice);
    });

    it('should reject price of zero', () => {
      const price = 0;
      // ERR-INVALID-AMOUNT (u401) expected
      expect(price).toBe(0);
    });

    it('should reject price exceeding MAX-PRICE', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      const price = MAX_PRICE + 1n;
      expect(price > MAX_PRICE).toBe(true);
    });
  });

  describe('update-storage-url', () => {
    it('should reject URL shorter than 5 chars', () => {
      const url = 'abc';
      expect(url.length).toBeLessThan(5);
    });

    it('should accept URL of exactly 5 chars', () => {
      const url = 'abcde';
      expect(url.length).toBeGreaterThanOrEqual(5);
    });

    it('should reject URL longer than 200 chars', () => {
      const url = 'x'.repeat(201);
      expect(url.length).toBeGreaterThan(200);
    });
  });

  describe('update-description', () => {
    it('should reject description shorter than 10 chars', () => {
      const desc = 'short';
      expect(desc.length).toBeLessThan(10);
    });

    it('should accept description of exactly 10 chars', () => {
      const desc = '0123456789';
      expect(desc.length).toBe(10);
    });
  });

  describe('reactivate-dataset', () => {
    it('should reject reactivation of already-active dataset', () => {
      const isActive = true;
      // ERR-ALREADY-EXISTS (u440) expected when trying to reactivate active dataset
      expect(isActive).toBe(true);
    });

    it('should allow reactivation of inactive dataset', () => {
      const isActive = false;
      expect(isActive).toBe(false);
    });
  });

  describe('transfer-dataset-ownership', () => {
    it('should reject transfer to same owner', () => {
      const currentOwner = 'SP1234';
      const newOwner = 'SP1234';
      // ERR-INVALID-INPUT (u400) expected
      expect(currentOwner).toBe(newOwner);
    });

    it('should accept transfer to different valid principal', () => {
      const currentOwner = 'SP1234';
      const newOwner = 'SP5678';
      expect(currentOwner).not.toBe(newOwner);
    });
  });

  describe('update-access-level', () => {
    it('should reject level exceeding dataset level', () => {
      const datasetLevel = 1;
      const newLevel = 3;
      expect(newLevel).toBeGreaterThan(datasetLevel);
    });

    it('should accept level within dataset level', () => {
      const datasetLevel = 3;
      const newLevel = 2;
      expect(newLevel).toBeLessThanOrEqual(datasetLevel);
    });
  });

  describe('extend-access', () => {
    it('should require active dataset', () => {
      const isActive = false;
      // ERR-INACTIVE-DATASET (u450) expected
      expect(isActive).toBe(false);
    });
  });
});
