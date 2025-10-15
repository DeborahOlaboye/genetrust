// Frontend app configuration for SDK/contract integration

// Check if running in development mode
const isDev = import.meta.env.MODE === 'development';

export const APP_CONFIG = {
  // Toggle to enable real contract calls
  // Set to true to use actual Stacks blockchain contracts
  // Set to false to use mock data (useful for UI development)
  USE_REAL_SDK: import.meta.env.VITE_USE_REAL_SDK === 'true' || false,

  // Stacks network: 'testnet' | 'mainnet' | custom URL
  NETWORK: import.meta.env.VITE_NETWORK || 'testnet',
  STACKS_NODE: import.meta.env.VITE_STACKS_NODE || 'https://api.testnet.hiro.so',

  // Contract addresses and names from default.testnet-plan.yaml
  // Deployer: ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161
  // These can be overridden via environment variables
  contracts: {
    datasetRegistry: {
      address: import.meta.env.VITE_DATASET_REGISTRY_ADDRESS || 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: import.meta.env.VITE_DATASET_REGISTRY_NAME || 'dataset-registry',
    },
    exchange: {
      address: import.meta.env.VITE_EXCHANGE_ADDRESS || 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: import.meta.env.VITE_EXCHANGE_NAME || 'exchange',
    },
    attestations: {
      address: import.meta.env.VITE_ATTESTATIONS_ADDRESS || 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: import.meta.env.VITE_ATTESTATIONS_NAME || 'attestations',
    },
    dataGovernance: {
      address: import.meta.env.VITE_DATA_GOVERNANCE_ADDRESS || 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: import.meta.env.VITE_DATA_GOVERNANCE_NAME || 'data-governance',
    },
  },

  // Development mode flag
  isDevelopment: isDev,

  // Debug logging
  enableDebugLogs: isDev || import.meta.env.VITE_DEBUG === 'true',
};
