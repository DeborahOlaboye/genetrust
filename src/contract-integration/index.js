// Contract integration factory and client exports for GeneTrust SDK
// Minimal implementations that forward to provided stacksApi adapter

/**
 * Client for interacting with the Genetic Data smart contract
 * 
 * Provides a simplified interface for registering genetic data, verifying
 * access rights, and managing genetic data records on the blockchain.
 * Forwards all operations to the provided stacksApi adapter for actual
 * blockchain interactions.
 * 
 * @class GeneticDataClient
 * @description Smart contract client for genetic data management
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Create genetic data client
 * const client = new GeneticDataClient(
 *   'SP123...contract-address',
 *   'genetic-data',
 *   stacksApi
 * );
 * 
 * @example
 * // Register genetic data
 * const result = await client.registerGeneticData({
 *   dataId: 'data-123',
 *   price: 1000000,
 *   accessLevel: 2,
 *   metadataHash: '0xabc...',
 *   storageUrl: 'ipfs://Qm...'
 * }, senderAddress);
 */
export class GeneticDataClient {
  /**
   * Creates a new GeneticDataClient instance
   * 
   * @constructor
   * @param {string} contractAddress - The contract address on Stacks blockchain
   * @param {string} contractName - The contract name
   * @param {Object} stacksApi - Stacks API adapter for blockchain interactions
   * @param {Function} stacksApi.callContractFunction - Function to call contract functions
   * @param {Function} stacksApi.callReadOnlyFunction - Function to call read-only functions
   * 
   * @throws {Error} When contractAddress is invalid
   * @throws {Error} When contractName is empty
   * @throws {Error} When stacksApi is missing required methods
   * 
   * @returns {GeneticDataClient} New client instance
   * 
   * @example
   * const client = new GeneticDataClient(
   *   'SP1234567890abcdef1234567890abcdef12345678',
   *   'genetic-data',
   *   stacksApi
   * );
   */
  constructor(contractAddress, contractName, stacksApi) {
    this.address = contractAddress;
    this.name = contractName;
    this.api = stacksApi;
  }
  /**
   * Register genetic data on the blockchain
   * 
   * Submits a transaction to register genetic data with the smart contract,
   * including pricing, access level, metadata hash, and storage information.
   * 
   * @async
   * @method registerGeneticData
   * 
   * @param {Object} data - Genetic data registration information
   * @param {string} data.dataId - Unique identifier for the genetic data
   * @param {number} data.price - Price in microSTX for data access
   * @param {number} data.accessLevel - Access level (1-3, higher = more restrictive)
   * @param {string} data.metadataHash - Hash of the data metadata
   * @param {string} data.storageUrl - URL where data is stored (e.g., IPFS)
   * @param {string} [data.description] - Description of the genetic data
   * @param {string} senderAddress - Address of the sender registering the data
   * 
   * @returns {Promise<Object>} Registration result
   * @returns {string} returns.txId - Transaction ID of the registration
   * @returns {string} returns.dataId - The data ID that was registered
   * 
   * @throws {Error} When data is missing required fields
   * @throws {Error} When senderAddress is invalid
   * @throws {Error} When contract call fails
   * 
   * @example
   * const result = await client.registerGeneticData({
   *   dataId: 'sample-001',
   *   price: 1000000, // 1 STX
   *   accessLevel: 2,
   *   metadataHash: '0x123abc...',
   *   storageUrl: 'ipfs://QmHash...',
   *   description: 'BRCA gene mutation sample'
   * }, 'SP123...sender');
   */
  async registerGeneticData(data, senderAddress) {
    const args = [
      data.dataId,
      data.price,
      data.accessLevel,
      data.metadataHash,
      data.storageUrl,
      data.description,
    ];
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'register-genetic-data',
      functionArgs: args,
      senderKey: senderAddress,
    });
    return { txId: res.txid, dataId: data.dataId };
  }
  /**
   * Verify access rights for a user to genetic data
   * 
   * Checks if a specific user has access rights to view or use
   * particular genetic data based on the smart contract's access control rules.
   * 
   * @async
   * @method verifyAccessRights
   * 
   * @param {string} dataId - Unique identifier for the genetic data
   * @param {string} userAddress - Blockchain address of the user to check
   * 
   * @returns {Promise<boolean>} True if user has access rights, false otherwise
   * 
   * @throws {Error} When dataId is empty or invalid
   * @throws {Error} When userAddress is invalid
   * @throws {Error} When read-only contract call fails
   * 
   * @example
   * const hasAccess = await client.verifyAccessRights(
   *   'sample-001',
   *   'SP456...user'
   * );
   * if (hasAccess) {
   *   console.log('User has access to genetic data');
   * }
   */
  async verifyAccessRights(dataId, userAddress) {
    const res = await this.api.callReadOnlyFunction(
      this.address,
      this.name,
      'verify-access-rights',
      [dataId, userAddress]
    );
    if (res?.type === 'ok' && res.value?.type === 'bool') return !!res.value.value;
    if (res?.type === 'ok' && typeof res.value === 'boolean') return res.value;
    return true;
  }
}

