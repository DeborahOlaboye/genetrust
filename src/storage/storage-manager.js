// Orchestration layer for genetic data storage and retrieval
// Combines IPFS storage with encryption for complete data management

import { IPFSClient } from './ipfs-client.js';
import { EncryptionManager } from './encryption.js';
import { ProofUtils } from '../zk-proofs/utils/proof-utils.js';
import { profiler } from '../utils/performance-profiler.js';

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
            cacheEnabled: options.cacheEnabled !== false,
            cacheSize: options.cacheSize || 100, // Cache up to 100 datasets
            batchSize: options.batchSize || 10, // Batch operations
            ...options
        };

        // Initialize components
        this.ipfsClient = new IPFSClient(this.config.ipfsConfig);
        this.encryptionManager = new EncryptionManager(this.config.encryptionConfig);

        // Track stored datasets
        this.storedDatasets = new Map();
        
        // Performance caching
        this.dataCache = new Map();
        this.metadataCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        
        // Batch operation queue
        this.batchQueue = [];
        this.batchTimer = null;
    }

    /**
     * Store genetic data with encryption and IPFS storage (optimized)
     * @param {Object} geneticData - Raw genetic data
     * @param {string} password - Encryption password
     * @param {Object} options - Storage options
     * @returns {Promise<Object>} Storage result with URLs and access information
     */
    async storeGeneticData(geneticData, password, options = {}) {
        const dataSize = JSON.stringify(geneticData).length;
        profiler.start('storeGeneticData', { dataSize, ownerAddress: options.ownerAddress });
        
        try {
            profiler.checkpoint('storeGeneticData', 'validating_data');
            // Validate genetic data
            const validation = ProofUtils.validateGeneticData(geneticData);
            if (!validation.valid) {
                throw new Error(`Invalid genetic data: ${validation.errors.join(', ')}`);
            }

            // Generate dataset ID
            const datasetId = options.datasetId || ProofUtils.generateDataId(geneticData, options.ownerAddress || 'anonymous');

            // Check cache first
            if (this.config.cacheEnabled && this._isCached(datasetId)) {
                profiler.end('storeGeneticData');
                return this._getCachedResult(datasetId);
            }

            // Prepare access configuration
            const accessConfig = {
                customTiers: options.customTiers,
                accessLevels: options.accessLevels || [1, 2, 3]
            };

            profiler.checkpoint('storeGeneticData', 'encrypting_data');
            // Encrypt the data
            console.log('Encrypting genetic data...');
            const encryptedPackage = await this.encryptionManager.encryptGeneticData(
                geneticData, 
                password, 
                accessConfig
            );

            profiler.checkpoint('storeGeneticData', 'preparing_metadata');
            // Prepare metadata
            const metadata = {
                datasetId,
                ownerAddress: options.ownerAddress,
                createdAt: Date.now(),
                accessLevels: accessConfig.accessLevels,
                dataTypes: Object.keys(geneticData),
                encryptionVersion: '1.0.0',
                compressionUsed: this.config.compressionEnabled,
                totalSize: dataSize,
                checksum: encryptedPackage.checksum
            };

            profiler.checkpoint('storeGeneticData', 'compressing_data');
            // Compress if enabled
            let finalData = Buffer.from(JSON.stringify(encryptedPackage));
            if (this.config.compressionEnabled) {
                finalData = await this._compressData(finalData);
                metadata.compressed = true;
            }

            profiler.checkpoint('storeGeneticData', 'uploading_to_ipfs');
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

            const result = {
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

            // Cache the result
            if (this.config.cacheEnabled) {
                this._cacheResult(datasetId, result);
            }

            profiler.end('storeGeneticData');
            return result;
        } catch (error) {
            profiler.end('storeGeneticData');
            throw new Error(`Storage failed: ${error.message}`);
        }
    }

    /**
     * Retrieve and decrypt genetic data (optimized with caching)
     * @param {string} storageUrl - IPFS storage URL or hash
     * @param {string} password - Decryption password
     * @param {number} accessLevel - Requested access level
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} Decrypted genetic data
     */
    async retrieveGeneticData(storageUrl, password, accessLevel = 1, options = {}) {
        const cacheKey = `${storageUrl}_${accessLevel}`;
        profiler.start('retrieveGeneticData', { storageUrl, accessLevel });
        
        try {
            // Check cache first
            if (this.config.cacheEnabled && this.dataCache.has(cacheKey)) {
                this.cacheStats.hits++;
                profiler.end('retrieveGeneticData');
                return this.dataCache.get(cacheKey);
            }
            
            this.cacheStats.misses++;
            console.log(`Retrieving genetic data from ${storageUrl} with access level ${accessLevel}...`);

            profiler.checkpoint('retrieveGeneticData', 'fetching_from_ipfs');
            // Retrieve from IPFS
            const ipfsResult = await this.ipfsClient.retrieveGeneticData(storageUrl);
            
            profiler.checkpoint('retrieveGeneticData', 'decompressing_data');
            let encryptedPackage;
            if (ipfsResult.metadata && ipfsResult.metadata.compressed) {
                // Decompress data
                const decompressedData = await this._decompressData(ipfsResult.data);
                encryptedPackage = JSON.parse(decompressedData.toString());
            } else {
                encryptedPackage = JSON.parse(ipfsResult.data.toString());
            }

            profiler.checkpoint('retrieveGeneticData', 'decrypting_data');
            // Decrypt data
            console.log('Decrypting genetic data...');
            const decryptedResult = await this.encryptionManager.decryptGeneticData(
                encryptedPackage,
                password,
                accessLevel
            );

            profiler.checkpoint('retrieveGeneticData', 'verifying_integrity');
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

            const result = {
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

            // Cache the result
            if (this.config.cacheEnabled) {
                this._cacheData(cacheKey, result);
            }

            profiler.end('retrieveGeneticData');
            return result;
        } catch (error) {
            profiler.end('retrieveGeneticData');
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
     * Check if data is cached
     * @private
     */
    _isCached(datasetId) {
        return this.dataCache.has(datasetId) || this.metadataCache.has(datasetId);
    }

    /**
     * Get cached result
     * @private
     */
    _getCachedResult(datasetId) {
        this.cacheStats.hits++;
        return this.dataCache.get(datasetId) || this.metadataCache.get(datasetId);
    }

    /**
     * Cache storage result
     * @private
     */
    _cacheResult(datasetId, result) {
        this._evictIfNeeded();
        this.metadataCache.set(datasetId, result);
    }

    /**
     * Cache retrieved data
     * @private
     */
    _cacheData(cacheKey, data) {
        this._evictIfNeeded();
        this.dataCache.set(cacheKey, data);
    }

    /**
     * Evict cache entries if needed
     * @private
     */
    _evictIfNeeded() {
        const totalCacheSize = this.dataCache.size + this.metadataCache.size;
        if (totalCacheSize >= this.config.cacheSize) {
            // Evict oldest entries (simple LRU)
            const oldestDataKey = this.dataCache.keys().next().value;
            const oldestMetaKey = this.metadataCache.keys().next().value;
            
            if (oldestDataKey) {
                this.dataCache.delete(oldestDataKey);
                this.cacheStats.evictions++;
            }
            if (oldestMetaKey) {
                this.metadataCache.delete(oldestMetaKey);
                this.cacheStats.evictions++;
            }
        }
    }

    /**
     * Batch store multiple datasets
     * @param {Array} datasets - Array of {geneticData, password, options}
     * @returns {Promise<Array>} Array of storage results
     */
    async batchStoreGeneticData(datasets) {
        profiler.start('batchStoreGeneticData', { count: datasets.length });
        
        try {
            const results = [];
            const batchSize = this.config.batchSize;
            
            for (let i = 0; i < datasets.length; i += batchSize) {
                const batch = datasets.slice(i, i + batchSize);
                const batchPromises = batch.map(({ geneticData, password, options }) => 
                    this.storeGeneticData(geneticData, password, options)
                );
                
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                // Brief pause between batches
                if (i + batchSize < datasets.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            profiler.end('batchStoreGeneticData');
            return results;
        } catch (error) {
            profiler.end('batchStoreGeneticData');
            throw new Error(`Batch storage failed: ${error.message}`);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache performance statistics
     */
    getCacheStats() {
        const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0;
        
        return {
            ...this.cacheStats,
            hitRate: Math.round(hitRate * 100) / 100,
            dataCache: this.dataCache.size,
            metadataCache: this.metadataCache.size,
            totalCached: this.dataCache.size + this.metadataCache.size
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.dataCache.clear();
        this.metadataCache.clear();
        this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    }

    /**
     * Close storage manager and cleanup resources
     */
    async close() {
        try {
            await this.ipfsClient.close();
            this.storedDatasets.clear();
            this.clearCache();
            
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
            }
        } catch (error) {
            console.warn('Error closing storage manager:', error.message);
        }
    }
}
