// Orchestration layer for genetic data storage and retrieval
// Combines IPFS storage with encryption for complete data management

import { IPFSClient } from './ipfs-client.js';
import { EncryptionManager } from './encryption.js';
import { ProofUtils } from '../zk-proofs/utils/proof-utils.js';

/**
 * Storage manager for genetic data
 * Provides high-level interface for encrypted storage and retrieval
 */
export class StorageManager {
    constructor(options = {}) {
        this.config = {
            ipfsConfig: options.ipfs || {},
            encryptionConfig: options.encryption || {},
            defaultAccessLevel: options.defaultAccessLevel || 1,
            autoPin: options.autoPin !== false,
            compressionEnabled: options.compressionEnabled !== false,
            ...options
        };

        // Initialize components
        this.ipfsClient = new IPFSClient(this.config.ipfsConfig);
        this.encryptionManager = new EncryptionManager(this.config.encryptionConfig);

        // Track stored datasets
        this.storedDatasets = new Map();
    }

    /**
     * Store genetic data with encryption and IPFS storage
     * @param {Object} geneticData - Raw genetic data
     * @param {string} password - Encryption password
     * @param {Object} options - Storage options
     * @returns {Promise<Object>} Storage result with URLs and access information
     */
    async storeGeneticData(geneticData, password, options = {}) {
        try {
            // Validate genetic data
            const validation = ProofUtils.validateGeneticData(geneticData);
            if (!validation.valid) {
                throw new Error(`Invalid genetic data: ${validation.errors.join(', ')}`);
            }

            // Generate dataset ID
            const datasetId = options.datasetId || ProofUtils.generateDataId(geneticData, options.ownerAddress || 'anonymous');

            // Prepare access configuration
            const accessConfig = {
                customTiers: options.customTiers,
                accessLevels: options.accessLevels || [1, 2, 3]
            };

            // Encrypt the data
            console.log('Encrypting genetic data...');
            const encryptedPackage = await this.encryptionManager.encryptGeneticData(
                geneticData, 
                password, 
                accessConfig
            );

            // Prepare metadata
            const metadata = {
                datasetId,
                ownerAddress: options.ownerAddress,
                createdAt: Date.now(),
                accessLevels: accessConfig.accessLevels,
                dataTypes: Object.keys(geneticData),
                encryptionVersion: '1.0.0',
                compressionUsed: this.config.compressionEnabled,
                totalSize: JSON.stringify(geneticData).length,
                checksum: encryptedPackage.checksum
            };

            // Compress if enabled
            let finalData = Buffer.from(JSON.stringify(encryptedPackage));
            if (this.config.compressionEnabled) {
                finalData = await this._compressData(finalData);
                metadata.compressed = true;
            }

            // Store on IPFS
            console.log('Uploading to IPFS...');
            const ipfsResult = await this.ipfsClient.uploadGeneticData(
                finalData,
                metadata,
                {
                    pin: this.config.autoPin,
                    onProgress: options.onProgress
                }
            );

            // Generate access URLs for different levels
            const accessUrls = {};
            for (const level of accessConfig.accessLevels) {
                accessUrls[level] = ipfsResult.storageUrl;
            }

            // Store dataset information
            const datasetInfo = {
                datasetId,
                ipfsHash: ipfsResult.ipfsHash,
                storageUrl: ipfsResult.storageUrl,
                accessUrls,
                metadata: ipfsResult.metadata,
                storedAt: Date.now(),
                encryptionInfo: {
                    accessLevels: accessConfig.accessLevels,
                    masterSalt: encryptedPackage.masterSalt
                }
            };

            this.storedDatasets.set(datasetId, datasetInfo);

            return {
                success: true,
                datasetId,
                storageUrl: ipfsResult.storageUrl,
                ipfsHash: ipfsResult.ipfsHash,
                accessUrls,
                size: ipfsResult.size,
                accessLevels: accessConfig.accessLevels,
                metadata: metadata,
                encryptedAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Storage failed: ${error.message}`);
        }
    }

    /**
     * Retrieve and decrypt genetic data
     * @param {string} storageUrl - IPFS storage URL or hash
     * @param {string} password - Decryption password
     * @param {number} accessLevel - Requested access level
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} Decrypted genetic data
     */
    async retrieveGeneticData(storageUrl, password, accessLevel = 1, options = {}) {
        try {
            console.log(`Retrieving genetic data from ${storageUrl} with access level ${accessLevel}...`);

            // Retrieve from IPFS
            const ipfsResult = await this.ipfsClient.retrieveGeneticData(storageUrl);
            
            let encryptedPackage;
            if (ipfsResult.metadata && ipfsResult.metadata.compressed) {
                // Decompress data
                const decompressedData = await this._decompressData(ipfsResult.data);
                encryptedPackage = JSON.parse(decompressedData.toString());
            } else {
                encryptedPackage = JSON.parse(ipfsResult.data.toString());
            }

            // Decrypt data
            console.log('Decrypting genetic data...');
            const decryptedResult = await this.encryptionManager.decryptGeneticData(
                encryptedPackage,
                password,
                accessLevel
            );

            // Verify data integrity if checksum is available
            if (ipfsResult.metadata && ipfsResult.metadata.checksum) {
                const isIntact = this.encryptionManager.verifyIntegrity(
                    decryptedResult.data,
                    ipfsResult.metadata.checksum
                );
                
                if (!isIntact && options.strictIntegrity !== false) {
                    throw new Error('Data integrity check failed');
                }
                
                decryptedResult.integrityVerified = isIntact;
            }

            return {
                success: true,
                data: decryptedResult.data,
                accessLevel: decryptedResult.accessLevel,
                metadata: {
                    ...decryptedResult.metadata,
                    ipfsMetadata: ipfsResult.metadata,
                    retrievedFrom: storageUrl,
                    retrievedAt: Date.now()
                }
            };
        } catch (error) {
            throw new Error(`Retrieval failed: ${error.message}`);
        }
    }

    /**
     * Generate time-limited access token for external parties
     * @param {string} datasetId - Dataset identifier
     * @param {string} password - Master password
     * @param {number} accessLevel - Access level to grant
     * @param {Object} options - Token options
     * @returns {Promise<Object>} Access token package
     */
    async generateAccessToken(datasetId, password, accessLevel, options = {}) {
        try {
            const datasetInfo = this.storedDatasets.get(datasetId);
            if (!datasetInfo) {
                throw new Error(`Dataset not found: ${datasetId}`);
            }

            // Retrieve encrypted package
            const ipfsResult = await this.ipfsClient.retrieveGeneticData(datasetInfo.storageUrl);
            let encryptedPackage;
            
            if (ipfsResult.metadata && ipfsResult.metadata.compressed) {
                const decompressedData = await this._decompressData(ipfsResult.data);
                encryptedPackage = JSON.parse(decompressedData.toString());
            } else {
                encryptedPackage = JSON.parse(ipfsResult.data.toString());
            }

            // Generate access key
            const accessToken = await this.encryptionManager.generateAccessKey(
                encryptedPackage,
                password,
                accessLevel,
                options.recipientPublicKey
            );

            return {
                success: true,
                datasetId,
                accessToken,
                storageUrl: datasetInfo.storageUrl,
                validUntil: accessToken.validUntil,
                accessLevel
            };
        } catch (error) {
            throw new Error(`Access token generation failed: ${error.message}`);
        }
    }

    /**
     * List stored datasets
     * @param {Object} filters - Optional filters
     * @returns {Array} List of stored datasets
     */
    listStoredDatasets(filters = {}) {
        const datasets = Array.from(this.storedDatasets.values());
        
        let filtered = datasets;
        
        if (filters.ownerAddress) {
            filtered = filtered.filter(d => d.metadata.ownerAddress === filters.ownerAddress);
        }
        
        if (filters.accessLevel) {
            filtered = filtered.filter(d => 
                d.encryptionInfo.accessLevels.includes(filters.accessLevel)
            );
        }
        
        if (filters.dataTypes) {
            filtered = filtered.filter(d => 
                filters.dataTypes.every(type => d.metadata.dataTypes.includes(type))
            );
        }

        if (filters.createdAfter) {
            filtered = filtered.filter(d => d.storedAt > filters.createdAfter);
        }

        return filtered.map(dataset => ({
            datasetId: dataset.datasetId,
            storageUrl: dataset.storageUrl,
            accessLevels: dataset.encryptionInfo.accessLevels,
            dataTypes: dataset.metadata.dataTypes,
            storedAt: dataset.storedAt,
            size: dataset.metadata.totalSize
        }));
    }

    /**
     * Delete stored dataset
     * @param {string} datasetId - Dataset to delete
     * @param {boolean} unpinFromIPFS - Whether to unpin from IPFS
     * @returns {Promise<boolean>} Success status
     */
    async deleteDataset(datasetId, unpinFromIPFS = true) {
        try {
            const datasetInfo = this.storedDatasets.get(datasetId);
            if (!datasetInfo) {
                throw new Error(`Dataset not found: ${datasetId}`);
            }

            // Unpin from IPFS if requested
            if (unpinFromIPFS) {
                await this.ipfsClient.unpinContent(datasetInfo.ipfsHash);
            }

            // Remove from local tracking
            this.storedDatasets.delete(datasetId);

            return true;
        } catch (error) {
            throw new Error(`Dataset deletion failed: ${error.message}`);
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStorageStats() {
        try {
            const ipfsStats = await this.ipfsClient.getStorageStats();
            const localDatasets = this.storedDatasets.size;

            return {
                ipfsStats,
                localDatasets,
                totalDatasets: localDatasets,
                datasetsById: Array.from(this.storedDatasets.keys())
            };
        } catch (error) {
            throw new Error(`Failed to get storage stats: ${error.message}`);
        }
    }

    /**
     * Verify dataset integrity
     * @param {string} datasetId - Dataset to verify
     * @param {string} password - Decryption password
     * @returns {Promise<Object>} Integrity check results
     */
    async verifyDatasetIntegrity(datasetId, password) {
        try {
            const datasetInfo = this.storedDatasets.get(datasetId);
            if (!datasetInfo) {
                throw new Error(`Dataset not found: ${datasetId}`);
            }

            const results = {};

            // Check each access level
            for (const accessLevel of datasetInfo.encryptionInfo.accessLevels) {
                try {
                    const retrieved = await this.retrieveGeneticData(
                        datasetInfo.storageUrl,
                        password,
                        accessLevel,
                        { strictIntegrity: false }
                    );

                    results[accessLevel] = {
                        accessible: true,
                        integrityVerified: retrieved.integrityVerified !== false,
                        error: null
                    };
                } catch (error) {
                    results[accessLevel] = {
                        accessible: false,
                        integrityVerified: false,
                        error: error.message
                    };
                }
            }

            return {
                datasetId,
                overallIntegrity: Object.values(results).every(r => r.accessible && r.integrityVerified),
                accessLevelResults: results,
                checkedAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Integrity verification failed: ${error.message}`);
        }
    }

