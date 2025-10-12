// src/utils/crypto-utils.js
// General cryptographic utilities for GenomicChain
// Provides secure key generation, hashing, and validation functions

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { createCipheriv, createDecipheriv } from 'crypto';

/**
 * Cryptographic utilities for secure operations
 */
export class CryptoUtils {
    
    /**
     * Generate a cryptographically secure random key
     * @param {number} length - Key length in bytes
     * @param {string} encoding - Output encoding ('hex', 'base64', 'buffer')
     * @returns {string|Buffer} Generated key
     */
    static generateSecureKey(length = 32, encoding = 'hex') {
        const key = randomBytes(length);
        
        switch (encoding) {
            case 'hex':
                return key.toString('hex');
            case 'base64':
                return key.toString('base64');
            case 'buffer':
                return key;
            default:
                throw new Error(`Unsupported encoding: ${encoding}`);
        }
    }

    /**
     * Generate a secure hash using SHA-256
     * @param {string|Buffer} data - Data to hash
     * @param {string} encoding - Output encoding ('hex', 'base64', 'buffer')
     * @returns {string|Buffer} Hash value
     */
    static generateHash(data, encoding = 'hex') {
        const hash = createHash('sha256').update(data).digest();
        
        switch (encoding) {
            case 'hex':
                return hash.toString('hex');
            case 'base64':
                return hash.toString('base64');
            case 'buffer':
                return hash;
            default:
                throw new Error(`Unsupported encoding: ${encoding}`);
        }
    }

    /**
     * Generate HMAC for data integrity verification
     * @param {string|Buffer} data - Data to authenticate
     * @param {string|Buffer} key - Secret key
     * @param {string} algorithm - Hash algorithm ('sha256', 'sha512')
     * @param {string} encoding - Output encoding
     * @returns {string|Buffer} HMAC value
     */
    static generateHMAC(data, key, algorithm = 'sha256', encoding = 'hex') {
        const hmac = createHmac(algorithm, key).update(data).digest();
        
        switch (encoding) {
            case 'hex':
                return hmac.toString('hex');
            case 'base64':
                return hmac.toString('base64');
            case 'buffer':
                return hmac;
            default:
                throw new Error(`Unsupported encoding: ${encoding}`);
        }
    }

