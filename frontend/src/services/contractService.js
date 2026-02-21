// Frontend contract service
// Uses the browser-compatible GeneTrust SDK for real contract calls

import { walletService } from './walletService.js';
import { geneTrust } from '../sdk/browserGeneTrust.js';
import { APP_CONFIG } from '../config/app.js';
import { 
  AppError, 
  parseContractErrorResponse, 
  createContractError,
  handleError as handleAppError 
} from '../utils/errorHandler.js';

export class ContractService {
  constructor() {
    this.initialized = false;
    this.walletAddress = null;
    this.useRealSDK = APP_CONFIG.USE_REAL_SDK;
    this.sdk = geneTrust;

    // Mock in-memory state (used when USE_REAL_SDK is false)
    this._datasets = [];
    this._listings = [];
    this._seeded = false;
  }

  async initialize({ walletAddress } = {}) {
    this.walletAddress = walletAddress || walletService.getAddress() || null;

    // Initialize the real SDK
    await this.sdk.initialize({
      stacksNode: APP_CONFIG.STACKS_NODE,
      contracts: APP_CONFIG.contracts,
      userAddress: this.walletAddress,
    });

    this.initialized = true;

    // Seed demo data in mock mode
    if (!this.useRealSDK && !this._seeded) {
      this.seedDemoData();
    }

    return {
      initialized: true,
      mode: this.useRealSDK ? 'real' : 'mock',
      network: APP_CONFIG.NETWORK,
      contracts: APP_CONFIG.contracts
    };
  }

  // Wrap SDK calls with error handling
  async _withErrorHandling(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      // Extract error code if it's from contract
      if (error?.errorCode !== undefined) {
        throw parseContractErrorResponse(error);
      }
      
      if (typeof error === 'number') {
        throw createContractError(error, 'Contract operation failed', context);
      }
      
      throw new AppError('CONTRACT_CALL_FAILED', error, context);
    }
  }

  // Create a vault dataset and register on-chain
  async createVaultDataset({ sampleData, description = '' }) {
    const id = Math.floor(Math.random() * 1_000_000);
    const now = Date.now();

    // Simulate storage result
    const storageUrl = `ipfs://mock-${id}/genetic-data-${id}.enc`;

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
      storageUrl,
    };

    // If using real SDK, register on-chain
    if (this.useRealSDK) {
      return this._withErrorHandling(
        async () => {
          const result = await this.sdk.registerDataset({
            dataId: id,
            price: 0,
            accessLevel: 3,
            metadataHash: new Uint8Array(32),
            storageUrl,
            description: description || 'Private genomic dataset',
          });

          console.log('Dataset registered on-chain:', result);
          return result;
        },
        { datasetId: id, operation: 'registerDataset' }
      );
    } else {
      // Mock mode
      this._datasets.unshift(dataset);
      return dataset;
    }
  }

  async listMyDatasets() {
    if (this.useRealSDK) {
      return await this.sdk.listMyDatasets();
    }
    return this._datasets.filter(d => d.owner === (this.walletAddress || 'ST1MOCKOWNER'));
  }

  async createListing({ dataId, price, accessLevel, description }) {
    if (this.useRealSDK) {
      try {
        const result = await this.sdk.createMarketplaceListing({
          dataId: Number(dataId),
          price: Number(price || 1000000),
          accessLevel: Number(accessLevel || 3),
          description: description || 'Genetic data listing',
          metadataHash: new Uint8Array(32), // Mock hash
          requiresVerification: false, // Set to true if proofs are available
        });
        console.log('Listing created on-chain:', result);
        return {
          listingId: result.listingId,
          dataId,
          owner: this.walletAddress,
          price: price || 1000000,
          accessLevel: accessLevel || 3,
          description,
          active: true,
          createdAt: Date.now(),
          txId: result.txId,
        };
      } catch (error) {
        console.error('Failed to create listing on-chain:', error);
        throw error;
      }
    } else {
      // Mock mode
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
  }

  async listMarketplace({ ownerOnly = false } = {}) {
    if (this.useRealSDK) {
      return await this.sdk.listMarketplaceListings({ ownerOnly });
    }

    if (ownerOnly) {
      return this._listings.filter(l => l.owner === (this.walletAddress || 'ST1MOCKOWNER'));
    }
    return this._listings;
  }

  async purchaseListing({ listingId, desiredAccessLevel = 1 }) {
    if (this.useRealSDK) {
      try {
        const result = await this.sdk.purchaseGeneticData({
          listingId: Number(listingId),
          accessLevel: Number(desiredAccessLevel),
        });
        console.log('Purchase completed on-chain:', result);
        return result;
      } catch (error) {
        console.error('Failed to purchase listing:', error);
        throw error;
      }
    } else {
      // Mock mode
      const l = this._listings.find(x => x.listingId === listingId);
      if (!l) throw new Error('Listing not found');
      if (!l.active) throw new Error('Listing not active');
      if (desiredAccessLevel > l.accessLevel) throw new Error('Access level not available');

      return {
        success: true,
        listingId,
        accessLevel: desiredAccessLevel,
        txId: `0x${'b'.repeat(64)}`,
        purchasedAt: Date.now(),
      };
    }
  }

  async getStatus() {
    if (this.useRealSDK) {
      return this.sdk.getStatus();
    }

    return {
      initialized: this.initialized,
      walletAddress: this.walletAddress,
      datasets: this._datasets.length,
      listings: this._listings.length,
      time: Date.now(),
      mode: 'mock',
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
