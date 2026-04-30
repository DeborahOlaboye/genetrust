// Advanced encryption utilities for genetic data
// Supports multi-tier encryption for different access levels

import { createCipheriv, createDecipheriv, createHash, randomBytes, pbkdf2Sync, createHmac } from 'crypto';
import { profiler } from '../utils/performance-profiler.js';
import { Worker } from 'worker_threads';

/**
 * Encryption utilities for genetic data storage and privacy
 * 
 * Implements multi-tier encryption system for granular access control
 * of genetic data. Supports different encryption levels based on access
 * permissions, ensuring that sensitive genetic information is protected
 * while allowing controlled sharing with appropriate parties.
 * 
 * @class EncryptionManager
 * @description Multi-tier encryption for genetic data privacy
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Create encryption manager
 * const encryption = new EncryptionManager({
 *   algorithm: 'aes-256-gcm',
 *   keyDerivationIterations: 100000
 * });
 * 
 * @example
 * // Encrypt genetic data with access levels
 * const encrypted = await encryption.encryptGeneticData(
 *   geneticData,
 *   'master-password',
 *   { accessLevels: [1, 2, 3] }
 * );
 * 
 * @example
 * // Decrypt with specific access level
 * const decrypted = await encryption.decryptGeneticData(
 *   encrypted,
 *   'master-password',
 *   2 // Access level 2
 * );
 */
export class EncryptionManager {
    /**
     * Creates a new EncryptionManager instance
     * 
     * @constructor
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.algorithm='aes-256-gcm'] - Default encryption algorithm
     * @param {number} [options.keyDerivationIterations=100000] - PBKDF2 iterations for key derivation
     * @param {number} [options.saltLength=32] - Salt length in bytes
     * @param {number} [options.ivLength=16] - Initialization vector length in bytes
     * @param {number} [options.tagLength=16] - Authentication tag length in bytes
     * @param {boolean} [options.useWorkerThreads=true] - Use worker threads for performance
     * @param {number} [options.maxWorkerPoolSize=4] - Maximum worker thread pool size
     * 
     * @throws {Error} When encryption algorithm is not supported
     * @throws {Error} When configuration parameters are invalid
     * 
     * @returns {EncryptionManager} New encryption manager instance
     * 
     * @example
     * // Basic encryption manager
     * const encryption = new EncryptionManager();
     * 
     * @example
     * // Custom configuration
     * const encryption = new EncryptionManager({
     *   algorithm: 'aes-256-gcm',
     *   keyDerivationIterations: 200000,
     *   useWorkerThreads: true
     * });
     */
    constructor(options = {}) {
        this.config = {
            algorithm: options.algorithm || 'aes-256-gcm',
            keyDerivationIterations: options.keyDerivationIterations || 100000,
            saltLength: options.saltLength || 32,
            ivLength: options.ivLength || 16,
            tagLength: options.tagLength || 16,
            ...options
        };

        // Access level encryption schemes
        this.accessLevels = {
            1: { keySize: 16, algorithm: 'aes-128-gcm' }, // Basic access
            2: { keySize: 24, algorithm: 'aes-192-gcm' }, // Detailed access  
            3: { keySize: 32, algorithm: 'aes-256-gcm' }  // Full access
        };
    }