    /**
     * Verify HMAC for data integrity
     * @param {string|Buffer} data - Original data
     * @param {string|Buffer} key - Secret key
     * @param {string|Buffer} expectedHmac - Expected HMAC value
     * @param {string} algorithm - Hash algorithm
     * @returns {boolean} True if HMAC is valid
     */
    static verifyHMAC(data, key, expectedHmac, algorithm = 'sha256') {
        try {
            const computedHmac = createHmac(algorithm, key).update(data).digest();
            const expectedBuffer = Buffer.isBuffer(expectedHmac) ? 
                expectedHmac : Buffer.from(expectedHmac, 'hex');
            
            return timingSafeEqual(computedHmac, expectedBuffer);
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate a cryptographic salt
     * @param {number} length - Salt length in bytes
     * @param {string} encoding - Output encoding
     * @returns {string|Buffer} Generated salt
     */
    static generateSalt(length = 16, encoding = 'hex') {
        const salt = randomBytes(length);
        
        switch (encoding) {
            case 'hex':
                return salt.toString('hex');
            case 'base64':
                return salt.toString('base64');
            case 'buffer':
                return salt;
            default:
                throw new Error(`Unsupported encoding: ${encoding}`);
        }
    }

    /**
     * Derive a key from a password using PBKDF2
     * @param {string} password - Input password
     * @param {string|Buffer} salt - Salt value
     * @param {number} iterations - Number of iterations
     * @param {number} keyLength - Desired key length in bytes
     * @param {string} digest - Hash function ('sha256', 'sha512')
     * @returns {Buffer} Derived key
     */
    static deriveKey(password, salt, iterations = 100000, keyLength = 32, digest = 'sha256') {
        const crypto = require('crypto');
        return crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest);
    }

    /**
     * Generate a deterministic hash from multiple inputs
     * @param {Array} inputs - Array of input values
     * @param {string} separator - Separator between inputs
     * @param {string} encoding - Output encoding
     * @returns {string|Buffer} Combined hash
     */
    static generateCombinedHash(inputs, separator = '|', encoding = 'hex') {
        const combined = inputs.map(input => 
            typeof input === 'string' ? input : JSON.stringify(input)
        ).join(separator);
        
        return this.generateHash(combined, encoding);
    }

    /**
     * Create a digital fingerprint for genetic data
     * @param {Object} geneticData - Genetic data object
     * @param {Object} options - Fingerprinting options
     * @returns {string} Data fingerprint
     */
    static createDataFingerprint(geneticData, options = {}) {
        const fingerprintData = {
            structure: this._extractStructuralFingerprint(geneticData),
            content: options.includeContent ? 
                this._extractContentFingerprint(geneticData) : null,
            timestamp: options.includeTimestamp ? Date.now() : null,
            version: options.version || '1.0'
        };

        return this.generateHash(JSON.stringify(fingerprintData));
    }

    /**
     * Extract structural fingerprint (data shape without content)
     * @private
     */
    static _extractStructuralFingerprint(data, depth = 0, maxDepth = 3) {
        if (depth > maxDepth || data === null || typeof data !== 'object') {
            return typeof data;
        }

        if (Array.isArray(data)) {
            return {
                type: 'array',
                length: data.length,
                structure: data.length > 0 ? 
                    this._extractStructuralFingerprint(data[0], depth + 1, maxDepth) : null
            };
        }

        const structure = {};
        Object.keys(data).sort().forEach(key => {
            structure[key] = this._extractStructuralFingerprint(data[key], depth + 1, maxDepth);
        });

        return structure;
    }

    /**
     * Extract content fingerprint (includes actual data)
     * @private
     */
    static _extractContentFingerprint(data) {
        if (typeof data === 'object' && data !== null) {
            // Create a sorted version for consistent hashing
            const sortedKeys = Object.keys(data).sort();
            const sortedData = {};
            sortedKeys.forEach(key => {
                sortedData[key] = data[key];
            });
            return this.generateHash(JSON.stringify(sortedData));
        }
        
        return this.generateHash(String(data));
    }

    /**
     * Generate a unique identifier for datasets
     * @param {string} ownerAddress - Owner's blockchain address
     * @param {Object} metadata - Dataset metadata
     * @param {number} timestamp - Optional timestamp
     * @returns {string} Unique dataset ID
     */
    static generateDatasetId(ownerAddress, metadata, timestamp = null) {
        const components = [
            ownerAddress,
            JSON.stringify(metadata),
            timestamp || Date.now()
        ];

        const combinedHash = this.generateCombinedHash(components);
        
        // Return first 16 characters for readability
        return combinedHash.substring(0, 16);
    }

    /**
     * Validate data integrity using checksum
     * @param {any} data - Data to validate
     * @param {string} expectedChecksum - Expected checksum
     * @param {string} algorithm - Hash algorithm
     * @returns {boolean} True if data is intact
     */
    static validateDataIntegrity(data, expectedChecksum, algorithm = 'sha256') {
        try {
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            const computedChecksum = createHash(algorithm).update(dataString).digest('hex');
            
            return computedChecksum === expectedChecksum;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate a secure nonce for cryptographic operations
     * @param {number} length - Nonce length in bytes
     * @param {boolean} includeTimestamp - Include timestamp for uniqueness
     * @returns {string} Generated nonce
     */
    static generateNonce(length = 16, includeTimestamp = true) {
        const randomPart = randomBytes(length).toString('hex');
        
        if (includeTimestamp) {
            const timestamp = Date.now().toString(16);
            return `${timestamp}_${randomPart}`;
        }
        
        return randomPart;
    }

    /**
     * Create a commitment scheme for hiding values
     * @param {any} value - Value to commit to
     * @param {string} nonce - Random nonce
     * @returns {Object} Commitment and decommitment data
     */
    static createCommitment(value, nonce = null) {
        const actualNonce = nonce || this.generateNonce();
        const valueString = typeof value === 'string' ? value : JSON.stringify(value);
        const commitment = this.generateHash(`${valueString}${actualNonce}`);

        return {
            commitment,
            nonce: actualNonce,
            value: valueString
        };
    }

    /**
     * Verify a commitment
     * @param {string} commitment - Original commitment
     * @param {any} value - Claimed value
     * @param {string} nonce - Nonce used in commitment
     * @returns {boolean} True if commitment is valid
     */
    static verifyCommitment(commitment, value, nonce) {
        try {
            const valueString = typeof value === 'string' ? value : JSON.stringify(value);
            const computedCommitment = this.generateHash(`${valueString}${nonce}`);
            
            return commitment === computedCommitment;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate a proof of work (simple implementation)
     * @param {string} data - Data to create proof for
     * @param {number} difficulty - Number of leading zeros required
     * @returns {Object} Proof of work result
     */
    static generateProofOfWork(data, difficulty = 4) {
        const target = '0'.repeat(difficulty);
        let nonce = 0;
        let hash;

        do {
            hash = this.generateHash(`${data}${nonce}`);
            nonce++;
        } while (!hash.startsWith(target));

        return {
            data,
            nonce: nonce - 1,
            hash,
            difficulty
        };
    }

    /**
     * Verify proof of work
     * @param {Object} proof - Proof of work object
     * @returns {boolean} True if proof is valid
     */
    static verifyProofOfWork(proof) {
        try {
            const { data, nonce, hash, difficulty } = proof;
            const target = '0'.repeat(difficulty);
            const computedHash = this.generateHash(`${data}${nonce}`);
            
            return computedHash === hash && hash.startsWith(target);
        } catch (error) {
            return false;
        }
    }

    /**
     * Encrypt data with AES-GCM
     * @param {string} data - Data to encrypt
     * @param {Buffer} key - Encryption key
     * @param {Buffer} iv - Initialization vector
     * @returns {Object} Encrypted data with authentication tag
     */
    static encryptAESGCM(data, key, iv = null) {
        const actualIv = iv || randomBytes(16);
        const cipher = createCipheriv('aes-256-gcm', key, actualIv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: actualIv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Decrypt data with AES-GCM
     * @param {Object} encryptedData - Encrypted data object
     * @param {Buffer} key - Decryption key
     * @returns {string} Decrypted data
     */
    static decryptAESGCM(encryptedData, key) {
        const { encrypted, iv, authTag } = encryptedData;
        
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * Generate a secure API key
     * @param {number} length - Key length
     * @param {string} prefix - Optional prefix
     * @returns {string} Generated API key
     */
    static generateApiKey(length = 32, prefix = 'gc') {
        const randomPart = this.generateSecureKey(length, 'hex');
        return prefix ? `${prefix}_${randomPart}` : randomPart;
    }

    /**
     * Validate API key format
     * @param {string} apiKey - API key to validate
     * @param {string} expectedPrefix - Expected prefix
     * @returns {boolean} True if format is valid
     */
    static validateApiKeyFormat(apiKey, expectedPrefix = 'gc') {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        if (expectedPrefix) {
            if (!apiKey.startsWith(`${expectedPrefix}_`)) {
                return false;
            }
            
            const keyPart = apiKey.substring(expectedPrefix.length + 1);
            return /^[a-f0-9]+$/i.test(keyPart) && keyPart.length >= 32;
        }

        return /^[a-f0-9]+$/i.test(apiKey) && apiKey.length >= 32;
    }

    /**
     * Calculate entropy of data
     * @param {string|Buffer} data - Data to analyze
     * @returns {number} Shannon entropy
     */
    static calculateEntropy(data) {
        const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const counts = new Array(256).fill(0);
        
        // Count byte frequencies
        for (const byte of bytes) {
            counts[byte]++;
        }
        
        // Calculate Shannon entropy
        let entropy = 0;
        const length = bytes.length;
        
        for (const count of counts) {
            if (count > 0) {
                const probability = count / length;
                entropy -= probability * Math.log2(probability);
            }
        }
        
        return entropy;
    }

    /**
     * Generate a merkle tree root from an array of hashes
     * @param {Array<string>} hashes - Array of hash values
     * @returns {string} Merkle root hash
     */
    static generateMerkleRoot(hashes) {
        if (!hashes || hashes.length === 0) {
            return this.generateHash('');
        }

        if (hashes.length === 1) {
            return hashes[0];
        }

        const newHashes = [];
        
        for (let i = 0; i < hashes.length; i += 2) {
            if (i + 1 < hashes.length) {
                // Hash pair
                newHashes.push(this.generateHash(hashes[i] + hashes[i + 1]));
            } else {
                // Odd number, hash with itself
                newHashes.push(this.generateHash(hashes[i] + hashes[i]));
            }
        }
        
        return this.generateMerkleRoot(newHashes);
    }

    /**
     * Timing-safe string comparison
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} True if strings are equal
     */
    static timingSafeEqual(a, b) {
        try {
            const bufferA = Buffer.from(a);
            const bufferB = Buffer.from(b);
            
            return timingSafeEqual(bufferA, bufferB);
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate a cryptographic signature for data
     * @param {any} data - Data to sign
     * @param {string|Buffer} privateKey - Private key for signing
     * @returns {string} Generated signature
     */
    static signData(data, privateKey) {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        return this.generateHMAC(dataString, privateKey, 'sha256', 'hex');
    }

    /**
     * Verify a cryptographic signature
     * @param {any} data - Original data
     * @param {string} signature - Signature to verify
     * @param {string|Buffer} publicKey - Public key for verification
     * @returns {boolean} True if signature is valid
     */
    static verifySignature(data, signature, publicKey) {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const expectedSignature = this.generateHMAC(dataString, publicKey, 'sha256', 'hex');
        
        return this.timingSafeEqual(signature, expectedSignature);
    }
}
