// tests/test-fixtures.ts
// Reusable test fixtures and mock data generators for consistent test data

import { Cl } from '@stacks/clarity';

/**
 * Mock principal addresses for testing
 */
export const mockPrincipals = {
  deployer: 'ST1PQHQV0PMH7SJ4YADXM3J0G3T0DGJ5GLW8KWF5T',
  wallet1: 'ST2CY5V0RRNUM69GYVVSTXXBHRAP83R4QTWM5RjC',
  wallet2: 'ST3PF13W7R0RTM8V2ZY9HFZQ44MQ6WMTGX5DJMAW7',
  wallet3: 'STDE7Y8HV2FC65A60G66C5EA4CHQE83HGPG4PJVK',
  contractOwner: 'ST1PQHQV0PMH7SJ4YADXM3J0G3T0DGJ5GLW8KWF5T',
};

/**
 * Mock hash values (32 bytes)
 */
export const mockHashes = {
  datasetHash1: '0x0000000000000000000000000000000000000000000000000000000000000001',
  datasetHash2: '0x0000000000000000000000000000000000000000000000000000000000000002',
  proofHashGenePresence: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  proofHashGeneAbsence: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  proofHashVariant: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  proofHashAggregate: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
};

/**
 * Mock URLs for storage and data locations
 */
export const mockURLs = {
  storageUrl1: 'https://storage.example.com/datasets/001',
  storageUrl2: 'https://storage.example.com/datasets/002',
  storageUrl3: 'https://ipfs.io/ipfs/QmExampleHash1',
  storageUrl4: 'https://ipfs.io/ipfs/QmExampleHash2',
  invalidUrl: 'http://localhost',
  longUrl: 'https://storage.example.com/' + 'x'.repeat(200),
};

/**
 * Mock descriptions
 */
export const mockDescriptions = {
  dataset: 'Human genome dataset with SNP information',
  datasetShort: 'Genome SNP data',
  datasetLong: 'Comprehensive human genome sequencing dataset containing SNP, indel, and structural variation information collected from diverse populations',
  proof: 'Gene variant presence proof',
  listing: 'Premium access to curated genetic dataset with medical annotations',
  verifier: 'GeneLab Medical Sequencing Laboratory',
};

/**
 * Mock amounts in microSTX
 */
export const mockAmounts = {
  small: 100000n,
  medium: 1000000n,
  large: 10000000n,
  max: 340282366920938463463374607431768211455n,
};

/**
 * Mock access levels
 */
export const mockAccessLevels = {
  basic: 1,
  detailed: 2,
  full: 3,
};

/**
 * Mock proof types
 */
export const mockProofTypes = {
  genePresence: 1,
  geneAbsence: 2,
  geneVariant: 3,
  aggregate: 4,
};

/**
 * Generate test dataset registration parameters
 */
export function generateDatasetParams(overrides?: Partial<{
  metadataHash: string;
  storageUrl: string;
  description: string;
  accessLevel: number;
  price: number;
}>) {
  const defaults = {
    metadataHash: mockHashes.datasetHash1,
    storageUrl: mockURLs.storageUrl1,
    description: mockDescriptions.dataset,
    accessLevel: mockAccessLevels.detailed,
    price: 1000000,
  };

  const params = { ...defaults, ...overrides };
  
  return [
    Cl.bufferFromHex(params.metadataHash.replace('0x', '')),
    Cl.stringUtf8(params.storageUrl),
    Cl.stringUtf8(params.description),
    Cl.uint(params.accessLevel),
    Cl.uint(params.price),
  ];
}

/**
 * Generate test listing parameters
 */
export function generateListingParams(overrides?: Partial<{
  dataId: number;
  price: number;
  accessLevel: number;
  description: string;
}>) {
  const defaults = {
    dataId: 1,
    price: 1500000,
    accessLevel: mockAccessLevels.detailed,
    description: mockDescriptions.listing,
  };

  const params = { ...defaults, ...overrides };
  
  return [
    Cl.uint(params.dataId),
    Cl.uint(params.price),
    Cl.uint(params.accessLevel),
    Cl.stringUtf8(params.description),
  ];
}

/**
 * Generate test proof parameters
 */
export function generateProofParams(overrides?: Partial<{
  dataId: number;
  proofType: number;
  proofHash: string;
  parameters: string;
  metadata: string;
}>) {
  const defaults = {
    dataId: 1,
    proofType: mockProofTypes.genePresence,
    proofHash: mockHashes.proofHashGenePresence,
    parameters: '0x' + 'a'.repeat(100),
    metadata: mockDescriptions.proof,
  };

  const params = { ...defaults, ...overrides };
  
  return [
    Cl.uint(params.dataId),
    Cl.uint(params.proofType),
    Cl.bufferFromHex(params.proofHash.replace('0x', '')),
    Cl.bufferFromHex(params.parameters.replace('0x', '')),
    Cl.stringUtf8(params.metadata),
  ];
}

/**
 * Generate test verifier registration parameters
 */