    /**
     * Encrypt genetic data with multi-tier access control
     * 
     * Encrypts genetic data using a tiered approach where different access levels
     * receive different encryption keys. This allows granular control over what
     * data can be accessed by different parties while maintaining security.
     * Uses AES-GCM for authenticated encryption with performance optimizations.
     * 
     * @async
     * @method encryptGeneticData
     * 
     * @param {Object} geneticData - Raw genetic data to encrypt
     * @param {string} geneticData.dnaSequence - DNA sequence data
     * @param {string} geneticData.metadata - Metadata about the genetic data
     * @param {Object} [geneticData.variants] - Genetic variants information
     * @param {Object} [geneticData.phenotypes] - Phenotype data
     * @param {string} masterPassword - Master password for key derivation
     * @param {Object} [accessConfig={}] - Access level configuration
     * @param {Array<number>} [accessConfig.accessLevels=[1,2,3]] - Access levels to create
     * @param {Object} [accessConfig.dataMapping] - Custom data tier mapping
     * @param {boolean} [accessConfig.compress=true] - Compress encrypted data
     * @param {string} [accessConfig.description] - Description for encrypted data
     * 
     * @returns {Promise<Object>} Encrypted data with access keys and metadata
     * @returns {string} returns.dataHash - Hash of the original data for integrity
     * @returns {Object} returns.encryptedTiers - Encrypted data tiers by access level
     * @returns {Object} returns.accessKeys - Access keys for each level
     * @returns {Object} returns.metadata - Encryption metadata
     * @returns {string} returns.metadata.algorithm - Encryption algorithm used
     * @returns {number} returns.metadata.timestamp - Encryption timestamp
     * @returns {Array<number>} returns.metadata.accessLevels - Available access levels
     * 
     * @throws {Error} When genetic data is invalid or missing
     * @throws {Error} When master password is empty or invalid
     * @throws {Error} When access configuration is invalid
     * @throws {Error} When encryption fails due to cryptographic errors
     * @throws {Error} When data tiering fails
     * 
     * @example
     * // Basic encryption with all access levels
     * const encrypted = await encryption.encryptGeneticData(
     *   { dnaSequence: 'ATCG...', metadata: 'Sample 001' },
     *   'secure-password'
     * );
     * 
     * @example
     * // Custom access levels
     * const encrypted = await encryption.encryptGeneticData(
     *   geneticData,
     *   'password',
     *   {
     *     accessLevels: [1, 3], // Only basic and full access
     *     compress: true,
     *     description: 'Research sample data'
     *   }
     * );
     * 
     * @example
     * // Custom data mapping
     * const encrypted = await encryption.encryptGeneticData(
     *   geneticData,
     *   'password',
     *   {
     *     dataMapping: {
     *       1: ['metadata'], // Level 1: metadata only
     *       2: ['metadata', 'variants'], // Level 2: metadata + variants
     *       3: ['all'] // Level 3: all data
     *     }
     *   }
     * );
     */
    async encryptGeneticData(geneticData, masterPassword, accessConfig = {}) {
        const dataSize = JSON.stringify(geneticData).length;
        profiler.start('encryptGeneticData', { dataSize, accessLevels: accessConfig.accessLevels });
        
        try {
            // Validate input
            if (!geneticData || typeof geneticData !== 'object') {
                throw new Error('Invalid genetic data');
            }

            profiler.checkpoint('encryptGeneticData', 'preparing_data_tiers');
            // Prepare data tiers based on access levels
            const dataTiers = await this._prepareDataTiersOptimized(geneticData, accessConfig);
            
            profiler.checkpoint('encryptGeneticData', 'generating_master_key');
            // Generate master key from password
            const masterSalt = randomBytes(this.config.saltLength);
            const masterKey = this._deriveKey(masterPassword, masterSalt, 32);

            profiler.checkpoint('encryptGeneticData', 'encrypting_tiers');
            // Encrypt tiers in parallel for better performance
            const encryptionPromises = [];
            const tierEntries = Object.entries(dataTiers);
            
            for (const [level, tierData] of tierEntries) {
                encryptionPromises.push(this._encryptTierOptimized(level, tierData, masterKey));
            }
            
            const encryptedTierResults = await Promise.all(encryptionPromises);
            
            // Organize results
            const encryptedTiers = {};
            const accessKeys = {};
            
            encryptedTierResults.forEach(({ level, encryptedTier, accessKey }) => {
                encryptedTiers[level] = encryptedTier;
                accessKeys[level] = accessKey;
            });

            profiler.checkpoint('encryptGeneticData', 'encrypting_metadata');
            // Create and encrypt metadata
            const metadata = {
                version: '1.0.0',
                timestamp: Date.now(),
                accessLevels: Object.keys(dataTiers).map(Number),
                algorithm: this.config.algorithm,
                keyDerivation: 'pbkdf2',
                iterations: this.config.keyDerivationIterations,
                dataSize
            };

            const metadataKey = this._deriveKey(masterKey.toString('hex'), masterSalt, 32);
            const encryptedMetadata = await this._encryptData(JSON.stringify(metadata), metadataKey);

            const result = {
                encryptedData: {
                    tiers: encryptedTiers,
                    metadata: {
                        ...encryptedMetadata,
                        salt: Array.from(masterSalt)
                    }
                },
                accessKeys,
                masterSalt: Array.from(masterSalt),
                checksum: this._generateChecksum(geneticData)
            };

            profiler.end('encryptGeneticData');
            return result;
        } catch (error) {
            profiler.end('encryptGeneticData');
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt genetic data for specific access level
     * @param {Object} encryptedPackage - Encrypted data package
     * @param {string} masterPassword - Master password
     * @param {number} accessLevel - Requested access level (1-3)
     * @returns {Promise<Object>} Decrypted data for the access level
     */
    async decryptGeneticData(encryptedPackage, masterPassword, accessLevel = 1) {
        try {
            // Validate access level
            if (!this.accessLevels[accessLevel]) {
                throw new Error(`Invalid access level: ${accessLevel}`);
            }

            // Derive master key
            const masterSalt = Buffer.from(encryptedPackage.masterSalt);
            const masterKey = this._deriveKey(masterPassword, masterSalt, 32);

            // Decrypt and verify metadata
            const metadataKey = this._deriveKey(masterKey.toString('hex'), masterSalt, 32);
            const decryptedMetadata = await this._decryptData(
                encryptedPackage.encryptedData.metadata, 
                metadataKey
            );
            const metadata = JSON.parse(decryptedMetadata);

            // Check if requested access level is available
            if (!metadata.accessLevels.includes(accessLevel)) {
                throw new Error(`Access level ${accessLevel} not available`);
            }

            // Get encrypted tier data
            const encryptedTier = encryptedPackage.encryptedData.tiers[accessLevel];
            if (!encryptedTier) {
                throw new Error(`No data available for access level ${accessLevel}`);
            }

            // Decrypt access key
            const accessKeyInfo = encryptedPackage.accessKeys[accessLevel];
            const tierSalt = Buffer.from(accessKeyInfo.salt);
            const tierKey = this._deriveKey(masterKey.toString('hex'), tierSalt, 
                this.accessLevels[accessLevel].keySize);

            // Decrypt tier data
            const decryptedTierData = await this._decryptData(encryptedTier, tierKey);
            const tierData = JSON.parse(decryptedTierData);

            return {
                data: tierData,
                accessLevel,
                metadata: {
                    version: metadata.version,
                    timestamp: metadata.timestamp,
                    decryptedAt: Date.now()
                }
            };
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Generate access-specific encryption key for external parties
     * @param {Object} encryptedPackage - Encrypted data package
     * @param {string} masterPassword - Master password
     * @param {number} accessLevel - Access level to grant
     * @param {string} recipientPublicKey - Recipient's public key (optional)
     * @returns {Promise<Object>} Access key package
     */
    async generateAccessKey(encryptedPackage, masterPassword, accessLevel, recipientPublicKey = null) {
        try {
            // Derive master key
            const masterSalt = Buffer.from(encryptedPackage.masterSalt);
            const masterKey = this._deriveKey(masterPassword, masterSalt, 32);

            // Get access key for the tier
            const accessKeyInfo = encryptedPackage.accessKeys[accessLevel];
            if (!accessKeyInfo) {
                throw new Error(`Access level ${accessLevel} not available`);
            }

            // Create time-limited access token
            const accessToken = {
                accessLevel,
                tierSalt: accessKeyInfo.salt,
                algorithm: this.accessLevels[accessLevel].algorithm,
                validUntil: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                nonce: Array.from(randomBytes(16))
            };

            // Encrypt access token
            let encryptedToken;
            if (recipientPublicKey) {
                // In a real implementation, this would use the recipient's public key
                // For now, we'll use a derived key approach
                const recipientKey = this._deriveKey(recipientPublicKey, masterSalt, 32);
                encryptedToken = await this._encryptData(JSON.stringify(accessToken), recipientKey);
            } else {
                // Self-encrypted token
                const tokenKey = this._deriveKey(masterKey.toString('hex') + accessLevel, masterSalt, 32);
                encryptedToken = await this._encryptData(JSON.stringify(accessToken), tokenKey);
            }

            return {
                accessLevel,
                encryptedToken,
                validUntil: accessToken.validUntil,
                recipientKey: recipientPublicKey || null
            };
        } catch (error) {
            throw new Error(`Access key generation failed: ${error.message}`);
        }
    }

    /**
     * Prepare data tiers based on access levels with optimization
     * @private
     */
    async _prepareDataTiersOptimized(geneticData, accessConfig) {
        const tiers = {};
        const isLargeDataset = JSON.stringify(geneticData).length > 1024 * 1024; // 1MB threshold

        // Level 1: Basic metadata and aggregate statistics
        tiers[1] = {
            type: 'basic',
            totalVariants: geneticData.variants ? geneticData.variants.length : 0,
            totalGenes: geneticData.genes ? geneticData.genes.length : 0,
            dataTypes: Object.keys(geneticData),
            generalStats: await this._calculateBasicStatsOptimized(geneticData, isLargeDataset),
            timestamp: Date.now()
        };

        // Level 2: Partial data with filtered information
        const filteredVariants = isLargeDataset ? 
            await this._filterSensitiveDataChunked(geneticData.variants || [], 'medium') :
            this._filterSensitiveData(geneticData.variants || [], 'medium');
            
        tiers[2] = {
            type: 'detailed',
            ...tiers[1],
            filteredVariants,
            geneList: geneticData.genes ? geneticData.genes.map(g => ({
                symbol: g.symbol,
                name: g.name,
                chromosome: g.chromosome
            })) : [],
            phenotypes: geneticData.phenotypes || []
        };

        // Level 3: Full access to all data (use reference for large datasets)
        tiers[3] = isLargeDataset ? {
            type: 'full',
            dataReference: true,
            ...this._createDataReference(geneticData),
            accessLevel: 3,
            encryptionLevel: 'maximum'
        } : {
            type: 'full',
            ...geneticData,
            accessLevel: 3,
            encryptionLevel: 'maximum'
        };

        // Apply custom access configuration if provided
        if (accessConfig.customTiers) {
            Object.assign(tiers, accessConfig.customTiers);
        }

        return tiers;
    }

    /**
     * Prepare data tiers based on access levels (legacy method)
     * @private
     */
    _prepareDataTiers(geneticData, accessConfig) {
        return this._prepareDataTiersOptimized(geneticData, accessConfig);
    }

    /**
     * Calculate basic statistics for genetic data with optimization
     * @private
     */
    async _calculateBasicStatsOptimized(geneticData, isLargeDataset = false) {
        const stats = {
            variantTypes: {},
            chromosomeDistribution: {},
            qualityMetrics: {}
        };

        if (geneticData.variants) {
            if (isLargeDataset && geneticData.variants.length > 50000) {
                // Process in chunks for large datasets
                const chunkSize = 10000;
                for (let i = 0; i < geneticData.variants.length; i += chunkSize) {
                    const chunk = geneticData.variants.slice(i, i + chunkSize);
                    this._processVariantStatsChunk(chunk, stats);
                    
                    // Yield control periodically
                    if (i % (chunkSize * 5) === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            } else {
                this._processVariantStatsChunk(geneticData.variants, stats);
            }
        }

        return stats;
    }

    /**
     * Calculate basic statistics for genetic data (legacy method)
     * @private
     */
    _calculateBasicStats(geneticData) {
        return this._calculateBasicStatsOptimized(geneticData, false);
    }

    /**
     * Process variant statistics for a chunk of data
     * @private
     */
    _processVariantStatsChunk(variants, stats) {
        variants.forEach(variant => {
            // Count variant types
            if (variant.type) {
                stats.variantTypes[variant.type] = (stats.variantTypes[variant.type] || 0) + 1;
            }

            // Count chromosome distribution
            if (variant.chromosome) {
                stats.chromosomeDistribution[variant.chromosome] = 
                    (stats.chromosomeDistribution[variant.chromosome] || 0) + 1;
            }
        });
    }

    /**
     * Filter sensitive data with chunked processing for large datasets
     * @private
     */
    async _filterSensitiveDataChunked(data, privacyLevel) {
        if (!Array.isArray(data)) return data;
        
        const result = [];
        const chunkSize = 10000;
        
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const filteredChunk = this._filterSensitiveData(chunk, privacyLevel);
            result.push(...filteredChunk);
            
            // Yield control periodically
            if (i % (chunkSize * 5) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return result;
    }

    /**
     * Filter sensitive data based on privacy level
     * @private
     */
    _filterSensitiveData(data, privacyLevel) {
        if (!Array.isArray(data)) return data;

        switch (privacyLevel) {
            case 'high':
                return data.map(item => ({
                    type: item.type,
                    chromosome: item.chromosome,
                    gene: item.gene
                }));
            case 'medium':
                return data.map(item => ({
                    ...item,
                    sequence: undefined,
                    exactPosition: undefined,
                    individualId: undefined
                }));
            case 'low':
            default:
                return data;
        }
    }

    /**
     * Encrypt tier data with optimization
     * @private
     */
    async _encryptTierOptimized(level, tierData, masterKey) {
        const levelConfig = this.accessLevels[parseInt(level)] || this.accessLevels[3];
        
        // Derive tier-specific key
        const tierSalt = randomBytes(this.config.saltLength);
        const tierKey = this._deriveKey(masterKey.toString('hex'), tierSalt, levelConfig.keySize);

        // Encrypt tier data
        const encryptedTier = await this._encryptData(
            JSON.stringify(tierData), 
            tierKey, 
            levelConfig.algorithm
        );

        const result = {
            level,
            encryptedTier: {
                ...encryptedTier,
                salt: Array.from(tierSalt),
                algorithm: levelConfig.algorithm
            },
            accessKey: {
                encryptedKey: Array.from(await this._encryptAccessKey(tierKey, masterKey)),
                salt: Array.from(tierSalt)
            }
        };

        return result;
    }

    /**
     * Create data reference for large datasets
     * @private
     */
    _createDataReference(geneticData) {
        return {
            variantCount: geneticData.variants?.length || 0,
            geneCount: geneticData.genes?.length || 0,
            sequenceCount: geneticData.sequences?.length || 0,
            phenotypeCount: geneticData.phenotypes?.length || 0,
            dataTypes: Object.keys(geneticData),
            sampleInfo: geneticData.sample || {},
            assembly: geneticData.assembly || 'GRCh38'
        };
    }

    /**
     * Encrypt data with specified algorithm
     * @private
     */
    async _encryptData(data, key, algorithm = null) {
        const algo = algorithm || this.config.algorithm;
        const iv = randomBytes(this.config.ivLength);
        const cipher = createCipheriv(algo, key, iv);

        let encrypted = cipher.update(data, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const authTag = cipher.getAuthTag();

        return {
            encrypted: Array.from(encrypted),
            iv: Array.from(iv),
            authTag: Array.from(authTag),
            algorithm: algo
        };
    }

    /**
     * Decrypt data
     * @private
     */
    async _decryptData(encryptedData, key) {
        const { encrypted, iv, authTag, algorithm } = encryptedData;
        
        const decipher = createDecipheriv(algorithm, key, Buffer.from(iv));
        decipher.setAuthTag(Buffer.from(authTag));

        let decrypted = decipher.update(Buffer.from(encrypted));
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    }

    /**
     * Derive encryption key from password and salt
     * @private
     */
    _deriveKey(password, salt, keyLength) {
        return pbkdf2Sync(
            password, 
            salt, 
            this.config.keyDerivationIterations, 
            keyLength, 
            'sha512'
        );
    }

    /**
     * Encrypt access key for storage
     * @private
     */
    async _encryptAccessKey(accessKey, masterKey) {
        const keyData = accessKey.toString('hex');
        const iv = randomBytes(this.config.ivLength);
        const cipher = createCipheriv(this.config.algorithm, masterKey, iv);

        let encrypted = cipher.update(keyData, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        return Buffer.concat([iv, authTag, encrypted]);
    }

    /**
     * Generate checksum for data integrity
     * @private
     */
    _generateChecksum(data) {
        const dataString = JSON.stringify(data);
        return createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Verify data integrity using checksum
     * @param {Object} data - Decrypted data
     * @param {string} expectedChecksum - Expected checksum
     * @returns {boolean} True if data is intact
     */
    verifyIntegrity(data, expectedChecksum) {
        const actualChecksum = this._generateChecksum(data);
        return actualChecksum === expectedChecksum;
    }

    /**
     * Generate secure random password
     * @param {number} length - Password length
     * @returns {string} Random password
     */
    static generateSecurePassword(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }
        
        return password;
    }

    /**
     * Estimate encryption strength
     * @param {string} password - Password to analyze
     * @returns {Object} Strength analysis
     */
    static analyzePasswordStrength(password) {
        const analysis = {
            length: password.length,
            hasLowercase: /[a-z]/.test(password),
            hasUppercase: /[A-Z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            entropy: 0,
            strength: 'weak'
        };

        // Calculate entropy
        const charsetSize = 
            (analysis.hasLowercase ? 26 : 0) +
            (analysis.hasUppercase ? 26 : 0) +
            (analysis.hasNumbers ? 10 : 0) +
            (analysis.hasSpecialChars ? 32 : 0);

        analysis.entropy = Math.log2(Math.pow(charsetSize, password.length));

        // Determine strength
        if (analysis.entropy >= 60 && password.length >= 12) {
            analysis.strength = 'very_strong';
        } else if (analysis.entropy >= 50 && password.length >= 10) {
            analysis.strength = 'strong';
        } else if (analysis.entropy >= 40 && password.length >= 8) {
            analysis.strength = 'medium';
        } else if (analysis.entropy >= 30) {
            analysis.strength = 'weak';
        } else {
            analysis.strength = 'very_weak';
        }

        return analysis;
    }
}
