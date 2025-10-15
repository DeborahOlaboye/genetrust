// Lightweight frontend contract service
// For now, this uses mock implementations compatible with the existing UI.
// Later, wire this to real Stacks contracts or a backend API.

// NOTE: Avoid importing Node-only SDK code here to keep Vite/browser happy.
// We simulate key actions and keep the API shape stable for future upgrades.
import { walletService } from './walletService.js';

export class ContractService {
  constructor() {
    this.initialized = false;
    this.walletAddress = null;

    // Mock in-memory state
    this._datasets = [];
    this._listings = [];
    this._seeded = false;
  }

  async initialize({ walletAddress } = {}) {
    this.walletAddress = walletAddress || walletService.getAddress() || null;
    this.initialized = true;
    // Seed demo data once in mock mode so marketplace isn't empty
    if (!this._seeded) {
      this.seedDemoData();
    }
    return { initialized: true, mode: 'mock' };
  }

  // Simulate creating a vault dataset and storing metadata
  async createVaultDataset({ sampleData, description = '' }) {
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
    return this._datasets.filter(d => d.owner === (this.walletAddress || 'ST1MOCKOWNER'));
  }

  async createListing({ dataId, price, accessLevel, description }) {
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
    if (ownerOnly) {
      return this._listings.filter(l => l.owner === (this.walletAddress || 'ST1MOCKOWNER'));
    }
    return this._listings;
  }

  async purchaseListing({ listingId, desiredAccessLevel = 1 }) {
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

  // Mock-mode demo utilities
  seedDemoData() {
    if (this._seeded) return;
    const owner = this.walletAddress || 'ST1MOCKOWNER';
    const now = Date.now();
    const ds1 = {
      id: 1001,
      owner,
      description: 'WGS sample A',
      accessLevels: [1, 2, 3],
      storedAt: now - 86_400_000,
      stats: { variants: 15234, genes: 18456 },
      storageUrl: 'ipfs://mock-1001/genetic-data-1001.enc',
    };
    const ds2 = {
      id: 1002,
      owner,
      description: 'Exome sample B',
      accessLevels: [1, 2],
      storedAt: now - 43_200_000,
      stats: { variants: 8234, genes: 12000 },
      storageUrl: 'ipfs://mock-1002/genetic-data-1002.enc',
    };
    // Only add if not present
    const ids = new Set(this._datasets.map(d => d.id));
    if (!ids.has(ds1.id)) this._datasets.push(ds1);
    if (!ids.has(ds2.id)) this._datasets.push(ds2);

    const l1 = { listingId: 5001, dataId: ds1.id, owner, price: 2_500_000, accessLevel: 3, description: 'Full access WGS', active: true, createdAt: now - 3_600_000 };
    const l2 = { listingId: 5002, dataId: ds2.id, owner, price: 900_000, accessLevel: 2, description: 'Exome detailed', active: true, createdAt: now - 7_200_000 };
    const lids = new Set(this._listings.map(l => l.listingId));
    if (!lids.has(l1.listingId)) this._listings.push(l1);
    if (!lids.has(l2.listingId)) this._listings.push(l2);

    this._seeded = true;
  }

  resetDemoData() {
    this._datasets = [];
    this._listings = [];
    this._seeded = false;
  }
}

export const contractService = new ContractService();
