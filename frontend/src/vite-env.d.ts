/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: 'testnet' | 'mainnet';
  readonly VITE_STACKS_NODE: string;
  readonly VITE_USE_REAL_SDK: string;

  readonly VITE_DATASET_REGISTRY_ADDRESS: string;
  readonly VITE_DATASET_REGISTRY_NAME: string;

  readonly VITE_EXCHANGE_ADDRESS: string;
  readonly VITE_EXCHANGE_NAME: string;

  readonly VITE_ATTESTATIONS_ADDRESS: string;
  readonly VITE_ATTESTATIONS_NAME: string;

  readonly VITE_DATA_GOVERNANCE_ADDRESS: string;
  readonly VITE_DATA_GOVERNANCE_NAME: string;

  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;

  readonly VITE_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
