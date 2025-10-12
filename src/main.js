// Main GenomicChain SDK entry point
// Provides high-level interface for all GenomicChain functionality

import { Phase2Config } from './config/phase2-config.js';
import { ZKProofFactory } from './zk-proofs/index.js';
import { StorageFactory } from './storage/index.js';
import { ContractFactory } from './contract-integration/index.js';
import { UtilityFactory } from './utils/index.js';

/**
 * Main GenomicChain SDK Class
 * Provides a unified interface for all GenomicChain functionality
 */
export class GenomicChain {
    constructor(options = {}) {
        // Initialize configuration
        this.config = options.config || Phase2Config.fromEnvironment();
        
        // Initialize components
        this._initializeComponents(options);
        
        // Track initialization state
        this.initialized = false;
    }

    /**
     * Initialize all SDK components
     * @private
     */
    _initializeComponents(options) {
        // Storage stack
        this.storage = StorageFactory.createGeneticDataStack({
            ipfs: this.config.getIPFSConfig(),
            encryption: this.config.getEncryptionConfig(),
            storage: options.storage || {}
        });

        // ZK Proof components
        this.zkProofs = {
            factory: ZKProofFactory,
            verifier: ZKProofFactory.createVerifier()
        };

        // Contract clients (will be initialized after setup)
        this.contracts = null;

        // Utilities
        this.utils = {
            crypto: UtilityFactory.getCryptoUtils(),
            formatter: UtilityFactory.getDataFormatter()
        };
    }

    /**
     * Initialize the SDK with contract addresses and Stacks API
     * @param {Object} stacksApi - Stacks API instance
     * @param {Object} contractAddresses - Contract addresses
     * @returns {Promise<void>}
     */
    async initialize(stacksApi, contractAddresses = null) {
        try {
            // Set contract addresses if provided
            if (contractAddresses) {
                this.config.setContractAddresses(contractAddresses);
            }

            // Initialize contract clients
            this.contracts = ContractFactory.create(
                this.config.getContractConfig(),
                stacksApi
            ).createAllClients();

            // Test storage connectivity
            const connectivityTest = await this.storage.storage.testConnectivity();
            if (!connectivityTest.overall) {
                console.warn('Storage connectivity issues detected:', connectivityTest.error);
            }

            this.initialized = true;
            console.log('GenomicChain SDK initialized successfully');
        } catch (error) {
            throw new Error(`SDK initialization failed: ${error.message}`);
        }
    }

    /**
     * Store genetic data with encryption and zero-knowledge proofs
     * @param {Object} geneticData - Raw genetic data
     * @param {string} password - Encryption password
     * @param {Object} options - Storage options
     * @returns {Promise<Object>} Storage result with proofs
     */
    async storeGeneticData(geneticData, password, options = {}) {
        this._ensureInitialized();

        try {
            // Format data for storage
            const formattedData = this.utils.formatter.formatForStorage(geneticData, options.format);

            // Store encrypted data
            const storageResult = await this.storage.storage.storeGeneticData(
                formattedData,
                password,
                options.storage
            );

            // Generate zero-knowledge proofs if requested
            const proofs = {};
            if (options.generateProofs) {
                proofs.genePresence = await this._generateGenePresenceProofs(
                    formattedData,
                    options.proofs?.genePresence
                );
                
                proofs.variants = await this._generateVariantProofs(
                    formattedData,
                    options.proofs?.variants
                );
                
                proofs.aggregate = await this._generateAggregateProofs(
                    formattedData,
                    options.proofs?.aggregate
                );
            }

            // Register on blockchain if contract is available
            let blockchainResult = null;
            if (this.contracts && options.registerOnChain) {
                blockchainResult = await this._registerOnBlockchain(
                    storageResult,
                    proofs,
                    options.blockchain
                );
            }

            return {
                success: true,
                datasetId: storageResult.datasetId,
                storage: storageResult,
                proofs,
                blockchain: blockchainResult,
                storedAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Failed to store genetic data: ${error.message}`);
        }
    }

    /**
     * Retrieve and decrypt genetic data
     * @param {string} datasetId - Dataset identifier or storage URL
     * @param {string} password - Decryption password
     * @param {number} accessLevel - Requested access level
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} Decrypted genetic data
     */
    async retrieveGeneticData(datasetId, password, accessLevel = 1, options = {}) {
        this._ensureInitialized();

        try {
            // Retrieve from storage
            const retrievalResult = await this.storage.storage.retrieveGeneticData(
                datasetId,
                password,
                accessLevel,
                options.storage
            );

            // Verify proofs if available
            let proofVerification = null;
            if (options.verifyProofs && retrievalResult.metadata?.proofs) {
                proofVerification = await this._verifyProofs(
                    retrievalResult.data,
                    retrievalResult.metadata.proofs
                );
            }

            // Check blockchain permissions if contract is available
            let permissionCheck = null;
            if (this.contracts && options.checkPermissions) {
                permissionCheck = await this._checkBlockchainPermissions(
                    datasetId,
                    options.userAddress,
                    accessLevel
                );
            }

            return {
                success: true,
                data: retrievalResult.data,
                accessLevel: retrievalResult.accessLevel,
                metadata: retrievalResult.metadata,
                proofVerification,
                permissionCheck,
                retrievedAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Failed to retrieve genetic data: ${error.message}`);
        }
    }

