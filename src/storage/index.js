/**
 * Main export file for storage components
 * 
 * Provides a unified interface for all storage functionality including IPFS
 * storage, encryption, and storage management. Exports individual components
 * and provides a factory pattern for easy instantiation with configuration.
 * 
 * @fileoverview Storage module exports and factory interface
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Import individual components
 * import { IPFSClient, EncryptionManager, StorageManager } from './storage/index.js';
 * 
 * @example
 * // Use factory for easy setup
 * import { StorageFactory } from './storage/index.js';
 * const storageStack = StorageFactory.createGeneticDataStack(config);
 */

import { IPFSClient } from './ipfs-client.js';
import { EncryptionManager } from './encryption.js';
import { StorageManager } from './storage-manager.js';

// Re-export for external consumers
export { IPFSClient, EncryptionManager, StorageManager };

/**
 * Storage Factory - Simplified interface for creating storage components
 * 
 * Provides a factory pattern for creating storage components with
 * default configurations and preconfigured stacks. Simplifies the setup
 * process for genetic data storage with encryption and IPFS integration.
 * 
 * @class StorageFactory
 * @description Factory for creating storage components and stacks
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Create a storage manager
 * const storage = StorageFactory.createStorageManager({
 *   autoPin: true,
 *   cacheSize: 200
 * });
 * 
 * @example
 * // Create a complete storage stack
 * const stack = StorageFactory.createGeneticDataStack({
 *   ipfs: { host: 'localhost', port: 5001 },
 *   encryption: { algorithm: 'aes-256-gcm' }
 * });
 */
export class StorageFactory {
    /**
     * Create a complete storage manager with default configuration
     * 
     * Instantiates a StorageManager with the provided options, using
     * sensible defaults for genetic data storage. The manager handles
     * encrypted storage, IPFS integration, and caching.
     * 
     * @static
     * @method createStorageManager
     * 
     * @param {Object} [options={}] - Configuration options
     * @param {Object} [options.ipfs] - IPFS client configuration
     * @param {Object} [options.encryption] - Encryption manager configuration
     * @param {number} [options.defaultAccessLevel=1] - Default access level
     * @param {boolean} [options.autoPin=true] - Auto-pin to IPFS
     * @param {boolean} [options.compressionEnabled=true] - Enable compression
     * @param {boolean} [options.cacheEnabled=true] - Enable caching
     * @param {number} [options.cacheSize=100] - Cache size limit
     * 
     * @returns {StorageManager} Configured storage manager instance
     * 
     * @throws {Error} When configuration is invalid
     * 
     * @example
     * // Basic storage manager
     * const storage = StorageFactory.createStorageManager();
     * 
     * @example
     * // Custom configuration
     * const storage = StorageFactory.createStorageManager({
     *   autoPin: true,
     *   cacheSize: 200,
     *   compressionEnabled: true
     * });
     */
    static createStorageManager(options = {}) {
        return new StorageManager(options);
    }

    /**
     * Create an IPFS client
     * 
     * Instantiates an IPFSClient with the provided configuration for
     * decentralized storage operations. Handles file upload, download,
     * pinning, and batch operations.
     * 
     * @static
     * @method createIPFSClient
     * 
     * @param {Object} [options={}] - IPFS configuration
     * @param {string} [options.host='localhost'] - IPFS node host
     * @param {number} [options.port=5001] - IPFS node port
     * @param {string} [options.protocol='http'] - Connection protocol
     * @param {number} [options.timeout=30000] - Request timeout
     * @param {number} [options.maxConcurrentUploads=5] - Max concurrent uploads
     * 
     * @returns {IPFSClient} Configured IPFS client instance
     * 
     * @throws {Error} When IPFS configuration is invalid
     * 
     * @example
     * // Local IPFS node
     * const ipfs = StorageFactory.createIPFSClient();
     * 
     * @example
     * // Remote IPFS node
     * const ipfs = StorageFactory.createIPFSClient({
     *   host: 'ipfs.infura.io',
     *   port: 5001,
     *   protocol: 'https'
     * });
     */
    static createIPFSClient(options = {}) {
        return new IPFSClient(options);
    }

    /**
     * Create an encryption manager
     * 
     * Instantiates an EncryptionManager with the provided configuration
     * for multi-tier encryption with granular access control. Handles
     * AES-GCM encryption, key derivation, and access level management.
     * 
     * @static
     * @method createEncryptionManager
     * 
     * @param {Object} [options={}] - Encryption configuration
     * @param {string} [options.algorithm='aes-256-gcm'] - Encryption algorithm
     * @param {number} [options.keyDerivationIterations=100000] - PBKDF2 iterations
     * @param {number} [options.saltLength=32] - Salt length in bytes
     * @param {number} [options.ivLength=16] - IV length in bytes
     * @param {number} [options.tagLength=16] - Auth tag length
     * 
     * @returns {EncryptionManager} Configured encryption manager instance
     * 
     * @throws {Error} When encryption configuration is invalid
     * 
     * @example
     * // Basic encryption manager
     * const encryption = StorageFactory.createEncryptionManager();
     * 
     * @example
     * // High-security configuration
     * const encryption = StorageFactory.createEncryptionManager({
     *   algorithm: 'aes-256-gcm',
     *   keyDerivationIterations: 200000
     * });
     */
    static createEncryptionManager(options = {}) {
        return new EncryptionManager(options);
    }

    /**
     * Create a preconfigured storage stack for genetic data
     * 
     * Creates a complete storage stack with IPFS client, encryption manager,
     * and storage manager all preconfigured and ready for use. This is the
     * recommended way to set up genetic data storage with all components
     * properly integrated.
     * 
     * @static
     * @method createGeneticDataStack
     * 
     * @param {Object} [config={}] - Complete stack configuration
     * @param {Object} [config.ipfs] - IPFS configuration for IPFSClient
     * @param {Object} [config.encryption] - Encryption configuration for EncryptionManager
     * @param {Object} [config.storage] - Storage configuration for StorageManager
     * @param {number} [config.storage.defaultAccessLevel=1] - Default access level
     * @param {boolean} [config.storage.autoPin=true] - Auto-pin to IPFS
     * 
     * @returns {Object} Complete storage stack with all components
     * @returns {IPFSClient} returns.ipfsClient - Configured IPFS client
     * @returns {EncryptionManager} returns.encryptionManager - Configured encryption manager
     * @returns {StorageManager} returns.storageManager - Configured storage manager
     * 
     * @throws {Error} When any component configuration is invalid
     * 
     * @example
     * // Basic storage stack
     * const stack = StorageFactory.createGeneticDataStack();
     * 
     * @example
     * // Custom configuration
     * const stack = StorageFactory.createGeneticDataStack({
     *   ipfs: { host: 'localhost', port: 5001 },
     *   encryption: { algorithm: 'aes-256-gcm' },
     *   storage: { autoPin: true, cacheSize: 200 }
     * });
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
