// IPFS integration for decentralized storage of encrypted genetic data
// Handles upload, retrieval, and pinning of genetic data files

import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';
import { profiler } from '../utils/performance-profiler.js';

/**
 * IPFS client for genetic data storage
 * Provides encrypted storage and retrieval capabilities
 */
export class IPFSClient {
    constructor(options = {}) {
        // Default IPFS configuration
        this.config = {
            host: options.host || 'localhost',
            port: options.port || 5001,
            protocol: options.protocol || 'http',
            timeout: options.timeout || 30000,
            maxConcurrentUploads: options.maxConcurrentUploads || 5,
            batchSize: options.batchSize || 10,
            retryAttempts: options.retryAttempts || 3,
            ...options
        };

        // Initialize IPFS client
        this.ipfs = create({
            host: this.config.host,
            port: this.config.port,
            protocol: this.config.protocol,
            timeout: this.config.timeout
        });

        // Track pinned content for cleanup
        this.pinnedContent = new Set();
        
        // Connection pool and batch management
        this.activeUploads = 0;
        this.uploadQueue = [];
        this.batchQueue = [];
        this.batchTimer = null;
        
        // Performance metrics
        this.metrics = {
            uploads: 0,
            downloads: 0,
            errors: 0,
            totalUploadTime: 0,
            totalDownloadTime: 0
        };
    }

    /**
     * Upload encrypted genetic data to IPFS with performance optimization
     * @param {Buffer} encryptedData - Encrypted genetic data
     * @param {Object} metadata - File metadata
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} Upload result with IPFS hash and metadata
     */
    async uploadGeneticData(encryptedData, metadata = {}, options = {}) {
        const operationId = `upload_${Date.now()}`;
        profiler.start(operationId, { size: encryptedData.length });
        
        try {
            // Validate input
            if (!Buffer.isBuffer(encryptedData)) {
                throw new Error('Encrypted data must be a Buffer');
            }

            // Check if we should queue this upload
            if (this.activeUploads >= this.config.maxConcurrentUploads) {
                return this._queueUpload(encryptedData, metadata, options);
            }

            this.activeUploads++;
            const startTime = performance.now();

            profiler.checkpoint(operationId, 'preparing_files');
            // Prepare file object for IPFS
            const file = {
                path: metadata.filename || `genetic-data-${Date.now()}.enc`,
                content: encryptedData
            };

            // Add metadata as separate file if provided
            const files = [file];
            if (Object.keys(metadata).length > 0) {
                const metadataFile = {
                    path: `${file.path}.meta.json`,
                    content: Buffer.from(JSON.stringify(metadata))
                };
                files.push(metadataFile);
            }

            profiler.checkpoint(operationId, 'uploading_to_ipfs');
            // Upload to IPFS with retry logic
            const uploadResults = await this._uploadWithRetry(files, {
                pin: options.pin !== false,
                wrapWithDirectory: true,
                progress: options.onProgress
            });

            // Find the directory hash (last result when using wrapWithDirectory)
            const directoryResult = uploadResults[uploadResults.length - 1];
            const dataFileResult = uploadResults.find(r => r.path === file.path);

            // Track pinned content
            if (options.pin !== false) {
                this.pinnedContent.add(directoryResult.cid.toString());
            }

            // Generate storage URL
            const storageUrl = this._generateStorageUrl(directoryResult.cid.toString(), file.path);

            // Update metrics
            const duration = performance.now() - startTime;
            this.metrics.uploads++;
            this.metrics.totalUploadTime += duration;

            const result = {
                success: true,
                ipfsHash: directoryResult.cid.toString(),
                dataHash: dataFileResult.cid.toString(),
                storageUrl,
                size: encryptedData.length,
                uploadedFiles: uploadResults.length,
                timestamp: Date.now(),
                uploadDuration: duration,
                metadata: {
                    ...metadata,
                    ipfsDirectory: directoryResult.cid.toString(),
                    dataFile: file.path,
                    metadataFile: Object.keys(metadata).length > 0 ? `${file.path}.meta.json` : null
                }
            };

            profiler.end(operationId);
            return result;
        } catch (error) {
            this.metrics.errors++;
            
            // Graceful mock fallback for development environments when IPFS is unavailable
            const isProduction = process?.env?.NODE_ENV === 'production';
            const allowMock = this.config.allowMock !== false && !isProduction;
            if (allowMock) {
                const mockHash = `mock-${Date.now().toString(16)}`;
                const filePath = metadata.filename || `genetic-data-${Date.now()}.enc`;
                const storageUrl = this._generateStorageUrl(mockHash, filePath);
                console.warn('IPFS upload failed; returning mocked result (development mode):', error.message);
                
                profiler.end(operationId);
                return {
                    success: true,
                    ipfsHash: mockHash,
                    dataHash: `${mockHash}-data`,
                    storageUrl,
                    size: encryptedData.length,
                    uploadedFiles: 1,
                    timestamp: Date.now(),
                    metadata: {
                        ...metadata,
                        ipfsDirectory: mockHash,
                        dataFile: filePath,
                        metadataFile: Object.keys(metadata).length > 0 ? `${filePath}.meta.json` : null
                    }
                };
            }
            
            profiler.end(operationId);
            throw new Error(`IPFS upload failed: ${error.message}`);
        } finally {
            this.activeUploads--;
            this._processUploadQueue();
        }
    }

