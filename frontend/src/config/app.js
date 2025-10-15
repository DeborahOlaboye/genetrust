// Frontend app configuration for SDK/contract integration

export const APP_CONFIG = {
  // Toggle when the real GeneTrust SDK is browser-ready or a backend API is available.
  USE_REAL_SDK: false,

  // Stacks network: 'testnet' | 'mainnet' | custom URL
  NETWORK: 'testnet',
  STACKS_NODE: 'https://api.testnet.hiro.so',

  // Contract addresses and names from default.testnet-plan.yaml
  // Deployer: ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161
  contracts: {
    datasetRegistry: {
      address: 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: 'dataset-registry',
    },
    exchange: {
      address: 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: 'exchange',
    },
    attestations: {
      address: 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: 'attestations',
    },
    dataGovernance: {
      address: 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: 'data-governance',
    },
  },
};