export function generateVerifierParams(overrides?: Partial<{
  name: string;
  address?: string;
}>) {
  const defaults = {
    name: mockDescriptions.verifier,
    address: mockPrincipals.wallet1,
  };

  const params = { ...defaults, ...overrides };
  
  return [
    Cl.stringUtf8(params.name),
    ...(params.address ? [Cl.principal(params.address)] : []),
  ];
}

/**
 * Generate access grant parameters
 */
export function generateAccessGrantParams(overrides?: Partial<{
  dataId: number;
  user: string;
  accessLevel: number;
}>) {
  const defaults = {
    dataId: 1,
    user: mockPrincipals.wallet1,
    accessLevel: mockAccessLevels.detailed,
  };

  const params = { ...defaults, ...overrides };
  
  return [
    Cl.uint(params.dataId),
    Cl.principal(params.user),
    Cl.uint(params.accessLevel),
  ];
}

/**
 * Boundary test data generators
 */
export const boundaryData = {
  /**
   * Minimum valid string lengths
   */
  minStrings: {
    verifierName: 'A',
    datasetDescription: 'x'.repeat(10),
    listingDescription: 'x'.repeat(10),
    storageUrl: 'https://a.co',
  },

  /**
   * Maximum valid string lengths
   */
  maxStrings: {
    verifierName: 'x'.repeat(64),
    datasetDescription: 'x'.repeat(200),
    listingDescription: 'x'.repeat(200),
    proofMetadata: 'x'.repeat(200),
  },

  /**
   * One byte/char over maximum
   */
  overMaxStrings: {
    verifierName: 'x'.repeat(65),
    datasetDescription: 'x'.repeat(201),
    listingDescription: 'x'.repeat(201),
    proofMetadata: 'x'.repeat(201),
  },

  /**
   * One byte/char under minimum
   */
  underMinStrings: {
    datasetDescription: 'x'.repeat(9),
    listingDescription: 'x'.repeat(9),
  },

  /**
   * Boundary numeric values
   */
  numericBoundaries: {
    minAccessLevel: 1,
    maxAccessLevel: 3,
    invalidAccessLevelZero: 0,
    invalidAccessLevelFour: 4,
    minProofType: 1,
    maxProofType: 4,
    invalidProofTypeZero: 0,
    invalidProofTypeFive: 5,
    zeroPrice: 0n,
    minPrice: 1n,
    minDataId: 1,
    zeroDataId: 0,
  },
};

/**
 * Error expectation builders
 */
export const errorExpectations = {
  invalidInput: { code: 400, name: 'ERR-INVALID-INPUT' },
  invalidAmount: { code: 401, name: 'ERR-INVALID-AMOUNT' },
  invalidHash: { code: 403, name: 'ERR-INVALID-HASH' },
  invalidProofType: { code: 405, name: 'ERR-INVALID-PROOF-TYPE' },
  invalidAccessLevel: { code: 406, name: 'ERR-INVALID-ACCESS-LEVEL' },
  invalidStringLength: { code: 407, name: 'ERR-INVALID-STRING-LENGTH' },
  invalidBufferSize: { code: 408, name: 'ERR-INVALID-BUFFER-SIZE' },
  invalidParameters: { code: 409, name: 'ERR-INVALID-PARAMETERS' },
  notAuthorized: { code: 410, name: 'ERR-NOT-AUTHORIZED' },
  notOwner: { code: 411, name: 'ERR-NOT-OWNER' },
  notFound: { code: 430, name: 'ERR-NOT-FOUND' },
  datasetNotFound: { code: 431, name: 'ERR-DATASET-NOT-FOUND' },
  listingNotFound: { code: 432, name: 'ERR-LISTING-NOT-FOUND' },
  verifierNotFound: { code: 434, name: 'ERR-VERIFIER-NOT-FOUND' },
  accessRightNotFound: { code: 436, name: 'ERR-ACCESS-RIGHT-NOT-FOUND' },
  inactiveDataset: { code: 450, name: 'ERR-INACTIVE-DATASET' },
  insufficientAccessLevel: { code: 621, name: 'ERR-INSUFFICIENT-ACCESS-LEVEL' },
  priceMismatch: { code: 620, name: 'ERR-PRICE-MISMATCH' },
  verifierInactive: { code: 503, name: 'ERR-VERIFIER-INACTIVE' },
  selfGrantNotAllowed: { code: 610, name: 'ERR-SELF-GRANT-NOT-ALLOWED' },
  duplicateAccessGrant: { code: 444, name: 'ERR-DUPLICATE-ACCESS-GRANT' },
  notContractOwner: { code: 413, name: 'ERR-NOT-CONTRACT-OWNER' },
};

/**
 * Expected state values
 */
export const expectedState = {
  /**
   * Active dataset state
   */
  activeDataset: {
    owner: mockPrincipals.deployer,
    'is-active': true,
    'access-level': mockAccessLevels.detailed,
  },

  /**
   * Active listing state
   */
  activeListing: {
    owner: mockPrincipals.deployer,
    active: true,
    'access-level': mockAccessLevels.detailed,
  },

  /**
   * Active verifier state
   */
  activeVerifier: {
    active: true,
    name: mockDescriptions.verifier,
  },

  /**
   * Unverified proof state
   */
  unverifiedProof: {
    verified: false,
    'verifier-id': null,
  },
};