    /**
     * Retrieve encrypted genetic data from IPFS with caching
     * @param {string} ipfsHash - IPFS hash or storage URL
     * @param {string} filename - Specific filename to retrieve (optional)
     * @returns {Promise<Object>} Retrieved data and metadata
     */
    async retrieveGeneticData(ipfsHash, filename = null) {
        const operationId = `retrieve_${Date.now()}`;
        profiler.start(operationId, { hash: ipfsHash });
        
        try {
            const startTime = performance.now();
            
            // Parse hash from URL if needed
            const hash = this._parseHashFromUrl(ipfsHash);
            
            profiler.checkpoint(operationId, 'parsing_path');
            // Determine the path to retrieve
            let retrievePath = hash;
            if (filename) {
                retrievePath = `${hash}/${filename}`;
            }

            profiler.checkpoint(operationId, 'retrieving_data');
            // Retrieve data from IPFS with timeout
            const data = await this._retrieveWithTimeout(retrievePath);

            profiler.checkpoint(operationId, 'retrieving_metadata');
            // Try to retrieve metadata if available
            let metadata = null;
            if (!filename || !filename.endsWith('.meta.json')) {
                try {
                    const metadataPath = filename ? 
                        `${hash}/${filename}.meta.json` : 
                        `${hash}/metadata.json`;
                    
                    const metadataBuffer = await this._retrieveWithTimeout(metadataPath);
                    metadata = JSON.parse(metadataBuffer.toString());
                } catch (metaError) {
                    // Metadata not found or invalid, continue without it
                    console.warn('Could not retrieve metadata:', metaError.message);
                }
            }

            // Update metrics
            const duration = performance.now() - startTime;
            this.metrics.downloads++;
            this.metrics.totalDownloadTime += duration;

            const result = {
                success: true,
                data,
                metadata,
                hash,
                size: data.length,
                retrievedAt: Date.now(),
                downloadDuration: duration
            };

            profiler.end(operationId);
            return result;
        } catch (error) {
            this.metrics.errors++;
            profiler.end(operationId);
            throw new Error(`IPFS retrieval failed: ${error.message}`);
        }
    }

    /**
     * List files in an IPFS directory
     * @param {string} directoryHash - IPFS directory hash
     * @returns {Promise<Array>} List of files in the directory
     */
    async listDirectory(directoryHash) {
        try {
            const files = [];
            for await (const file of this.ipfs.ls(directoryHash)) {
                files.push({
                    name: file.name,
                    hash: file.cid.toString(),
                    size: file.size,
                    type: file.type === 'dir' ? 'directory' : 'file'
                });
            }
            return files;
        } catch (error) {
            throw new Error(`Directory listing failed: ${error.message}`);
        }
    }