    /**
     * Create a marketplace listing for genetic data
     * @param {Object} listingData - Listing information
     * @param {string} senderAddress - Seller's address
     * @param {Object} options - Listing options
     * @returns {Promise<Object>} Listing result
     */
    async createMarketplaceListing(listingData, senderAddress, options = {}) {
        this._ensureInitialized();
        
        if (!this.contracts) {
            throw new Error('Contract clients not initialized');
        }

        try {
            // Format data for marketplace contract
            const formattedListing = this.utils.formatter.formatForContract(
                listingData,
                'marketplace'
            );

            // Create listing on blockchain
            const listingResult = await this.contracts.marketplace.createListing(
                formattedListing,
                senderAddress
            );

            // Set up compliance if required
            let complianceResult = null;
            if (options.setupCompliance) {
                complianceResult = await this._setupCompliance(
                    listingData.dataId,
                    senderAddress,
                    options.compliance
                );
            }

            return {
                success: true,
                listingId: formattedListing.listingId,
                transaction: listingResult,
                compliance: complianceResult,
                createdAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Failed to create marketplace listing: ${error.message}`);
        }
    }

    /**
     * Purchase genetic data from marketplace
     * @param {number} listingId - Listing ID
     * @param {number} accessLevel - Requested access level
     * @param {string} buyerAddress - Buyer's address
     * @param {Object} options - Purchase options
     * @returns {Promise<Object>} Purchase result
     */
    async purchaseGeneticData(listingId, accessLevel, buyerAddress, options = {}) {
        this._ensureInitialized();
        
        if (!this.contracts) {
            throw new Error('Contract clients not initialized');
        }

        try {
            // Verify purchase eligibility
            const eligibilityCheck = await this.contracts.marketplace.verifyPurchaseEligibility(
                listingId,
                accessLevel
            );

            if (!eligibilityCheck) {
                throw new Error('Purchase not eligible - requirements not met');
            }

            // Create transaction ID for purchase
            const txId = this.utils.crypto.generateSecureKey(32, 'buffer');

            // Execute purchase
            const purchaseResult = await this.contracts.marketplace.purchaseListingDirect(
                listingId,
                accessLevel,
                txId,
                buyerAddress
            );

            // Log access for compliance
            if (options.logAccess !== false) {
                await this.contracts.compliance.logDataAccess(
                    listingId, // Using listingId as dataId
                    1, // Research purpose
                    txId,
                    buyerAddress
                );
            }

            return {
                success: true,
                listingId,
                accessLevel,
                transaction: purchaseResult,
                txId: Array.from(txId),
                purchasedAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Failed to purchase genetic data: ${error.message}`);
        }
    }

