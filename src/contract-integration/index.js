// Main export file for contract integration components
// Provides unified interface for all blockchain contract interactions

export { DatasetRegistryClient } from './genetic-data-client.js';
export { AttestationsClient } from './verification-client.js';
export { ExchangeClient } from './marketplace-client.js';
export { DataGovernanceClient } from './compliance-client.js';

/**
 * Contract Factory - Unified interface for creating contract clients
 */
export class ContractFactory {
    constructor(contractAddresses, stacksApi) {
        this.contractAddresses = contractAddresses || {};
        this.stacksApi = stacksApi;
    }

    _addr(primaryKey, legacyKey) {
        return this.contractAddresses[primaryKey] || this.contractAddresses[legacyKey];
    }

    /**
     * Create a dataset registry contract client
     * @returns {DatasetRegistryClient} Dataset registry client instance
     */
    createDatasetRegistryClient() {
        const cfg = this._addr('datasetRegistry', 'geneticData');
        return new DatasetRegistryClient(cfg.address, cfg.name, this.stacksApi);
    }

    /**
     * Create an attestations contract client
     * @returns {AttestationsClient} Attestations client instance
     */
    createAttestationsClient() {
        const cfg = this._addr('attestations', 'verification');
        return new AttestationsClient(cfg.address, cfg.name, this.stacksApi);
    }

    /**
     * Create an exchange contract client
     * @returns {ExchangeClient} Exchange client instance
     */
    createExchangeClient() {
        const cfg = this._addr('exchange', 'marketplace');
        return new ExchangeClient(cfg.address, cfg.name, this.stacksApi);
    }

    /**
     * Create a data governance contract client
     * @returns {DataGovernanceClient} Data governance client instance
     */
    createDataGovernanceClient() {
        const cfg = this._addr('dataGovernance', 'compliance');
        return new DataGovernanceClient(cfg.address, cfg.name, this.stacksApi);
    }

    /**
     * Create all contract clients
     * @returns {Object} All contract clients
     */
    createAllClients() {
        const datasetRegistry = this.createDatasetRegistryClient();
        const attestations = this.createAttestationsClient();
        const exchange = this.createExchangeClient();
        const dataGovernance = this.createDataGovernanceClient();

        // Provide both new and legacy keys for compatibility
        return {
            datasetRegistry,
            attestations,
            exchange,
            dataGovernance,
            // Legacy aliases
            geneticData: datasetRegistry,
            verification: attestations,
            marketplace: exchange,
            compliance: dataGovernance
        };
    }

    /**
     * Static factory method for creating contract factory
     * @param {Object} config - Contract configuration
     * @param {Object} stacksApi - Stacks API instance
     * @returns {ContractFactory} Contract factory instance
     */
    static create(config, stacksApi) {
        return new ContractFactory(config.addresses, stacksApi);
    }

    // Legacy method aliases (to preserve API while encouraging new names)
    createGeneticDataClient() { return this.createDatasetRegistryClient(); }
    createVerificationClient() { return this.createAttestationsClient(); }
    createMarketplaceClient() { return this.createExchangeClient(); }
    createComplianceClient() { return this.createDataGovernanceClient(); }
}