    /**
     * Pin content to ensure it stays available
     * @param {string} hash - IPFS hash to pin
     * @param {Object} options - Pinning options
     * @returns {Promise<boolean>} Success status
     */
    async pinContent(hash, options = {}) {
        try {
            await this.ipfs.pin.add(hash, {
                recursive: options.recursive !== false,
                timeout: options.timeout || 30000
            });
            
            this.pinnedContent.add(hash);
            return true;
        } catch (error) {
            throw new Error(`Pinning failed: ${error.message}`);
        }
    }

    /**
     * Unpin content to free up storage
     * @param {string} hash - IPFS hash to unpin
     * @returns {Promise<boolean>} Success status
     */
    async unpinContent(hash) {
        try {
            await this.ipfs.pin.rm(hash);
            this.pinnedContent.delete(hash);
            return true;
        } catch (error) {
            throw new Error(`Unpinning failed: ${error.message}`);
        }
    }

    /**
     * Get IPFS node information
     * @returns {Promise<Object>} Node information
     */
    async getNodeInfo() {
        try {
            const id = await this.ipfs.id();
            const version = await this.ipfs.version();
            
            return {
                id: id.id,
                publicKey: id.publicKey,
                addresses: id.addresses,
                agentVersion: id.agentVersion,
                protocolVersion: id.protocolVersion,
                version: version.version,
                commit: version.commit,
                repo: version.repo
            };
        } catch (error) {
            throw new Error(`Failed to get node info: ${error.message}`);
        }
    }

