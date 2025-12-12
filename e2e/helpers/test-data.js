/**
 * Test Data and Fixtures for E2E Tests
 */

export const TEST_WALLET_ADDRESSES = {
  provider: 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
  researcher: 'ST2PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A6',
};

export const TEST_DATASET = {
  name: 'E2E Test Genetic Dataset',
  description: 'Comprehensive genomic dataset for E2E testing',
  sampleSize: 100,
  variantsCount: 50,
  genesCount: 25,
  population: 'Global',
  consentForm: 'test-consent-form.pdf',
  dataFormat: 'VCF',
  fileSize: '2.5 GB',
  isPublic: false,
  tags: ['genomics', 'e2e-testing', 'research'],
};

export const TEST_LISTING = {
  title: 'E2E Test Marketplace Listing',
  description: 'High-quality genomic dataset for research purposes',
  price: 1000000, // 1 STX in microSTX
  accessLevel: 2, // Detailed access
  datasetId: 'test-dataset-123',
  termsAndConditions: 'This dataset is for research purposes only',
  licenseType: 'Academic',
  dataType: 'Whole Genome Sequencing',
  fileFormats: ['VCF', 'BAM'],
  restrictions: ['No redistribution', 'IRB approval required'],
};

export const ACCESS_LEVELS = {
  BASIC: 1,
  DETAILED: 2,
  FULL: 3,
};

export const ROUTES = {
  // Authentication
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Onboarding
  ONBOARDING: '/onboarding',
  
  // Main App
  HOME: '/',
  DASHBOARD: '/dashboard',
  RESEARCHER_DASHBOARD: '/researchers-dashboard',
  MARKETPLACE: '/marketplace',
  DATASETS: '/datasets',
  SETTINGS: '/settings',
  
  // API Endpoints
  API: {
    AUTH: '/api/auth',
    DATASETS: '/api/datasets',
    LISTINGS: '/api/listings',
    USERS: '/api/users',
  },
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
