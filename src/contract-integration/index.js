// Contract integration factory and client exports for GeneTrust SDK
// Minimal implementations that forward to provided stacksApi adapter

export class GeneticDataClient {
  constructor(contractAddress, contractName, stacksApi) {
    this.address = contractAddress;
    this.name = contractName;
    this.api = stacksApi;
  }
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