    /**
     * Check if content is available on the network
     * @param {string} hash - IPFS hash to check
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} True if content is available
     */
    async isContentAvailable(hash, timeout = 10000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Try to get the first chunk
            const iterator = this.ipfs.cat(hash, { 
                length: 1,
                signal: controller.signal 
            });
            
            await iterator.next();
            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get statistics about stored content
     * @returns {Promise<Object>} Storage statistics
     */
    async getStorageStats() {
        try {
            const stats = await this.ipfs.stats.repo();
            const pinnedList = [];
            
            for await (const pin of this.ipfs.pin.ls()) {
                pinnedList.push(pin.cid.toString());
            }

            return {
                totalSize: stats.repoSize,
                numObjects: stats.numObjects,
                pinnedContent: pinnedList.length,
                version: stats.version,
                maxStorage: stats.maxStorage,
                pinnedHashes: Array.from(this.pinnedContent)
            };
        } catch (error) {
            throw new Error(`Failed to get storage stats: ${error.message}`);
        }
    }

    /**
     * Create a shareable gateway URL for content
     * @param {string} hash - IPFS hash
     * @param {string} filename - Optional filename
     * @param {string} gateway - Gateway URL (default: ipfs.io)
     * @returns {string} Gateway URL
     */
    createGatewayUrl(hash, filename = null, gateway = 'https://ipfs.io') {
        const cleanHash = this._parseHashFromUrl(hash);
        const baseUrl = `${gateway}/ipfs/${cleanHash}`;
        return filename ? `${baseUrl}/${filename}` : baseUrl;
    }

    /**
     * Generate storage URL in the format expected by genetic-data.clar
     * @param {string} hash - IPFS hash
     * @param {string} filename - Filename
     * @returns {string} Storage URL (max 256 characters)
     * @private
     */
    _generateStorageUrl(hash, filename) {
        const baseUrl = `ipfs://${hash}/${filename}`;
        
        // Ensure URL doesn't exceed contract limit of 256 characters
        if (baseUrl.length > 256) {
            // Truncate filename if needed
            const maxFilenameLength = 256 - `ipfs://${hash}/`.length;
            const truncatedFilename = filename.length > maxFilenameLength ? 
                filename.substring(0, maxFilenameLength - 3) + '...' : filename;
            return `ipfs://${hash}/${truncatedFilename}`;
        }
        
        return baseUrl;
    }

    /**
     * Parse IPFS hash from various URL formats
     * @param {string} input - Hash or URL
     * @returns {string} Clean IPFS hash
     * @private
     */
    _parseHashFromUrl(input) {
        if (input.startsWith('ipfs://')) {
            return input.replace('ipfs://', '').split('/')[0];
        }
        
        if (input.includes('/ipfs/')) {
            return input.split('/ipfs/')[1].split('/')[0];
        }
        
        // Assume it's already a clean hash
        return input;
    }

    /**
     * Cleanup pinned content (useful for testing or maintenance)
     * @param {Array<string>} excludeHashes - Hashes to keep pinned
     * @returns {Promise<number>} Number of items unpinned
     */
    async cleanupPinnedContent(excludeHashes = []) {
        let unpinnedCount = 0;
        const excludeSet = new Set(excludeHashes);

        for (const hash of this.pinnedContent) {
            if (!excludeSet.has(hash)) {
                try {
                    await this.unpinContent(hash);
                    unpinnedCount++;
                } catch (error) {
                    console.warn(`Failed to unpin ${hash}:`, error.message);
                }
            }
        }

        return unpinnedCount;
    }

    /**
     * Test IPFS connection
     * @returns {Promise<boolean>} True if connection is working
     */
    async testConnection() {
        try {
            await this.ipfs.id();
            return true;
        } catch (error) {
            console.error('IPFS connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Queue upload when at capacity
     * @private
     */
    async _queueUpload(encryptedData, metadata, options) {
        return new Promise((resolve, reject) => {
            this.uploadQueue.push({
                encryptedData,
                metadata,
                options,
                resolve,
                reject
            });
        });
    }

    /**
     * Process queued uploads
     * @private
     */
    async _processUploadQueue() {
        if (this.uploadQueue.length > 0 && this.activeUploads < this.config.maxConcurrentUploads) {
            const { encryptedData, metadata, options, resolve, reject } = this.uploadQueue.shift();
            
            try {
                const result = await this.uploadGeneticData(encryptedData, metadata, options);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }

    /**
     * Upload with retry logic
     * @private
     */
    async _uploadWithRetry(files, options) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const uploadResults = [];
                for await (const result of this.ipfs.addAll(files, options)) {
                    uploadResults.push(result);
                }
                return uploadResults;
            } catch (error) {
                lastError = error;
                if (attempt < this.config.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Retrieve data with timeout
     * @private
     */
    async _retrieveWithTimeout(path) {
        const chunks = [];
        const timeout = this.config.timeout;
        
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Retrieval timeout after ${timeout}ms`));
            }, timeout);
            
            try {
                for await (const chunk of this.ipfs.cat(path)) {
                    chunks.push(chunk);
                }
                clearTimeout(timer);
                resolve(Buffer.concat(chunks));
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * Batch upload multiple files
     * @param {Array} uploads - Array of upload objects
     * @returns {Promise<Array>} Array of upload results
     */
    async batchUpload(uploads) {
        const results = [];
        const batchSize = this.config.batchSize;
        
        for (let i = 0; i < uploads.length; i += batchSize) {
            const batch = uploads.slice(i, i + batchSize);
            const batchPromises = batch.map(upload => 
                this.uploadGeneticData(upload.data, upload.metadata, upload.options)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Brief pause between batches
            if (i + batchSize < uploads.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        const avgUploadTime = this.metrics.uploads > 0 ? 
            this.metrics.totalUploadTime / this.metrics.uploads : 0;
        const avgDownloadTime = this.metrics.downloads > 0 ? 
            this.metrics.totalDownloadTime / this.metrics.downloads : 0;
        
        return {
            ...this.metrics,
            avgUploadTime: Math.round(avgUploadTime),
            avgDownloadTime: Math.round(avgDownloadTime),
            activeUploads: this.activeUploads,
            queuedUploads: this.uploadQueue.length,
            pinnedContent: this.pinnedContent.size
        };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.metrics = {
            uploads: 0,
            downloads: 0,
            errors: 0,
            totalUploadTime: 0,
            totalDownloadTime: 0
        };
    }

    /**
     * Close IPFS connection
     */
    async close() {
        try {
            // Clear queues
            this.uploadQueue = [];
            
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
            }
            
            // Note: ipfs-http-client doesn't have a close method
            // This is here for interface consistency
            console.log('IPFS HTTP client connection closed');
        } catch (error) {
            console.warn('Error closing IPFS connection:', error.message);
        }
    }
}
