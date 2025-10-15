// Frontend app configuration for SDK/contract integration

export const APP_CONFIG = {
  // Toggle when the real GeneTrust SDK is browser-ready or a backend API is available.
  USE_REAL_SDK: false,

  // Stacks network: 'testnet' | 'mainnet' | custom URL
  NETWORK: 'testnet',

  // Contract addresses and names (fill in from your deployment receipts)
  contracts: {
    datasetRegistry: {
      address: 'ST_TEST_DATASET_REG',
      name: 'genetic-data',
    },
    exchange: {
      address: 'ST_TEST_EXCHANGE',
      name: 'exchange',
    },
    attestations: {
      address: 'ST_TEST_ATTEST',
      name: 'attestations',
    },
    dataGovernance: {
      address: 'ST_TEST_GOV',
      name: 'data-governance',
    },
  },
};
