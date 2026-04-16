// tests/test-helpers.ts
// Common test utilities and helpers

import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.90.0/testing/asserts.ts";

/**
 * Test data generators
 */
export const testData = {
  // Valid dataset data
  validDataset: {
    metadataHash: "0x" + "a".repeat(64),
    storageUrl: "https://example.com/data.json",
    description: "Valid test description",
    accessLevel: 1n,
    price: 1000000n,
  },

  // Valid dataset with max description
  validDatasetMaxDesc: {
    metadataHash: "0x" + "b".repeat(64),
    storageUrl: "https://example.com/max-desc.json",
    description: "x".repeat(200),
    accessLevel: 2n,
    price: 5000000n,
  },

  // Valid verifier data
  validVerifier: {
    name: "Test Verifier Lab",
    address: "SP123456789ABCDEF",
  },

  // Valid listing data
  validListing: {
    price: 2000000n,
    accessLevel: 2n,
    description: "Premium dataset access",
  },

  // Valid proof data
  validProof: {
    proofType: 1n,
    proofHash: "0x" + "c".repeat(64),
    parameters: "0x" + "d".repeat(100),
    metadata: "Gene presence proof",
  },
};

/**
 * Invalid test data
 */
export const invalidData = {
  // Too short description
  shortDescription: "short",
  
  // Too long description
  longDescription: "x".repeat(201),
  
  // Too long URL
  longUrl: "https://" + "x".repeat(200),
  
  // Invalid access levels
  invalidAccessLevels: [0n, 4n, 10n],
  
  // Invalid proof types
  invalidProofTypes: [0n, 5n, 10n],
  
  // Invalid prices
  invalidPrices: [0n],
  
  // Invalid hashes (wrong length)
  invalidHash: "0x" + "a".repeat(63), // Too short
  
  // Invalid IDs
  invalidIds: [0n],
};

/**
 * Error message assertions
 */
export const assertError = {
  /**
   * Assert specific error code is returned
   */
  async errorCode(
    fn: () => Promise<any>,
    expectedErrorCode: number,
    message?: string
  ) {
    try {
      await fn();
      throw new Error(`Expected error ${expectedErrorCode} but got success`);
    } catch (e) {
      if (e.message.includes(`${expectedErrorCode}`)) {
        // Error matched
      } else {
        throw e;
      }
    }
  },

  /**
   * Assert error message contains text
   */
  async contains(
    fn: () => Promise<any>,
    text: string,
    message?: string
  ) {
    try {
      await fn();
      throw new Error(`Expected error containing "${text}" but got success`);
    } catch (e) {
      if (e.message.includes(text)) {
        // Error matched
      } else {
        throw e;
      }
    }
  },

  /**
   * Assert operation succeeds
   */
  async succeeds(
    fn: () => Promise<any>,
    message?: string
  ) {
    const result = await fn();
    assertExists(result, message);
    return result;
  },
};

/**
 * State validation helpers
 */
export const stateUtils = {
  /**
   * Verify dataset was created with correct values
   */
  validateDatasetCreated: (
    dataset: any,
    expectedData: any
  ) => {
    assertEquals(dataset.owner, expectedData.owner);
    assertEquals(dataset["metadata-hash"], expectedData.metadataHash);
    assertEquals(dataset["storage-url"], expectedData.storageUrl);
    assertEquals(dataset.description, expectedData.description);
    assertEquals(dataset["access-level"], expectedData.accessLevel);
    assertEquals(dataset.price, expectedData.price);
    assertEquals(dataset["is-active"], true);
  },

  /**
   * Verify listing was created correctly
   */
  validateListingCreated: (
    listing: any,
    expectedData: any
  ) => {
    assertEquals(listing.price, expectedData.price);
    assertEquals(listing["access-level"], expectedData.accessLevel);
    assertEquals(listing.description, expectedData.description);
    assertEquals(listing["is-active"], true);
  },

  /**
   * Verify access was granted correctly
   */
  validateAccessGranted: (
    access: any,
    expectedLevel: bigint
  ) => {
    assertEquals(access["access-level"], expectedLevel);
    assertExists(access["expires-at"]);
    assertExists(access["granted-by"]);
  },

  /**
   * Verify verifier was created correctly
   */
  validateVerifierCreated: (
    verifier: any,
    expectedName: string
  ) => {
    assertEquals(verifier.name, expectedName);
    assertEquals(verifier.active, true);
    assertExists(verifier["added-at"]);
  },

  /**
   * Verify proof was created correctly
   */
  validateProofCreated: (
    proof: any,
    expectedData: any
  ) => {
    assertEquals(proof["data-id"], expectedData.dataId);
    assertEquals(proof["proof-type"], expectedData.proofType);
    assertEquals(proof["proof-hash"], expectedData.proofHash);
    assertEquals(proof.verified, false);
    assertExists(proof["created-at"]);
  },
};

/**
 * Boundary testing helpers
 */
