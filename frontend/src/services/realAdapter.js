// Adapter that bridges the frontend to the real GeneTrust SDK running in the browser environment
// Expectation: a global SDK instance is available as window.geneTrust, pre-initialized with config and Stacks API
// If you prefer not to expose globals, you can import your browser-safe SDK bundle instead and replace references below.

async function ensureSDK(timeoutMs = 2000) {
  // Try immediate
  if (window?.geneTrust) return window.geneTrust;
  // Wait briefly in case scripts are still loading
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window?.geneTrust) return window.geneTrust;
    await new Promise(r => setTimeout(r, 50));
  }
  // Fallback: try dynamic import (path relative to this file)
  try {
    await import('../sdk/browserGeneTrust.js');
  } catch {}
  const gt = window?.geneTrust;
  if (!gt) throw new Error('GeneTrust SDK not found (window.geneTrust is undefined)');
  return gt;
}

export const RealAdapter = {
  async initialize({ walletAddress, config }) {
    const gt = await ensureSDK();
    // Optionally pass contract addresses/network if not set
    if (config?.contracts && gt?.config?.setContractAddresses) {
      gt.config.setContractAddresses({
        datasetRegistry: config.contracts.datasetRegistry,
        exchange: config.contracts.exchange,
        attestations: config.contracts.attestations,
        dataGovernance: config.contracts.dataGovernance,
      });
    }
    // Initialize the SDK with network node and contract addresses
    await gt.initialize({
      stacksNode: config?.STACKS_NODE,
      contracts: config?.contracts,
    });
    // Propagate wallet if SDK needs it later
    gt._frontendWalletAddress = walletAddress || null;
    return { ok: true };
  },

  async createVaultDataset({ sampleData, description }) {
    const gt = await ensureSDK();
    // The SDK's storeGeneticData expects formatted data and options
    const options = {
      description: description || 'Genomic dataset',
      encrypt: true,
      upload: true,
      // Minimal example; expand with access tiers or proof options as needed
    };
    const res = await gt.storeGeneticData(sampleData, options);
    // Normalize to frontend contractService shape
    return {
      id: res?.datasetId || res?.id || Math.floor(Math.random() * 1_000_000),
      owner: gt._frontendWalletAddress || 'UNKNOWN',
      description,
      accessLevels: [1, 2, 3],
      storedAt: Date.now(),
      stats: {
        variants: sampleData?.variants?.length || 0,
        genes: sampleData?.genes?.length || 0,
      },
      storageUrl: res?.storageUrl,
    };
  },

  async listMyDatasets() {
    const gt = await ensureSDK();
    // If SDK exposes a method, call it; otherwise, return an empty array placeholder
    if (typeof gt.listStoredDatasets === 'function') {
      const list = await gt.listStoredDatasets();
      return list || [];
    }
    return [];
  },

  async createListing({ dataId, price, accessLevel, description }) {
    const gt = await ensureSDK();
    const res = await gt.createMarketplaceListing({
      dataId,
      price,
      accessLevel,
      description,
    });
    return {
      listingId: res?.listingId || Math.floor(Math.random() * 1_000_000),
      dataId,
      owner: gt._frontendWalletAddress || 'UNKNOWN',
      price,
      accessLevel,
      description,
      active: true,
      createdAt: Date.now(),
    };
  },

  async listMarketplace({ ownerOnly = false } = {}) {
    const gt = await ensureSDK();
    if (typeof gt.listMarketplaceListings === 'function') {
      const listings = await gt.listMarketplaceListings({ ownerOnly });
      return listings || [];
    }
    return [];
  },

  async listMarketplaceOnChain({ startId = 1, endId = 100 } = {}) {
    const gt = await ensureSDK();
    if (typeof gt.listMarketplaceListingsOnChain === 'function') {
      const listings = await gt.listMarketplaceListingsOnChain({ startId, endId });
      return listings || [];
    }
    return [];
  },

  async purchaseListing({ listingId, desiredAccessLevel }) {
    const gt = await ensureSDK();
    const res = await gt.purchaseGeneticData({ listingId, accessLevel: desiredAccessLevel });
    return {
      success: !!res,
      listingId,
      accessLevel: desiredAccessLevel,
      txId: res?.txId || `0x${'c'.repeat(64)}`,
      purchasedAt: Date.now(),
    };
  },
};