    /**
     * Compress data for storage efficiency
     * @private
     */
    async _compressData(data) {
        // In a real implementation, this would use a compression library like zlib
        // For now, we'll return the data as-is
        return data;
    }

    /**
     * Decompress data
     * @private
     */
    async _decompressData(data) {
        // In a real implementation, this would decompress using zlib
        // For now, we'll return the data as-is
        return data;
    }

    /**
     * Test storage system connectivity
     * @returns {Promise<Object>} Connectivity test results
     */
    async testConnectivity() {
        try {
            const ipfsConnected = await this.ipfsClient.testConnection();
            
            return {
                ipfs: ipfsConnected,
                overall: ipfsConnected,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                ipfs: false,
                overall: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Export dataset information for backup
     * @param {string} datasetId - Dataset to export
     * @returns {Object} Exportable dataset information
     */
    exportDatasetInfo(datasetId) {
        const datasetInfo = this.storedDatasets.get(datasetId);
        if (!datasetInfo) {
            throw new Error(`Dataset not found: ${datasetId}`);
        }

        return {
            datasetId: datasetInfo.datasetId,
            ipfsHash: datasetInfo.ipfsHash,
            storageUrl: datasetInfo.storageUrl,
            accessLevels: datasetInfo.encryptionInfo.accessLevels,
            metadata: {
                ...datasetInfo.metadata,
                // Exclude sensitive information
                masterSalt: undefined
            },
            exportedAt: Date.now()
        };
    }

    /**
     * Import dataset information from backup
     * @param {Object} datasetInfo - Exported dataset information
     */
    importDatasetInfo(datasetInfo) {
        if (!datasetInfo.datasetId || !datasetInfo.storageUrl) {
            throw new Error('Invalid dataset information for import');
        }

        this.storedDatasets.set(datasetInfo.datasetId, {
            ...datasetInfo,
            importedAt: Date.now()
        });
    }

    /**
     * Cleanup storage resources
     * @param {Object} options - Cleanup options
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanup(options = {}) {
        try {
            let unpinnedCount = 0;

            if (options.unpinUnusedContent) {
                const excludeHashes = Array.from(this.storedDatasets.values())
                    .map(dataset => dataset.ipfsHash);
                unpinnedCount = await this.ipfsClient.cleanupPinnedContent(excludeHashes);
            }

            if (options.clearLocalCache) {
                this.storedDatasets.clear();
            }

            return {
                success: true,
                unpinnedCount,
                localCacheCleared: options.clearLocalCache || false,
                cleanupAt: Date.now()
            };
        } catch (error) {
            throw new Error(`Cleanup failed: ${error.message}`);
        }
    }

    /**
     * Close storage manager and cleanup resources
     */
    async close() {
        try {
            await this.ipfsClient.close();
            this.storedDatasets.clear();
        } catch (error) {
            console.warn('Error closing storage manager:', error.message);
        }
    }
}
