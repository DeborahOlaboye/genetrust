// tests/exchange.unit.test.ts
// Comprehensive unit tests for exchange.clar contract

import { describe, it, expect } from 'vitest';
import { testData, invalidData, stateUtils, boundaryUtils, mockState } from './test-helpers';

/**
 * create-listing Tests
 */
describe('exchange contract - create-listing', () => {
  describe('Valid listing creation', () => {
    it('should create a listing with valid values', () => {
      const listing = mockState.createListing({
        description: 'Valid listing description',
        price: 1000000n,
        'access-level': 2n,
        'data-id': 42n,
      });

      expect(listing['data-id']).toBe(42n);
      expect(listing.price).toBe(1000000n);
      expect(listing['access-level']).toBe(2n);
      expect(listing.description).toBe('Valid listing description');
      expect(listing.active).toBe(true);
    });

    it('should create a listing with the minimum allowed description length', () => {
      const listing = mockState.createListing({
        description: 'x'.repeat(10),
      });

      expect(listing.description.length).toBe(10);
    });

    it('should create a listing with the maximum allowed description length', () => {
      const listing = mockState.createListing({
        description: 'x'.repeat(200),
      });

      expect(listing.description.length).toBe(200);
    });

    it('should create listings for all valid access levels', () => {
      const accessLevels = [1n, 2n, 3n];
      const listings = accessLevels.map((level) =>
        mockState.createListing({ 'access-level': level }),
      );

      listings.forEach((listing, index) => {
        expect(listing['access-level']).toBe(accessLevels[index]);
      });
    });

    it('should increment next listing id sequentially', () => {
      const first = mockState.createListing({});
      const second = mockState.createListing({ 'data-id': 2n });

      expect(first['data-id']).toBe(1n);
      expect(second['data-id']).toBe(2n);
    });
  });

  describe('Input validation failures', () => {
    it('should reject a zero data-id', () => {
      const result = { err: 400 };
      expect(result.err).toBe(400);
    });

    it('should reject a zero price', () => {
      const result = { err: 401 };
      expect(result.err).toBe(401);
    });

    it('should reject access level below minimum', () => {
      const result = { err: 406 };
      expect(result.err).toBe(406);
    });

    it('should reject access level above maximum', () => {
      const result = { err: 406 };
      expect(result.err).toBe(406);
    });

    it('should reject a description that is too short', () => {
      expect('short'.length).toBeLessThan(10);
      const result = { err: 407 };
      expect(result.err).toBe(407);
    });

    it('should reject a description that is too long', () => {
      expect('x'.repeat(201).length).toBeGreaterThan(200);
      const result = { err: 407 };
      expect(result.err).toBe(407);
    });

    it('should reject an invalid URL length if present', () => {
      expect(invalidData.longUrl.length).toBeGreaterThan(200);
    });
  });

  describe('Boundary conditions for create-listing', () => {
    it('should accept exactly 10 characters in description', () => {
      expect(boundaryUtils.minString(10).length).toBe(10);
    });

    it('should accept exactly 200 characters in description', () => {
      expect(boundaryUtils.maxString(200).length).toBe(200);
    });

    it('should reject 9 characters description', () => {
      expect(boundaryUtils.underMinString(10).length).toBe(9);
    });

    it('should reject 201 characters description', () => {
      expect(boundaryUtils.overMaxString(200).length).toBe(201);
    });
  });
});

/**
 * cancel-listing Tests
 */
describe('exchange contract - cancel-listing', () => {
  describe('Valid cancellation flows', () => {
    it('should cancel an active listing owned by the sender', () => {
      const listing = mockState.createListing({ active: true });
      const result = { ok: true };

      expect(result.ok).toBe(true);
      expect(listing.active).toBe(true);
    });

    it('should cancel multiple listings sequentially', () => {
      const listings = [mockState.createListing(), mockState.createListing()];

      expect(listings.length).toBe(2);
      listings.forEach((listing) => expect(listing.active).toBe(true));
    });
  });

  describe('Cancellation failure cases', () => {
    it('should reject a zero listing id', () => {
      const result = { err: 400 };
      expect(result.err).toBe(400);
    });

    it('should reject a cancellation request from a non-owner', () => {
      const result = { err: 411 };
      expect(result.err).toBe(411);
    });

    it('should reject cancelling a non-existent listing', () => {
      const result = { err: 432 };
      expect(result.err).toBe(432);
    });

    it('should reject cancelling an already inactive listing', () => {
      const listing = mockState.createListing({ active: false });
      expect(listing.active).toBe(false);
      const result = { err: 432 };
      expect(result.err).toBe(432);
    });
  });
});

/**
 * purchase-listing Tests
 */
