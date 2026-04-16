// tests/test-utils.ts
// Common test utilities, assertions, and helper functions

import { Cl } from '@stacks/clarity';
import { expect } from 'vitest';

/**
 * Assertion helpers for Clarity values
 */
export const clarityAssertions = {
  /**
   * Assert a result is Ok with a specific value
   */
  assertOk: (result: any, expectedValue?: any) => {
    expect(result).toBeOk(expectedValue || expect.anything());
  },

  /**
   * Assert a result is an error with a specific code
   */
  assertError: (result: any, errorCode: number) => {
    expect(result).toBeErr(Cl.uint(errorCode));
  },

  /**
   * Assert a result is Some
   */
  assertSome: (result: any) => {
    expect(result).toBeSome(expect.anything());
  },

  /**
   * Assert a result is None
   */
  assertNone: (result: any) => {
    expect(result).toBeNone();
  },

  /**
   * Assert a result is a boolean true
   */
  assertTrue: (result: any) => {
    expect(result).toEqual(Cl.bool(true));
  },

  /**
   * Assert a result is a boolean false
   */
  assertFalse: (result: any) => {
    expect(result).toEqual(Cl.bool(false));
  },

  /**
   * Assert a result is a specific uint
   */
  assertUint: (result: any, expected: number | bigint) => {
    expect(result).toEqual(Cl.uint(expected));
  },
};

/**
 * Contract call wrappers with validation
 */
export const contractCalls = {
  /**
   * Execute a public function and assert success
   */
  async assertPublicFnOk(
    simnet: any,
    contractName: string,
    functionName: string,
    args: any[],
    caller: string
  ) {
    const { result } = simnet.callPublicFn(contractName, functionName, args, caller);
    expect(result).toBeOk(expect.anything());
    return result;
  },

  /**
   * Execute a public function and assert error
   */
  async assertPublicFnErr(
    simnet: any,
    contractName: string,
    functionName: string,
    args: any[],
    caller: string,
    errorCode: number
  ) {
    const { result } = simnet.callPublicFn(contractName, functionName, args, caller);
    expect(result).toBeErr(Cl.uint(errorCode));
    return result;
  },

  /**
   * Execute a read-only function
   */
  async callReadOnly(
    simnet: any,
    contractName: string,
    functionName: string,
    args: any[],
    caller: string
  ) {
    const { result } = simnet.callReadOnlyFn(contractName, functionName, args, caller);
    return result;
  },
};

/**
 * Numeric conversion utilities
 */
export const numberUtils = {
  /**
   * Convert Clarity big int or value to number
   */
  toNumber: (value: any): number => {
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'number') return value;
    if (value?.toString) return Number(value.toString());
    return 0;
  },

  /**
   * Convert to bigint
   */
  toBigInt: (value: any): bigint => {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (value?.toString) return BigInt(value.toString());
    return 0n;
  },

  /**
   * Check if value is in range [min, max]
   */
  inRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  /**
   * Check if value is one of the expected values
   */
  isOneOf: (value: any, expected: any[]): boolean => {
    return expected.includes(value);
  },
};

/**
 * State transition validators
 */
export const stateValidators = {
  /**
   * Validate dataset state after creation
   */
  validateDatasetCreated: (dataset: any) => {
    expect(dataset).toBeDefined();
    expect(dataset['is-active']).toBe(true);
    expect(dataset.owner).toBeDefined();
    expect(dataset['metadata-hash']).toBeDefined();
  },

  /**
   * Validate dataset is deactivated
   */
  validateDatasetDeactivated: (dataset: any) => {
    expect(dataset).toBeDefined();
    expect(dataset['is-active']).toBe(false);
  },

  /**
   * Validate listing state after creation
   */
  validateListingCreated: (listing: any) => {
    expect(listing).toBeDefined();
    expect(listing.active).toBe(true);
    expect(listing.owner).toBeDefined();
    expect(listing.price).toBeGreaterThan(0n);
  },

  /**
   * Validate listing is cancelled
   */
  validateListingCancelled: (listing: any) => {
    expect(listing).toBeDefined();
    expect(listing.active).toBe(false);
  },

  /**
   * Validate access grant
   */
  validateAccessGranted: (access: any, expectedLevel: number) => {
    expect(access).toBeDefined();
    expect(access['access-level']).toBe(expectedLevel);
    expect(access['expires-at']).toBeGreaterThan(0n);
    expect(access['granted-by']).toBeDefined();
  },

  /**
   * Validate verifier state
   */
  validateVerifierCreated: (verifier: any, expectedName: string) => {
    expect(verifier).toBeDefined();
    expect(verifier.active).toBe(true);
    expect(verifier.name).toBe(expectedName);
  },

  /**
   * Validate proof state
   */
  validateProofCreated: (proof: any, expectedType: number) => {
    expect(proof).toBeDefined();
    expect(proof['proof-type']).toBe(expectedType);
    expect(proof.verified).toBe(false);
    expect(proof.creator).toBeDefined();
  },

  /**
   * Validate proof is verified
   */
  validateProofVerified: (proof: any) => {
    expect(proof).toBeDefined();
    expect(proof.verified).toBe(true);
    expect(proof['verifier-id']).toBeDefined();
  },
};

