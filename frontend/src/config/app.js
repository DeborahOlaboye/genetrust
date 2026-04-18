// Frontend app configuration for SDK/contract integration

// Check if running in development mode
const isDev = import.meta.env.MODE === 'development';

// Known deployer addresses
const TESTNET_DEPLOYER = 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161';
const MAINNET_DEPLOYER = 'SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45';

// Warn if network/node URL mismatch detected
const configuredNetwork = import.meta.env.VITE_NETWORK || 'testnet';
const configuredNode    = import.meta.env.VITE_STACKS_NODE || '';
if (isDev && configuredNetwork === 'mainnet' && configuredNode.includes('testnet')) {
  console.warn('[GeneTrust] VITE_NETWORK=mainnet but VITE_STACKS_NODE points to a testnet URL. Check frontend/.env.local.');
}
if (isDev && configuredNetwork === 'testnet' && configuredNode.includes('api.hiro.so') && !configuredNode.includes('testnet')) {
  console.warn('[GeneTrust] VITE_NETWORK=testnet but VITE_STACKS_NODE points to the mainnet API. Check frontend/.env.local.');
}

// Warn in development if USE_REAL_SDK is true but contract addresses are still defaults
if (isDev && import.meta.env.VITE_USE_REAL_SDK === 'true') {
  const defaultAddr = 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161';
  const vars = [
    'VITE_DATASET_REGISTRY_ADDRESS',
    'VITE_EXCHANGE_ADDRESS',
    'VITE_ATTESTATIONS_ADDRESS',
    'VITE_DATA_GOVERNANCE_ADDRESS',
  ];
  vars.forEach(v => {
    if (!import.meta.env[v] || import.meta.env[v] === defaultAddr) {
      console.warn(`[GeneTrust] ${v} is using the default testnet address. Set it in frontend/.env.local.`);
    }
  });
}

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
      address: import.meta.env.VITE_DATASET_REGISTRY_ADDRESS || TESTNET_DEPLOYER,
      name: import.meta.env.VITE_DATASET_REGISTRY_NAME || 'dataset-registry',
    },
    exchange: {
      address: import.meta.env.VITE_EXCHANGE_ADDRESS || TESTNET_DEPLOYER,
      name: import.meta.env.VITE_EXCHANGE_NAME || 'exchange',
    },
    attestations: {
      address: import.meta.env.VITE_ATTESTATIONS_ADDRESS || TESTNET_DEPLOYER,
      name: import.meta.env.VITE_ATTESTATIONS_NAME || 'attestations',
    },
    dataGovernance: {
      address: import.meta.env.VITE_DATA_GOVERNANCE_ADDRESS || TESTNET_DEPLOYER,
      name: import.meta.env.VITE_DATA_GOVERNANCE_NAME || 'data-governance',
    },
  },

  // Development mode flag
  isDevelopment: isDev,

  // Debug logging
  enableDebugLogs: isDev || import.meta.env.VITE_DEBUG === 'true',

  // Resolved deployer for the active network (useful for explorer links)
  activeDeployer: (import.meta.env.VITE_NETWORK === 'mainnet') ? MAINNET_DEPLOYER : TESTNET_DEPLOYER,
};

export { TESTNET_DEPLOYER, MAINNET_DEPLOYER };
