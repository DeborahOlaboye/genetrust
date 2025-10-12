// Advanced encryption utilities for genetic data
// Supports multi-tier encryption for different access levels

import { createCipheriv, createDecipheriv, createHash, randomBytes, pbkdf2Sync, createHmac } from 'crypto';

/**
 * Encryption utilities for genetic data storage
 * Implements multi-tier encryption for granular access control
 */
export class EncryptionManager {
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
     * @param {Object} geneticData - Raw genetic data
     * @param {string} masterPassword - Master password for encryption
     * @param {Object} accessConfig - Access level configuration
     * @returns {Promise<Object>} Encrypted data with access keys
     */
    async encryptGeneticData(geneticData, masterPassword, accessConfig = {}) {
        try {
            // Validate input
            if (!geneticData || typeof geneticData !== 'object') {
                throw new Error('Invalid genetic data');
            }

            // Prepare data tiers based on access levels
            const dataTiers = this._prepareDataTiers(geneticData, accessConfig);
            
            // Generate master key from password
            const masterSalt = randomBytes(this.config.saltLength);
            const masterKey = this._deriveKey(masterPassword, masterSalt, 32);

            // Encrypt each tier with different keys
            const encryptedTiers = {};
            const accessKeys = {};

            for (const [level, tierData] of Object.entries(dataTiers)) {
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

                encryptedTiers[level] = {
                    ...encryptedTier,
                    salt: Array.from(tierSalt),
                    algorithm: levelConfig.algorithm
                };

                // Store encrypted access key
                accessKeys[level] = {
                    encryptedKey: Array.from(await this._encryptAccessKey(tierKey, masterKey)),
                    salt: Array.from(tierSalt)
                };
            }

            // Create metadata
            const metadata = {
                version: '1.0.0',
                timestamp: Date.now(),
                accessLevels: Object.keys(dataTiers).map(Number),
                algorithm: this.config.algorithm,
                keyDerivation: 'pbkdf2',
                iterations: this.config.keyDerivationIterations
            };

            // Encrypt metadata
            const metadataKey = this._deriveKey(masterKey.toString('hex'), masterSalt, 32);
            const encryptedMetadata = await this._encryptData(JSON.stringify(metadata), metadataKey);

            return {
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
        } catch (error) {
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
     * Prepare data tiers based on access levels
     * @private
     */
    _prepareDataTiers(geneticData, accessConfig) {
        const tiers = {};

        // Level 1: Basic metadata and aggregate statistics
        tiers[1] = {
            type: 'basic',
            totalVariants: geneticData.variants ? geneticData.variants.length : 0,
            totalGenes: geneticData.genes ? geneticData.genes.length : 0,
            dataTypes: Object.keys(geneticData),
            generalStats: this._calculateBasicStats(geneticData),
            timestamp: Date.now()
        };

        // Level 2: Partial data with filtered information
        tiers[2] = {
            type: 'detailed',
            ...tiers[1],
            filteredVariants: this._filterSensitiveData(geneticData.variants || [], 'medium'),
            geneList: geneticData.genes ? geneticData.genes.map(g => ({
                symbol: g.symbol,
                name: g.name,
                chromosome: g.chromosome
            })) : [],
            phenotypes: geneticData.phenotypes || []
        };

        // Level 3: Full access to all data
        tiers[3] = {
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
     * Calculate basic statistics for genetic data
     * @private
     */
    _calculateBasicStats(geneticData) {
        const stats = {
            variantTypes: {},
            chromosomeDistribution: {},
            qualityMetrics: {}
        };

        if (geneticData.variants) {
            geneticData.variants.forEach(variant => {
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

        return stats;
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