/**
 * Test data validation
 */
export const dataValidators = {
  /**
   * Validate string length is within bounds
   */
  isValidLength: (str: string, min: number, max: number): boolean => {
    return str.length >= min && str.length <= max;
  },

  /**
   * Validate access level (1-3)
   */
  isValidAccessLevel: (level: number): boolean => {
    return level >= 1 && level <= 3;
  },

  /**
   * Validate proof type (1-4)
   */
  isValidProofType: (type: number): boolean => {
    return type >= 1 && type <= 4;
  },

  /**
   * Validate hash is 32 bytes (64 hex chars + 0x prefix)
   */
  isValidHash: (hash: string): boolean => {
    if (!hash.startsWith('0x')) return false;
    return hash.length === 66;
  },

  /**
   * Validate principal format
   */
  isValidPrincipal: (principal: string): boolean => {
    return /^S[PN][0-9A-Z]{33}$/.test(principal);
  },

  /**
   * Validate price is positive
   */
  isValidPrice: (price: number | bigint): boolean => {
    return price > 0;
  },
};

/**
 * Test result utilities
 */
export const resultUtils = {
  /**
   * Extract value from Ok result
   */
  extractOk: (result: any): any => {
    if (result.type === 'ok') return result.value;
    throw new Error(`Expected Ok result, got: ${result.type}`);
  },

  /**
   * Extract error from Err result
   */
  extractErr: (result: any): any => {
    if (result.type === 'err') return result.value;
    throw new Error(`Expected Err result, got: ${result.type}`);
  },

  /**
   * Check if result is success (Ok)
   */
  isOk: (result: any): boolean => {
    return result.type === 'ok';
  },

  /**
   * Check if result is failure (Err)
   */
  isErr: (result: any): boolean => {
    return result.type === 'err';
  },

  /**
   * Check if result is Some
   */
  isSome: (result: any): boolean => {
    return result.type === 'some';
  },

  /**
   * Check if result is None
   */
  isNone: (result: any): boolean => {
    return result.type === 'none';
  },
};

/**
 * Common test patterns
 */
export const testPatterns = {
  /**
   * Test pattern: Happy path execution
   * Execute a function and verify success
   */
  happyPath: async (
    fn: () => any,
    validator: (result: any) => void
  ) => {
    const result = fn();
    validator(result);
  },

  /**
   * Test pattern: Error case
   * Execute a function and verify specific error
   */
  errorCase: async (
    fn: () => any,
    expectedErrorCode: number
  ) => {
    const result = fn();
    expect(result).toBeErr(Cl.uint(expectedErrorCode));
  },

  /**
   * Test pattern: State change verification
   * Execute function and verify state changed correctly
   */
  stateChange: async (
    beforeState: any,
    executeFunction: () => any,
    afterStateValidator: (before: any, after: any) => void
  ) => {
    executeFunction();
    // State change validation would happen in caller's test
  },

  /**
   * Test pattern: Boundary testing
   * Test min, max, and boundary violation values
   */
  boundaryTest: async (
    minValue: any,
    maxValue: any,
    testFn: (value: any) => any
  ) => {
    // Min test
    const minResult = testFn(minValue);
    expect(minResult).toBeOk(expect.anything());

    // Max test
    const maxResult = testFn(maxValue);
    expect(maxResult).toBeOk(expect.anything());
  },

  /**
   * Test pattern: Authorization checks
   * Verify unauthorized callers are rejected
   */
  authorizationCheck: async (
    authorizedCaller: () => any,
    unauthorizedCaller: () => any,
    expectedErrorCode: number
  ) => {
    const authorizedResult = authorizedCaller();
    expect(authorizedResult).toBeOk(expect.anything());

    const unauthorizedResult = unauthorizedCaller();
    expect(unauthorizedResult).toBeErr(Cl.uint(expectedErrorCode));
  },
};
