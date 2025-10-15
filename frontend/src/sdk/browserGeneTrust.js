// Browser-exposed SDK implementing real Stacks calls via @stacks/connect
// Exposes window.geneTrust with a minimal contract-centric API.

import { request } from '@stacks/connect';
import {
  uintCV,
  principalCV,
  bufferCV,
  boolCV,
  stringUtf8CV,
  someCV,
  noneCV,
  cvToJSON,
  PostConditionMode,
} from '@stacks/transactions';
import { fetchCallReadOnlyFunction } from '@stacks/transactions';
import { APP_CONFIG } from '../config/app.js';

const state = {
  contracts: null,
  initialized: false,
  network: null,
  userAddress: null,
  appDetails: {
    name: 'GeneTrust',
    icon: '/favicon.svg',
  },
  // In-memory cache for created listings (since on-chain index scan is non-trivial client-side)
  cache: {
    listings: [],
    datasets: [],
  },
};

function toNetwork(nodeUrl) {
  // Return network configuration object compatible with @stacks/connect
  const coreApiUrl = nodeUrl || 'https://api.testnet.hiro.so';
  const isTestnet = !nodeUrl || String(nodeUrl).includes('testnet');

  return {
    coreApiUrl, // Required by @stacks/connect
    chainId: isTestnet ? 0x80000000 : 0x00000001,
    name: isTestnet ? 'testnet' : 'mainnet'
  };
}

function randomBytes(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

function zeroHash32() {
  return new Uint8Array(32);
}

async function ro(contract, fn, args) {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: contract.address,
      contractName: contract.name,
      functionName: fn,
      functionArgs: args,
      network: state.network,
      senderAddress: contract.address, // read-only sender; can be any principal
    });
    return result;
  } catch (error) {
    console.error('Read-only call failed:', error);
    throw error;
  }
}