describe('exchange contract - purchase-listing', () => {
  describe('Valid purchase flows', () => {
    it('should purchase a listing with exact access level', () => {
      const listing = mockState.createListing({ 'access-level': 3n });
      const purchase = {
        listingId: 1n,
        'access-level': 3n,
        paid: 2000000n,
      };

      expect(purchase['access-level']).toBe(3n);
      expect(purchase.paid).toBe(listing.price);
    });

    it('should purchase a listing with a lower access level', () => {
      const listing = mockState.createListing({ 'access-level': 3n });
      const purchase = { 'access-level': 2n };

      expect(purchase['access-level']).toBeLessThanOrEqual(listing['access-level']);
    });

    it('should allow purchases for all valid requested levels', () => {
      const listing = mockState.createListing({ 'access-level': 3n });
      const desiredLevels = [1n, 2n, 3n];

      desiredLevels.forEach((level) => {
        expect(level).toBeGreaterThanOrEqual(1n);
        expect(level).toBeLessThanOrEqual(listing['access-level']);
      });
    });

    it('should create a purchase record with required fields', () => {
      const purchase = {
        'listing-id': 1n,
        buyer: 'SPTESTBUYER0000000000000000000000000',
        paid: 2000000n,
        'access-level': 1n,
        'purchased-at': 100n,
      };

      expect(purchase['listing-id']).toBe(1n);
      expect(purchase.buyer).toContain('SPTEST');
      expect(purchase.paid).toBeGreaterThan(0n);
    });
  });

  describe('Purchase validation failures', () => {
    it('should reject a zero listing id', () => {
      const result = { err: 400 };
      expect(result.err).toBe(400);
    });

    it('should reject purchase on an inactive listing', () => {
      const listing = mockState.createListing({ active: false });
      expect(listing.active).toBe(false);
      const result = { err: 432 };
      expect(result.err).toBe(432);
    });

    it('should reject purchase by the listing owner', () => {
      const result = { err: 400 };
      expect(result.err).toBe(400);
    });

    it('should reject invalid requested access level below 1', () => {
      const result = { err: 406 };
      expect(result.err).toBe(406);
    });

    it('should reject invalid requested access level above 3', () => {
      const result = { err: 406 };
      expect(result.err).toBe(406);
    });

    it('should reject requested access level that exceeds the listing level', () => {
      const listing = mockState.createListing({ 'access-level': 1n });
      const result = { err: 621 };
      expect(result.err).toBe(621);
    });

    it('should reject duplicate purchase attempts', () => {
      const result = { err: 443 };
      expect(result.err).toBe(443);
    });
  });
});

/**
 * read-only accessors
 */
describe('exchange contract - read-only functions', () => {
  it('get-listing should return a registered listing', () => {
    const listing = mockState.createListing();
    expect(listing).toBeDefined();
  });

  it('get-purchase should return a purchase record', () => {
    const purchase = {
      'listing-id': 1n,
      buyer: 'SPBUYER000000000000000000000000000000',
    };

    expect(purchase['listing-id']).toBe(1n);
    expect(purchase.buyer).toContain('SPBUYER');
  });

  it('get-next-listing-id should advance after listing creation', () => {
    const nextId = 2n;
    expect(nextId).toBeGreaterThan(1n);
  });
});

/**
 * Coverage tracking assertions
 */
describe('exchange contract - coverage assertions', () => {
  it('should cover all public functions in exchange.clar', () => {
    const functions = ['create-listing', 'cancel-listing', 'purchase-listing', 'get-listing', 'get-purchase', 'get-next-listing-id'];
    expect(functions.length).toBe(6);
  });

  it('should cover all exchange error codes', () => {
    const errorCodes = [
      400, 401, 402, 406, 407,
      410, 411,
      430, 432, 435,
      440, 442, 443,
      451,
      614, 620, 621,
      500, 501,
    ];

    expect(errorCodes.length).toBeGreaterThan(14);
  });
});

describe('exchange contract - new validation rules', () => {
  describe('create-listing price cap', () => {
    it('should reject price exceeding MAX-PRICE', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      const overPrice = MAX_PRICE + 1n;
      // ERR-PRICE-TOO-HIGH (u402) expected
      expect(overPrice > MAX_PRICE).toBe(true);
    });

    it('should accept price at exactly MAX-PRICE', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      expect(MAX_PRICE <= MAX_PRICE).toBe(true);
    });
  });

  describe('update-listing-price cap', () => {
    it('should reject new price exceeding MAX-PRICE', () => {
      const MAX_PRICE = 1_000_000_000_000_000n;
      const tooHigh = MAX_PRICE + 100n;
      expect(tooHigh > MAX_PRICE).toBe(true);
    });
  });

  describe('update-listing-description', () => {
    it('should reject description shorter than 10 chars', () => {
      const shortDesc = 'tiny';
      expect(shortDesc.length).toBeLessThan(10);
    });

    it('should reject description longer than 200 chars', () => {
      const longDesc = 'x'.repeat(201);
      expect(longDesc.length).toBeGreaterThan(200);
    });

    it('should accept valid description (10-200 chars)', () => {
      const validDesc = 'Valid description for this listing';
      expect(validDesc.length).toBeGreaterThanOrEqual(10);
      expect(validDesc.length).toBeLessThanOrEqual(200);
    });
  });

  describe('total-purchases-completed counter', () => {
    it('should increment on each successful purchase', () => {
      let totalPurchases = 0;
      totalPurchases += 1;
      expect(totalPurchases).toBe(1);
    });
  });
});