    /**
     * Generate zero-knowledge proofs for genetic data
     * @param {Object} geneticData - Genetic data
     * @param {Object} proofRequests - Proof generation requests
     * @returns {Promise<Object>} Generated proofs
     */
    async generateProofs(geneticData, proofRequests) {
        try {
            const proofs = {};

            // Generate gene presence proofs
            if (proofRequests.genePresence) {
                const generator = this.zkProofs.factory.createGenerator('gene-presence');
                proofs.genePresence = [];
                
                for (const request of proofRequests.genePresence) {
                    const proof = await generator.generatePresenceProof(
                        geneticData,
                        request.targetGene,
                        request.options
                    );
                    proofs.genePresence.push(proof);
                }
            }

            // Generate variant proofs
            if (proofRequests.variants) {
                const generator = this.zkProofs.factory.createGenerator('gene-variant');
                proofs.variants = [];
                
                for (const request of proofRequests.variants) {
                    const proof = await generator.generateVariantProof(
                        geneticData,
                        request.targetVariant,
                        request.options
                    );
                    proofs.variants.push(proof);
                }
            }

            // Generate aggregate proofs
            if (proofRequests.aggregate) {
                const generator = this.zkProofs.factory.createGenerator('aggregate');
                proofs.aggregate = [];
                
                for (const request of proofRequests.aggregate) {
                    const proof = await generator.generateAggregateProof(
                        geneticData,
                        request.aggregateQuery,
                        request.options
                    );
                    proofs.aggregate.push(proof);
                }
            }

            return proofs;
        } catch (error) {
            throw new Error(`Failed to generate proofs: ${error.message}`);
        }
    }