export const geneTrust = {
  config: {
    setContractAddresses(addresses) {
      state.contracts = addresses || null;
    },
  },

  async initialize({ stacksNode, contracts, userAddress } = {}) {
    // Use provided contracts or fall back to APP_CONFIG
    state.contracts = contracts || APP_CONFIG.contracts;
    state.network = toNetwork(stacksNode || APP_CONFIG.STACKS_NODE);
    state.userAddress = userAddress;
    state.initialized = true;

    console.log('GeneTrust SDK initialized:', {
      network: state.network.coreApiUrl,
      contracts: state.contracts,
      userAddress: state.userAddress
    });

    return { ok: true, initialized: true };
  },

  // Register dataset on-chain in dataset-registry contract
  async registerDataset({ dataId, price, accessLevel, metadataHash, storageUrl, description }) {
    if (!state.initialized) throw new Error('SDK not initialized');
    if (!state.contracts?.datasetRegistry) throw new Error('Dataset registry contract not configured');

    console.log('[GeneTrust] Registering dataset:', { dataId, price, accessLevel });

    const registry = state.contracts.datasetRegistry;
    const mh = metadataHash instanceof Uint8Array ? metadataHash : zeroHash32();

    const functionArgs = [
      uintCV(Number(dataId)),
      uintCV(Number(price || 0)),
      uintCV(Number(accessLevel || 1)),
      bufferCV(mh),
      stringUtf8CV(String(storageUrl || '')),
      stringUtf8CV(String(description || '')),
    ];

    console.log('[GeneTrust] Contract call params:', {
      network: state.network,
      contractAddress: registry.address,
      contractName: registry.name,
      functionName: 'register-genetic-data'
    });

    const opts = {
      network: state.network,
      contractAddress: registry.address,
      contractName: registry.name,
      functionName: 'register-genetic-data',
      functionArgs,
      appDetails: state.appDetails,
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        console.log('[GeneTrust] Transaction finished:', data);
        return data;
      },
      onCancel: () => {
        console.log('[GeneTrust] User cancelled transaction');
        throw new Error('User cancelled');
      },
    };

    try {
      console.log('[GeneTrust] Opening contract call with new request API...');

      // Use new @stacks/connect 8.x request API
      const result = await request('stx_callContract', {
        contract: `${registry.address}.${registry.name}`,
        functionName: 'register-genetic-data',
        functionArgs,
        network: state.network,
        appDetails: state.appDetails,
        postConditions: [],
      });

      console.log('[GeneTrust] Transaction result:', result);

      // Cache the dataset with proper structure
      const dataset = {
        id: dataId,
        dataId, // Keep both for compatibility
        owner: state.userAddress,
        price,
        accessLevel,
        description,
        storageUrl,
        accessLevels: [1, 2, 3],
        createdAt: Date.now(),
        storedAt: Date.now(),
        stats: {
          variants: 0,
          genes: 0,
        },
        txId: result?.txid,
      };

      state.cache.datasets.unshift(dataset);

      console.log('[GeneTrust] Dataset registered successfully');
      return dataset;
    } catch (error) {
      console.error('[GeneTrust] Registration failed:', error);

      if (error.message?.includes('User rejected') || error.message?.includes('cancelled')) {
        throw new Error('Transaction cancelled by user');
      } else {
        throw new Error(`Failed to register dataset: ${error.message || error}`);
      }
    }
  },

  // Data storage placeholder – for client-side simulation
  async storeGeneticData(geneticData, options = {}) {
    const datasetId = Math.floor(Math.random() * 1_000_000);
    return {
      datasetId,
      storageUrl: `ipfs://mock-${datasetId}`,
      options,
    };
  },

  // Create listing on-chain using new request API
  async createMarketplaceListing({ dataId, price, accessLevel, description, metadataHash, requiresVerification = true }) {
    if (!state.initialized) throw new Error('SDK not initialized');
    if (!state.contracts?.exchange || !state.contracts?.datasetRegistry) throw new Error('Contracts not configured');

    console.log('[GeneTrust] Creating marketplace listing...');

    const exchange = state.contracts.exchange;
    const registry = state.contracts.datasetRegistry;

    const listingId = Math.floor(Math.random() * 1_000_000);
    const mh = metadataHash instanceof Uint8Array ? metadataHash : zeroHash32();

    const functionArgs = [
      uintCV(listingId),
      uintCV(Number(price || 0)),
      principalCV(`${registry.address}.${registry.name}`),
      uintCV(Number(dataId)),
      uintCV(Number(accessLevel || 1)),
      bufferCV(mh),
      boolCV(!!requiresVerification),
    ];

    try {
      const result = await request('stx_callContract', {
        contract: `${exchange.address}.${exchange.name}`,
        functionName: 'create-listing',
        functionArgs,
        network: state.network,
        appDetails: state.appDetails,
        postConditions: [],
      });

      // Cache minimal listing info for UI browsing
      state.cache.listings.unshift({ listingId, dataId, price, accessLevel, description, active: true, createdAt: Date.now() });

      console.log('[GeneTrust] Listing created successfully');
      return { listingId, txId: result?.txid, result };
    } catch (error) {
      console.error('[GeneTrust] Failed to create listing:', error);
      throw error;
    }
  },

  // Read dataset details from dataset-registry
  async getDataset(dataId) {
    if (!state.contracts?.datasetRegistry) throw new Error('Dataset registry not configured');
    const registry = state.contracts.datasetRegistry;
    try {
      const res = await ro(registry, 'get-dataset-details', [uintCV(Number(dataId))]);
      const json = cvToJSON(res);
      return json?.value || json;
    } catch (e) {
      console.error('Error fetching dataset:', e);
      return null;
    }
  },

  // Read-only helper to fetch a single listing by id
  async getListing(listingId) {
    if (!state.contracts?.exchange) throw new Error('Contracts not configured');
    const exchange = state.contracts.exchange;
    try {
      const res = await ro(exchange, 'get-listing', [uintCV(Number(listingId))]);
      const json = cvToJSON(res);
      return json?.value || json;
    } catch (e) {
      console.error('Error fetching listing:', e);
      return null;
    }
  },

  // Return cached datasets created via this session
  async listMyDatasets() {
    return state.cache.datasets.slice();
  },

  // Return cached listings created via this session (no on-chain index available client-only)
  async listMarketplaceListings({ ownerOnly = false } = {}) {
    return state.cache.listings.slice();
  },

  // Demo on-chain scan: iterate listing-id range and fetch existing listings
  async listMarketplaceListingsOnChain({ startId = 1, endId = 100 } = {}) {
    if (!state.contracts?.exchange) throw new Error('Contracts not configured');
    const exchange = state.contracts.exchange;
    const results = [];

    const s = Number(startId);
    const e = Number(endId);
    const lo = Math.min(s, e);
    const hi = Math.max(s, e);

    for (let id = lo; id <= hi; id++) {
      try {
        const res = await ro(exchange, 'get-listing', [uintCV(id)]);
        const json = cvToJSON(res);
        // Optional some -> tuple
        const opt = json?.value || json?.some || json?.value?.some;
        if (!opt) continue;
        const tuple = opt?.value || opt; // handle shape variations
        const owner = tuple?.owner?.value || tuple?.owner;
        const priceStr = tuple?.price?.value || tuple?.price;
        const accessLevelStr = tuple?.['access-level']?.value || tuple?.['access-level'];
        const active = tuple?.active?.value ?? tuple?.active;
        const dataIdStr = tuple?.['data-id']?.value || tuple?.['data-id'];
        results.push({
          listingId: id,
          owner,
          price: priceStr ? Number(String(priceStr).replace(/^u/, '')) : undefined,
          accessLevel: accessLevelStr ? Number(String(accessLevelStr).replace(/^u/, '')) : undefined,
          active: typeof active === 'boolean' ? active : !!active,
          dataId: dataIdStr ? Number(String(dataIdStr).replace(/^u/, '')) : undefined,
        });
      } catch (e) {
        // ignore missing IDs
      }
    }
    return results;
  },

  // Purchase listing direct; wallet signs transaction
  async purchaseGeneticData({ listingId, accessLevel }) {
    if (!state.initialized) throw new Error('SDK not initialized');
    if (!state.contracts?.exchange) throw new Error('Contracts not configured');

    console.log('[GeneTrust] Purchasing genetic data...');

    const exchange = state.contracts.exchange;
    const txIdBytes = randomBytes(32);
    const functionArgs = [
      uintCV(Number(listingId)),
      uintCV(Number(accessLevel || 1)),
      bufferCV(txIdBytes),
    ];

    try {
      const result = await request('stx_callContract', {
        contract: `${exchange.address}.${exchange.name}`,
        functionName: 'purchase-listing-direct',
        functionArgs,
        network: state.network,
        appDetails: state.appDetails,
        postConditions: [],
      });

      console.log('[GeneTrust] Purchase successful');
      return { success: true, txId: result?.txid || 'pending', listingId, accessLevel };
    } catch (error) {
      console.error('[GeneTrust] Purchase failed:', error);
      throw error;
    }
  },

  // Get status and cached data
  getStatus() {
    return {
      initialized: state.initialized,
      network: state.network?.coreApiUrl,
      userAddress: state.userAddress,
      contracts: state.contracts,
      datasets: state.cache.datasets.length,
      listings: state.cache.listings.length,
      time: Date.now(),
    };
  },

};

if (typeof window !== 'undefined') {
  window.geneTrust = geneTrust;
}
