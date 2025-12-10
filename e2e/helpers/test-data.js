/**
 * Test Data and Fixtures for E2E Tests
 */

export const TEST_WALLET_ADDRESSES = {
  provider: 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
  researcher: 'ST2PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A6',
};

export const TEST_DATASET = {
  description: 'E2E Test Genetic Dataset',
  sampleSize: 100,
  variantsCount: 50,
  genesCount: 25,
};

export const TEST_LISTING = {
  price: 1000000, // 1 STX in microSTX
  accessLevel: 2, // Detailed access
  description: 'E2E Test Marketplace Listing',
};

export const ACCESS_LEVELS = {
  BASIC: 1,
  DETAILED: 2,
  FULL: 3,
};

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '#/dashboard',
  RESEARCHER_DASHBOARD: '#/researchers-dashboard',
};

/**
 * Generate mock genetic data for testing
 */
export function generateMockGeneticData(variantsCount = 10) {
  const variants = [];
  const chromosomes = ['chr1', 'chr2', 'chr3', 'chr4', 'chr5'];

  for (let i = 0; i < variantsCount; i++) {
    variants.push({
      id: `rs${1000000 + i}`,
      chromosome: chromosomes[i % chromosomes.length],
      position: 100000 + i * 1000,
      reference: 'A',
      alternate: 'G',
      genotype: 'AG',
    });
  }

  return variants;
}
