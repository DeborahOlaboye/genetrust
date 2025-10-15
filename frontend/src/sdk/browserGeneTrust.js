// Browser-exposed SDK implementing real Stacks calls via @stacks/connect
// Exposes window.geneTrust with a minimal contract-centric API.

import { openContractCall } from '@stacks/connect';
import { StacksTestnet, StacksMainnet } from '@stacks/network';
import {
  uintCV,
  principalCV,
  bufferCV,
  boolCV,
  callReadOnlyFunction,
} from '@stacks/transactions';

const state = {
  contracts: null,
  initialized: false,
  network: null,
  appDetails: {
    name: 'GeneTrust',
    icon: '/favicon.svg',
  },
  // In-memory cache for created listings (since on-chain index scan is non-trivial client-side)
  cache: {
    listings: [],
  },
};

function toNetwork(nodeUrl) {
  if (!nodeUrl) return new StacksTestnet();
  // Heuristic: use testnet if url contains 'testnet'
  if (String(nodeUrl).includes('testnet')) return new StacksTestnet({ url: nodeUrl });
  return new StacksMainnet({ url: nodeUrl });
}

function randomBytes(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

function zeroHash32() {
  return new Uint8Array(32);
}

async function ro(exchange, fn, args) {
  return callReadOnlyFunction({
    contractAddress: exchange.address,
    contractName: exchange.name,
    functionName: fn,
    functionArgs: args,
    network: state.network,
    senderAddress: exchange.address, // read-only sender; can be any principal
  });
}

export const geneTrust = {
  config: {
    setContractAddresses(addresses) {
      state.contracts = addresses || null;
    },
  },

  async initialize({ stacksNode, contracts } = {}) {
    if (contracts) this.config.setContractAddresses(contracts);
    state.network = toNetwork(stacksNode);
    state.initialized = true;
    return { ok: true };
  },

  // Data storage placeholder – left as-is client-side
  async storeGeneticData(geneticData, options = {}) {
    const datasetId = Math.floor(Math.random() * 1_000_000);
    return {
      datasetId,
      storageUrl: null,
      options,
    };
  },

  // Create listing on-chain using openContractCall (user wallet signs)
  async createMarketplaceListing({ dataId, price, accessLevel, description, metadataHash, requiresVerification = true }) {
    if (!state.initialized) throw new Error('SDK not initialized');
    if (!state.contracts?.exchange || !state.contracts?.datasetRegistry) throw new Error('Contracts not configured');

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

    const opts = {
      network: state.network,
      contractAddress: exchange.address,
      contractName: exchange.name,
      functionName: 'create-listing',
      functionArgs,
      appDetails: state.appDetails,
    };

    await new Promise((resolve, reject) => {
      openContractCall({
        ...opts,
        onFinish: data => resolve(data),
        onCancel: () => reject(new Error('User cancelled')),
      });
    });

    // Cache minimal listing info for UI browsing
    state.cache.listings.unshift({ listingId, dataId, price, accessLevel, description, createdAt: Date.now() });
    return { listingId };
  },

  // Read-only helper to fetch a single listing by id
  async getListing(listingId) {
    if (!state.contracts?.exchange) throw new Error('Contracts not configured');
    const exchange = state.contracts.exchange;
    const res = await ro(exchange, 'get-listing', [uintCV(Number(listingId))]);
    // res is a clarity value; caller can handle raw value or we can minimally format
    return res;
  },

  // Return cached listings created via this session (no on-chain index available client-only)
  async listMarketplaceListings({ ownerOnly = false } = {}) {
    return state.cache.listings.slice();
  },

  // Purchase listing direct; wallet signs transaction
  async purchaseGeneticData({ listingId, accessLevel }) {
    if (!state.initialized) throw new Error('SDK not initialized');
    if (!state.contracts?.exchange) throw new Error('Contracts not configured');

    const exchange = state.contracts.exchange;
    const txIdBytes = randomBytes(32);
    const functionArgs = [
      uintCV(Number(listingId)),
      uintCV(Number(accessLevel || 1)),
      bufferCV(txIdBytes),
    ];

    const opts = {
      network: state.network,
      contractAddress: exchange.address,
      contractName: exchange.name,
      functionName: 'purchase-listing-direct',
      functionArgs,
      appDetails: state.appDetails,
    };

    const callRes = await new Promise((resolve, reject) => {
      openContractCall({
        ...opts,
        onFinish: data => resolve(data),
        onCancel: () => reject(new Error('User cancelled')),
      });
    });

    return { txId: callRes?.txId || callRes?.txid || 'pending', listingId, accessLevel };
  },
};

if (typeof window !== 'undefined') {
  window.geneTrust = geneTrust;
}