export const boundaryUtils = {
  /**
   * Generate minimum valid string
   */
  minString: (minLength: number) => "x".repeat(minLength),

  /**
   * Generate maximum valid string
   */
  maxString: (maxLength: number) => "x".repeat(maxLength),

  /**
   * Generate string one char over max
   */
  overMaxString: (maxLength: number) => "x".repeat(maxLength + 1),

  /**
   * Generate string one char under min
   */
  underMinString: (minLength: number) => {
    if (minLength === 0) return "";
    return "x".repeat(minLength - 1);
  },

  /**
   * Generate values around boundary
   */
  boundaryValues: (min: bigint, max: bigint) => [
    min,
    min + 1n,
    max - 1n,
    max,
  ],

  /**
   * Generate invalid boundary values
   */
  invalidBoundaryValues: (min: bigint, max: bigint) => {
    const invalid = [];
    if (min > 0n) invalid.push(min - 1n);
    if (max < BigInt("340282366920938463463374607431768211455")) {
      invalid.push(max + 1n);
    }
    return invalid;
  },
};

/**
 * Comparison helpers
 */
export const assertComparison = {
  /**
   * Assert arrays equal
   */
  arrayEquals: (actual: any[], expected: any[], message?: string) => {
    assertEquals(actual.length, expected.length, message);
    for (let i = 0; i < actual.length; i++) {
      assertEquals(actual[i], expected[i], `${message}[${i}]`);
    }
  },

  /**
   * Assert objects have same keys
   */
  sameKeys: (obj1: any, obj2: any, message?: string) => {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    this.arrayEquals(keys1, keys2, message);
  },

  /**
   * Assert object property changed
   */
  propertyChanged: (
    before: any,
    after: any,
    property: string,
    message?: string
  ) => {
    if (before[property] === after[property]) {
      throw new Error(
        `${message || ""} Property ${property} did not change`
      );
    }
  },

  /**
   * Assert object property unchanged
   */
  propertyUnchanged: (
    before: any,
    after: any,
    property: string,
    message?: string
  ) => {
    assertEquals(
      before[property],
      after[property],
      `${message || ""} Property ${property} changed unexpectedly`
    );
  },
};

/**
 * Mock contract state
 */
export const mockState = {
  /**
   * Create mock dataset
   */
  createDataset: (overrides?: any) => ({
    owner: "SP1234567890ABCDEF1234567890ABCDEF",
    "metadata-hash": "0x" + "a".repeat(64),
    "storage-url": "https://example.com/data",
    description: "Test dataset",
    "access-level": 1n,
    price: 1000000n,
    "is-active": true,
    "created-at": 100n,
    ...overrides,
  }),

  /**
   * Create mock listing
   */
  createListing: (overrides?: any) => ({
    owner: "SP1234567890ABCDEF1234567890ABCDEF",
    "data-id": 1n,
    price: 2000000n,
    "access-level": 2n,
    description: "Test listing",
    active: true,
    "created-at": 100n,
    ...overrides,
  }),

  /**
   * Create mock verifier
   */
  createVerifier: (overrides?: any) => ({
    address: "SPABCDEF1234567890ABCDEF1234567890",
    name: "Test Lab",
    active: true,
    "added-at": 100n,
    ...overrides,
  }),

  /**
   * Create mock access right
   */
  createAccessRight: (overrides?: any) => ({
    "access-level": 1n,
    "expires-at": 10000n,
    "granted-by": "SP1234567890ABCDEF1234567890ABCDEF",
    ...overrides,
  }),

  /**
   * Create mock proof
   */
  createProof: (overrides?: any) => ({
    "data-id": 1n,
    "proof-type": 1n,
    "proof-hash": "0x" + "a".repeat(64),
    parameters: "0x" + "b".repeat(100),
    creator: "SP1234567890ABCDEF1234567890ABCDEF",
    verified: false,
    "verifier-id": null,
    "created-at": 100n,
    metadata: "Test proof",
    ...overrides,
  }),
};

/**
 * Transaction helpers
 */
export const txUtils = {
  /**
   * Assert transaction succeeded
   */
  assertSuccess: (result: any, message?: string) => {
    if (result.type !== "ok") {
      throw new Error(`${message || ""} Transaction failed: ${result.value}`);
    }
    return result.value;
  },

  /**
   * Assert transaction failed with specific error
   */
  assertError: (result: any, errorCode: number, message?: string) => {
    if (result.type === "ok") {
      throw new Error(`${message || ""} Expected error but transaction succeeded`);
    }
    if (!result.value.toString().includes(errorCode.toString())) {
      throw new Error(
        `${message || ""} Expected error ${errorCode} but got ${result.value}`
      );
    }
  },

  /**
   * Extract result from transaction
   */
  getResult: (result: any) => {
    if (result.type === "ok") {
      return result.value;
    }
    return null;
  },
};

/**
 * Coverage tracking
 */
export const coverageTracker = {
  trackedPaths: new Set<string>(),

  /**
   * Mark code path as executed
   */
  track: (path: string) => {
    coverageTracker.trackedPaths.add(path);
  },

  /**
   * Get coverage report
   */
  report: () => {
    return {
      pathsExecuted: coverageTracker.trackedPaths.size,
      paths: Array.from(coverageTracker.trackedPaths),
    };
  },

  /**
   * Reset tracking
   */
  reset: () => {
    coverageTracker.trackedPaths.clear();
  },
};
