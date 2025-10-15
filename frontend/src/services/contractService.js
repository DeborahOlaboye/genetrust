// Lightweight frontend contract service
// For now, this uses mock implementations compatible with the existing UI.
// Later, wire this to real Stacks contracts or a backend API.

// NOTE: Avoid importing Node-only SDK code here to keep Vite/browser happy.
// We simulate key actions and keep the API shape stable for future upgrades.
import { walletService } from './walletService.js';
import { APP_CONFIG } from '../config/app.js';
import { RealAdapter } from './realAdapter.js';

export class ContractService {
  constructor() {
    this.initialized = false;
    this.walletAddress = null;

    // Mock in-memory state
    this._datasets = [];
    this._listings = [];
  }

  async initialize({ walletAddress } = {}) {
    this.walletAddress = walletAddress || walletService.getAddress() || null;
    if (APP_CONFIG.USE_REAL_SDK) {
      await RealAdapter.initialize({ walletAddress: this.walletAddress, config: APP_CONFIG });
      this.initialized = true;
      return { initialized: true, mode: 'real' };
    }
    this.initialized = true;
    return { initialized: true, mode: 'mock' };
  }

  // Simulate creating a vault dataset and storing metadata
  async createVaultDataset({ sampleData, description = '' }) {
    if (APP_CONFIG.USE_REAL_SDK) {
      return RealAdapter.createVaultDataset({ sampleData, description });
    }
    const id = Math.floor(Math.random() * 1_000_000);
    const now = Date.now();
    const dataset = {
      id,
      owner: this.walletAddress || 'ST1MOCKOWNER',
      description: description || 'Private genomic dataset',
      accessLevels: [1, 2, 3],
      storedAt: now,
      stats: {
        variants: sampleData?.variants?.length || 0,
        genes: sampleData?.genes?.length || 0,
      },
      storageUrl: `ipfs://mock-${id}/genetic-data-${id}.enc`,
    };
    this._datasets.unshift(dataset);
    return dataset;
  }

  async listMyDatasets() {
    if (APP_CONFIG.USE_REAL_SDK) {
      return RealAdapter.listMyDatasets();
    }
    return this._datasets.filter(d => d.owner === (this.walletAddress || 'ST1MOCKOWNER'));
  }

  async createListing({ dataId, price, accessLevel, description }) {
    if (APP_CONFIG.USE_REAL_SDK) {
      return RealAdapter.createListing({ dataId, price, accessLevel, description });
    }
    const id = Math.floor(Math.random() * 1_000_000);
    const listing = {
      listingId: id,
      dataId,
      owner: this.walletAddress || 'ST1MOCKOWNER',
      price: price || 1000000,
      accessLevel: accessLevel || 3,
      description: description || 'Genetic data listing',
      active: true,
      createdAt: Date.now(),
    };
    this._listings.unshift(listing);
    return listing;
  }

  async listMarketplace({ ownerOnly = false } = {}) {
    if (APP_CONFIG.USE_REAL_SDK) {
      return RealAdapter.listMarketplace({ ownerOnly });
    }
    if (ownerOnly) {
      return this._listings.filter(l => l.owner === (this.walletAddress || 'ST1MOCKOWNER'));
    }
    return this._listings;
  }

  async purchaseListing({ listingId, desiredAccessLevel = 1 }) {
    if (APP_CONFIG.USE_REAL_SDK) {
      return RealAdapter.purchaseListing({ listingId, desiredAccessLevel });
    }
    const l = this._listings.find(x => x.listingId === listingId);
    if (!l) throw new Error('Listing not found');
    if (!l.active) throw new Error('Listing not active');
    if (desiredAccessLevel > l.accessLevel) throw new Error('Access level not available');

    // Simulate success
    return {
      success: true,
      listingId,
      accessLevel: desiredAccessLevel,
      txId: `0x${'b'.repeat(64)}`,
      purchasedAt: Date.now(),
    };
  }

  async getStatus() {
    return {
      initialized: this.initialized,
      walletAddress: this.walletAddress,
      datasets: this._datasets.length,
      listings: this._listings.length,
      time: Date.now(),
    };
  }
}

export const contractService = new ContractService();