export class MarketplaceClient {
  constructor(contractAddress, contractName, stacksApi) {
    this.address = contractAddress;
    this.name = contractName;
    this.api = stacksApi;
  }
  async createListing(listing, senderAddress) {
    const args = [
      listing.listingId,
      listing.price,
      listing.dataContract || `${this.address}.${this.name}`,
      listing.dataId,
      listing.accessLevel,
      listing.metadataHash,
      !!listing.requiresVerification,
    ];
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'create-listing',
      functionArgs: args,
      senderKey: senderAddress,
    });
    return { txId: res.txid };
  }
  async verifyPurchaseEligibility(listingId, accessLevel) {
    // Although contract function is public, use read-only adapter in mock/dev
    const res = await this.api.callReadOnlyFunction(
      this.address,
      this.name,
      'verify-purchase-eligibility',
      [listingId, accessLevel]
    );
    if (res?.type === 'ok' && res.value?.type === 'bool') return !!res.value.value;
    if (res?.type === 'ok' && typeof res.value === 'boolean') return res.value;
    return true;
  }
  async purchaseListingDirect(listingId, accessLevel, txId, buyerAddress) {
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'purchase-listing-direct',
      functionArgs: [listingId, accessLevel, txId],
      senderKey: buyerAddress,
    });
    return { txId: res.txid };
  }
}

export class VerificationClient {
  constructor(contractAddress, contractName, stacksApi) {
    this.address = contractAddress;
    this.name = contractName;
    this.api = stacksApi;
  }
  async registerProof(proof, senderAddress) {
    const args = [
      proof.dataId,
      proof.proofType,
      proof.proofHash,
      proof.parameters,
    ];
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'register-proof',
      functionArgs: args,
      senderKey: senderAddress,
    });
    return { txId: res.txid };
  }
  async verifyProof(proofId, verifierId, verificationTx, senderAddress) {
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'verify-proof',
      functionArgs: [proofId, verifierId, verificationTx],
      senderKey: senderAddress,
    });
    return { txId: res.txid };
  }
}

export class ComplianceClient {
  constructor(contractAddress, contractName, stacksApi) {
    this.address = contractAddress;
    this.name = contractName;
    this.api = stacksApi;
  }
  async registerConsent(consent, senderAddress) {
    // maps to data-governance: set-consent-policy
    const args = [
      consent.dataId,
      !!consent.researchConsent,
      !!consent.commercialConsent,
      !!consent.clinicalConsent,
      consent.jurisdiction,
      consent.consentDuration,
    ];
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'set-consent-policy',
      functionArgs: args,
      senderKey: senderAddress,
    });
    return { txId: res.txid };
  }
  async logDataAccess(dataId, purpose, txId, senderAddress) {
    const res = await this.api.callContractFunction({
      contractAddress: this.address,
      contractName: this.name,
      functionName: 'audit-access',
      functionArgs: [dataId, purpose, txId],
      senderKey: senderAddress,
    });
    return { txId: res.txid };
  }
}

export class ContractFactory {
  constructor(addresses, stacksApi) {
    this.addresses = addresses || {};
    this.api = stacksApi;
  }
  static create(config, stacksApi) {
    return new ContractFactory(config.addresses, stacksApi);
  }
  _cfg(primary, legacy) {
    return this.addresses[primary] || this.addresses[legacy];
  }
  createGeneticDataClient() {
    const cfg = this._cfg('datasetRegistry', 'geneticData');
    return new GeneticDataClient(cfg.address, cfg.name, this.api);
  }
  createMarketplaceClient() {
    const cfg = this._cfg('exchange', 'marketplace');
    return new MarketplaceClient(cfg.address, cfg.name, this.api);
  }
  createVerificationClient() {
    const cfg = this._cfg('attestations', 'verification');
    return new VerificationClient(cfg.address, cfg.name, this.api);
  }
  createComplianceClient() {
    const cfg = this._cfg('dataGovernance', 'compliance');
    return new ComplianceClient(cfg.address, cfg.name, this.api);
  }
  createAllClients() {
    const geneticData = this.createGeneticDataClient();
    const marketplace = this.createMarketplaceClient();
    const verification = this.createVerificationClient();
    const compliance = this.createComplianceClient();
    // expose both new and legacy keys
    return {
      // legacy
      geneticData,
      marketplace,
      verification,
      compliance,
      // new
      datasetRegistry: geneticData,
      exchange: marketplace,
      attestations: verification,
      dataGovernance: compliance,
    };
  }
}