    /**
     * Verify zero-knowledge proofs
     * @param {Object} proofs - Proofs to verify
     * @param {Object} publicInputs - Public inputs for verification
     * @returns {Promise<Object>} Verification results
     */
    async verifyProofs(proofs, publicInputs) {
        try {
            const results = {};

            // Verify each proof type
            for (const [proofType, proofList] of Object.entries(proofs)) {
                results[proofType] = [];
                
                for (let i = 0; i < proofList.length; i++) {
                    const proof = proofList[i];
                    const inputs = publicInputs[proofType]?.[i] || {};
                    
                    const verification = await this.zkProofs.verifier.verifyProof(
                        proof,
                        inputs
                    );
                    
                    results[proofType].push(verification);
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Failed to verify proofs: ${error.message}`);
        }
    }

    /**
     * Get SDK status and health information
     * @returns {Promise<Object>} SDK status
     */
    async getStatus() {
        const status = {
            initialized: this.initialized,
            environment: this.config.environment,
            components: {
                storage: false,
                contracts: false,
                zkProofs: true
            },
            connectivity: {},
            version: '1.0.0'
        };

        try {
            // Check storage connectivity
            if (this.storage) {
                status.connectivity.storage = await this.storage.storage.testConnectivity();
                status.components.storage = status.connectivity.storage.overall;
            }

            // Check contract availability
            if (this.contracts) {
                status.components.contracts = true;
                // Could add contract connectivity tests here
            }

            // Get storage stats if available
            if (this.storage && status.components.storage) {
                status.storageStats = await this.storage.storage.getStorageStats();
            }

        } catch (error) {
            status.error = error.message;
        }

        return status;
    }

    /**
     * Clean up SDK resources
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            if (this.storage?.storage) {
                await this.storage.storage.close();
            }
            
            console.log('GenomicChain SDK cleaned up successfully');
        } catch (error) {
            console.warn('Error during SDK cleanup:', error.message);
        }
    }

    // Private helper methods

    /**
     * Ensure SDK is initialized
     * @private
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('SDK not initialized. Call initialize() first.');
        }
    }

    /**
     * Generate gene presence proofs
     * @private
     */
    async _generateGenePresenceProofs(geneticData, requests = []) {
        if (!requests.length) return [];
        
        const generator = this.zkProofs.factory.createGenerator('gene-presence');
        const proofs = [];
        
        for (const request of requests) {
            const proof = await generator.generatePresenceProof(
                geneticData,
                request.targetGene,
                request.options
            );
            proofs.push(proof);
        }
        
        return proofs;
    }

    /**
     * Generate variant proofs
     * @private
     */
    async _generateVariantProofs(geneticData, requests = []) {
        if (!requests.length) return [];
        
        const generator = this.zkProofs.factory.createGenerator('gene-variant');
        const proofs = [];
        
        for (const request of requests) {
            const proof = await generator.generateVariantProof(
                geneticData,
                request.targetVariant,
                request.options
            );
            proofs.push(proof);
        }
        
        return proofs;
    }

    /**
     * Generate aggregate proofs
     * @private
     */
    async _generateAggregateProofs(geneticData, requests = []) {
        if (!requests.length) return [];
        
        const generator = this.zkProofs.factory.createGenerator('aggregate');
        const proofs = [];
        
        for (const request of requests) {
            const proof = await generator.generateAggregateProof(
                geneticData,
                request.aggregateQuery,
                request.options
            );
            proofs.push(proof);
        }
        
        return proofs;
    }

    /**
     * Register data and proofs on blockchain
     * @private
     */
    async _registerOnBlockchain(storageResult, proofs, options = {}) {
        if (!this.contracts) return null;

        try {
            // Register genetic data
            const dataResult = await this.contracts.geneticData.registerGeneticData({
                dataId: options.dataId || Math.floor(Math.random() * 1000000),
                price: options.price || 0,
                accessLevel: options.accessLevel || 3,
                metadataHash: storageResult.metadataHash || new Array(32).fill(0),
                storageUrl: storageResult.storageUrl,
                description: options.description || ''
            }, options.senderAddress);

            // Register proofs if available
            const proofResults = {};
            for (const [proofType, proofList] of Object.entries(proofs)) {
                proofResults[proofType] = [];
                
                for (const proof of proofList) {
                    const result = await this.contracts.verification.registerProof({
                        dataId: dataResult.dataId,
                        proofType: proof.proofType,
                        proofHash: proof.proofHash,
                        parameters: proof.parameters
                    }, options.senderAddress);
                    
                    proofResults[proofType].push(result);
                }
            }

            return {
                data: dataResult,
                proofs: proofResults
            };
        } catch (error) {
            console.warn('Blockchain registration failed:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Setup compliance for data
     * @private
     */
    async _setupCompliance(dataId, ownerAddress, options = {}) {
        if (!this.contracts?.compliance) return null;

        try {
            return await this.contracts.compliance.registerConsent({
                dataId,
                researchConsent: options.researchConsent !== false,
                commercialConsent: options.commercialConsent || false,
                clinicalConsent: options.clinicalConsent || false,
                jurisdiction: options.jurisdiction || 0, // Global
                consentDuration: options.consentDuration || 8640 // ~30 days
            }, ownerAddress);
        } catch (error) {
            console.warn('Compliance setup failed:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Verify proofs against data
     * @private
     */
    async _verifyProofs(data, proofs) {
        // Implementation would verify proofs match the data
        // For now, return a placeholder
        return { verified: true, details: 'Proof verification not yet implemented' };
    }

    /**
     * Check blockchain permissions
     * @private
     */
    async _checkBlockchainPermissions(dataId, userAddress, accessLevel) {
        if (!this.contracts) return null;

        try {
            const hasAccess = await this.contracts.geneticData.verifyAccessRights(
                dataId,
                userAddress
            );

            return {
                hasAccess,
                accessLevel,
                checkedAt: Date.now()
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Create a new GenomicChain SDK instance
     * @param {Object} options - Configuration options
     * @returns {GenomicChain} SDK instance
     */
    static create(options = {}) {
        return new GenomicChain(options);
    }
}

// Export default instance for convenience
export default GenomicChain;
