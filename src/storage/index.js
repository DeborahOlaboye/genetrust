// Main export file for storage components
// Provides unified interface for all storage functionality

import { IPFSClient } from './ipfs-client.js';
import { EncryptionManager } from './encryption.js';
import { StorageManager } from './storage-manager.js';

// Re-export for external consumers
export { IPFSClient, EncryptionManager, StorageManager };

/**
 * Storage Factory - Simplified interface for creating storage components
 */
export class StorageFactory {
    /**
     * Create a complete storage manager with default configuration
     * @param {Object} options - Configuration options
     * @returns {StorageManager} Storage manager instance
     */
    static createStorageManager(options = {}) {
        return new StorageManager(options);
    }

    /**
     * Create an IPFS client
     * @param {Object} options - IPFS configuration
     * @returns {IPFSClient} IPFS client instance
     */
    static createIPFSClient(options = {}) {
        return new IPFSClient(options);
    }

    /**
     * Create an encryption manager
     * @param {Object} options - Encryption configuration
     * @returns {EncryptionManager} Encryption manager instance
     */
    static createEncryptionManager(options = {}) {
        return new EncryptionManager(options);
    }

    /**
     * Create a preconfigured storage stack for genetic data
     * @param {Object} config - Complete configuration
     * @returns {Object} Complete storage stack
     */
    static createGeneticDataStack(config = {}) {
        const ipfsClient = new IPFSClient(config.ipfs || {});
        const encryptionManager = new EncryptionManager(config.encryption || {});
        const storageManager = new StorageManager({
            ipfsConfig: config.ipfs || {},
            encryptionConfig: config.encryption || {},
            ...config.storage
        });

        return {
            ipfs: ipfsClient,
            encryption: encryptionManager,
            storage: storageManager
        };
    }
}
