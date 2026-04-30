// src/utils/crypto-utils.js
// General cryptographic utilities for GeneTrust
// Provides secure key generation, hashing, and validation functions

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { createCipheriv, createDecipheriv } from 'crypto';
import { pbkdf2Sync } from 'crypto';

/**
 * Cryptographic utilities for secure operations
 */
export class CryptoUtils {
    // Constants for validation
    static VALID_ENCODINGS = ['hex', 'base64', 'buffer'];
    static VALID_ALGORITHMS = ['sha256', 'sha512'];
    static VALID_DIGESTS = ['sha256', 'sha512'];
    static MAX_KEY_LENGTH = 1024;
    static MAX_ITERATIONS = 10000000;
    static MIN_ITERATIONS = 10000;
    static AES_KEY_SIZE = 32;
    
    /**
     * Generate a cryptographically secure random key
     * @param {number} length - Key length in bytes
     * @param {string} encoding - Output encoding ('hex', 'base64', 'buffer')
     * @returns {string|Buffer} Generated key
     * @throws {Error} If length is not a positive integer
     * @throws {Error} If encoding is not supported
     */
    static generateSecureKey(length = 32, encoding = 'hex') {
        // Validate length parameter
        if (!Number.isInteger(length) || length <= 0) {
            throw new Error('Length must be a positive integer');
        }
        if (length > 1024) {
            throw new Error('Length exceeds maximum allowed value of 1024');
        }

        // Validate encoding parameter
        const validEncodings = ['hex', 'base64', 'buffer'];
        if (!validEncodings.includes(encoding)) {
            throw new Error(`Invalid encoding: ${encoding}. Must be one of: ${validEncodings.join(', ')}`);
        }

        const key = randomBytes(length);
        
        switch (encoding) {
            case 'hex':
                return key.toString('hex');
            case 'base64':
                return key.toString('base64');
            case 'buffer':
                return key;
        }
    }

    /**
     * Generate a secure hash using SHA-256
     * @param {string|Buffer} data - Data to hash
     * @param {string} encoding - Output encoding ('hex', 'base64', 'buffer')
     * @returns {string|Buffer} Hash value
     * @throws {Error} If data is null or undefined
     * @throws {Error} If encoding is not supported
     */
    static generateHash(data, encoding = 'hex') {
        // Validate data parameter
        if (data === null || data === undefined) {
            throw new Error('Data cannot be null or undefined');
        }

        // Validate encoding parameter
        const validEncodings = ['hex', 'base64', 'buffer'];
        if (!validEncodings.includes(encoding)) {
            throw new Error(`Invalid encoding: ${encoding}. Must be one of: ${validEncodings.join(', ')}`);
        }

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
     * @throws {Error} If data or key is null/undefined
     * @throws {Error} If algorithm is not supported
     * @throws {Error} If encoding is not supported
     */
    static generateHMAC(data, key, algorithm = 'sha256', encoding = 'hex') {
        // Validate data parameter
        if (data === null || data === undefined) {
            throw new Error('Data cannot be null or undefined');
        }

        // Validate key parameter
        if (key === null || key === undefined) {
            throw new Error('Key cannot be null or undefined');
        }

        // Validate algorithm parameter
        const validAlgorithms = ['sha256', 'sha512'];
        if (!validAlgorithms.includes(algorithm)) {
            throw new Error(`Invalid algorithm: ${algorithm}. Must be one of: ${validAlgorithms.join(', ')}`);
        }

        // Validate encoding parameter
        const validEncodings = ['hex', 'base64', 'buffer'];
        if (!validEncodings.includes(encoding)) {
            throw new Error(`Invalid encoding: ${encoding}. Must be one of: ${validEncodings.join(', ')}`);
        }

        const hmac = createHmac(algorithm, key).update(data).digest();
        
        switch (encoding) {
            case 'hex':
                return hmac.toString('hex');
            case 'base64':
                return hmac.toString('base64');
            case 'buffer':
                return hmac;
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
     * @throws {Error} If length is not a positive integer
     * @throws {Error} If encoding is not supported
     */
    static generateSalt(length = 16, encoding = 'hex') {
        // Validate length parameter
        if (!Number.isInteger(length) || length <= 0) {
            throw new Error('Length must be a positive integer');
        }
        if (length > 1024) {
            throw new Error('Length exceeds maximum allowed value of 1024');
        }

        // Validate encoding parameter
        const validEncodings = ['hex', 'base64', 'buffer'];
        if (!validEncodings.includes(encoding)) {
            throw new Error(`Invalid encoding: ${encoding}. Must be one of: ${validEncodings.join(', ')}`);
        }

        const salt = randomBytes(length);
        
        switch (encoding) {
            case 'hex':
                return salt.toString('hex');
            case 'base64':
                return salt.toString('base64');
            case 'buffer':
                return salt;
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
     * @throws {Error} If password is empty or not a string
     * @throws {Error} If salt is null/undefined
     * @throws {Error} If iterations is below minimum safe value
     * @throws {Error} If keyLength is not a positive integer
     * @throws {Error} If digest is not supported
     */
    static deriveKey(password, salt, iterations = 100000, keyLength = 32, digest = 'sha256') {
        // Validate password parameter
        if (typeof password !== 'string' || password.length === 0) {
            throw new Error('Password must be a non-empty string');
        }

        // Validate salt parameter
        if (salt === null || salt === undefined) {
            throw new Error('Salt cannot be null or undefined');
        }

        // Validate iterations parameter (minimum 10000 for security)
        if (!Number.isInteger(iterations) || iterations < 10000) {
            throw new Error('Iterations must be at least 10000 for security');
        }
        if (iterations > 10000000) {
            throw new Error('Iterations exceeds maximum allowed value of 10000000');
        }

        // Validate keyLength parameter
        if (!Number.isInteger(keyLength) || keyLength <= 0) {
            throw new Error('Key length must be a positive integer');
        }
        if (keyLength > 1024) {
            throw new Error('Key length exceeds maximum allowed value of 1024');
        }

        // Validate digest parameter
        const validDigests = ['sha256', 'sha512'];
        if (!validDigests.includes(digest)) {
            throw new Error(`Invalid digest: ${digest}. Must be one of: ${validDigests.join(', ')}`);
        }

        return pbkdf2Sync(password, salt, iterations, keyLength, digest);
    }

    /**
     * Generate a deterministic hash from multiple inputs
     * @param {Array} inputs - Array of input values
     * @param {string} separator - Separator between inputs
     * @param {string} encoding - Output encoding
     * @returns {string|Buffer} Combined hash
     * @throws {Error} If inputs is not an array
     * @throws {Error} If separator is not a string
     * @throws {Error} If encoding is not supported
     */
    static generateCombinedHash(inputs, separator = '|', encoding = 'hex') {
        // Validate inputs parameter
        if (!Array.isArray(inputs)) {
            throw new Error('Inputs must be an array');
        }
        if (inputs.length === 0) {
            throw new Error('Inputs array cannot be empty');
        }
        if (inputs.length > 10000) {
            throw new Error('Inputs array exceeds maximum allowed length of 10000');
        }

        // Validate separator parameter
        if (typeof separator !== 'string') {
            throw new Error('Separator must be a string');
        }

        // Validate encoding parameter
        const validEncodings = ['hex', 'base64', 'buffer'];
        if (!validEncodings.includes(encoding)) {
            throw new Error(`Invalid encoding: ${encoding}. Must be one of: ${validEncodings.join(', ')}`);
        }

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
     * @throws {Error} If geneticData is null or undefined
     * @throws {Error} If options is not an object
     */
    static createDataFingerprint(geneticData, options = {}) {
        // Validate geneticData parameter
        if (geneticData === null || geneticData === undefined) {
            throw new Error('Genetic data cannot be null or undefined');
        }

        // Validate options parameter
        if (typeof options !== 'object' || options === null) {
            throw new Error('Options must be an object');
        }

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
     * @throws {Error} If ownerAddress is empty or not a string
     * @throws {Error} If metadata is null or undefined
     */
    static generateDatasetId(ownerAddress, metadata, timestamp = null) {
        // Validate ownerAddress parameter
        if (typeof ownerAddress !== 'string' || ownerAddress.length === 0) {
            throw new Error('Owner address must be a non-empty string');
        }

        // Validate metadata parameter
        if (metadata === null || metadata === undefined) {
            throw new Error('Metadata cannot be null or undefined');
        }

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
     * @throws {Error} If expectedChecksum is empty or not a string
     * @throws {Error} If algorithm is not supported
     */
    static validateDataIntegrity(data, expectedChecksum, algorithm = 'sha256') {
        // Validate expectedChecksum parameter
        if (typeof expectedChecksum !== 'string' || expectedChecksum.length === 0) {
            throw new Error('Expected checksum must be a non-empty string');
        }

        // Validate algorithm parameter
        const validAlgorithms = ['sha256', 'sha512'];
        if (!validAlgorithms.includes(algorithm)) {
            throw new Error(`Invalid algorithm: ${algorithm}. Must be one of: ${validAlgorithms.join(', ')}`);
        }

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
     * @throws {Error} If length is not a positive integer
     * @throws {Error} If length exceeds maximum safe value
     */
    static generateNonce(length = 16, includeTimestamp = true) {
        // Validate length parameter
        if (!Number.isInteger(length) || length <= 0) {
            throw new Error('Length must be a positive integer');
        }
        if (length > 1024) {
            throw new Error('Length exceeds maximum allowed value of 1024');
        }

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
     * @throws {Error} If value is undefined
     * @throws {Error} If nonce is not a string when provided
     */
    static createCommitment(value, nonce = null) {
        // Validate value parameter
        if (value === undefined) {
            throw new Error('Value cannot be undefined');
        }

        // Validate nonce parameter if provided
        if (nonce !== null && typeof nonce !== 'string') {
            throw new Error('Nonce must be a string when provided');
        }

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
     * @throws {Error} If commitment is empty or not a string
     * @throws {Error} If nonce is not a string
     */
    static verifyCommitment(commitment, value, nonce) {
        // Validate commitment parameter
        if (typeof commitment !== 'string' || commitment.length === 0) {
            throw new Error('Commitment must be a non-empty string');
        }

        // Validate nonce parameter
        if (typeof nonce !== 'string' || nonce.length === 0) {
            throw new Error('Nonce must be a non-empty string');
        }

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
     * @throws {Error} If data is not a string
     * @throws {Error} If difficulty is out of safe range
     */
    static generateProofOfWork(data, difficulty = 4) {
        // Validate data parameter
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }

        // Validate difficulty parameter
        if (!Number.isInteger(difficulty) || difficulty < 1) {
            throw new Error('Difficulty must be a positive integer');
        }
        if (difficulty > 8) {
            throw new Error('Difficulty exceeds maximum allowed value of 8 to prevent excessive computation');
        }

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
     * @throws {Error} If proof is null or undefined
     * @throws {Error} If proof is missing required properties
     */
    static verifyProofOfWork(proof) {
        // Validate proof parameter
        if (proof === null || proof === undefined) {
            throw new Error('Proof cannot be null or undefined');
        }
        if (typeof proof !== 'object') {
            throw new Error('Proof must be an object');
        }

        // Validate required properties
        const requiredProps = ['data', 'nonce', 'hash', 'difficulty'];
        for (const prop of requiredProps) {
            if (!(prop in proof)) {
                throw new Error(`Proof is missing required property: ${prop}`);
            }
        }

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
     * @param {Buffer} key - Encryption key (must be 32 bytes for AES-256)
     * @param {Buffer} iv - Initialization vector
     * @returns {Object} Encrypted data with authentication tag
     * @throws {Error} If data is not a string
     * @throws {Error} If key is not a Buffer
     * @throws {Error} If key length is not 32 bytes
     */
    static encryptAESGCM(data, key, iv = null) {
        // Validate data parameter
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }

        // Validate key parameter
        if (!Buffer.isBuffer(key)) {
            throw new Error('Key must be a Buffer');
        }
        if (key.length !== 32) {
            throw new Error('Key must be exactly 32 bytes for AES-256-GCM');
        }

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
     * @param {Buffer} key - Decryption key (must be 32 bytes for AES-256)
     * @returns {string} Decrypted data
     * @throws {Error} If encryptedData is null/undefined
     * @throws {Error} If encryptedData is missing required properties
     * @throws {Error} If key is not a Buffer
     * @throws {Error} If key length is not 32 bytes
     */
    static decryptAESGCM(encryptedData, key) {
        // Validate encryptedData parameter
        if (encryptedData === null || encryptedData === undefined) {
            throw new Error('Encrypted data cannot be null or undefined');
        }
        if (typeof encryptedData !== 'object') {
            throw new Error('Encrypted data must be an object');
        }

        // Validate required properties
        const requiredProps = ['encrypted', 'iv', 'authTag'];
        for (const prop of requiredProps) {
            if (!(prop in encryptedData)) {
                throw new Error(`Encrypted data is missing required property: ${prop}`);
            }
        }

        // Validate key parameter
        if (!Buffer.isBuffer(key)) {
            throw new Error('Key must be a Buffer');
        }
        if (key.length !== 32) {
            throw new Error('Key must be exactly 32 bytes for AES-256-GCM');
        }

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
     * @throws {Error} If length is not a positive integer
     * @throws {Error} If prefix is not a string when provided
     */
    static generateApiKey(length = 32, prefix = 'gc') {
        // Validate length parameter
        if (!Number.isInteger(length) || length <= 0) {
            throw new Error('Length must be a positive integer');
        }
        if (length < 16) {
            throw new Error('Length must be at least 16 bytes for security');
        }
        if (length > 128) {
            throw new Error('Length exceeds maximum allowed value of 128');
        }

        // Validate prefix parameter
        if (prefix !== null && prefix !== undefined && typeof prefix !== 'string') {
            throw new Error('Prefix must be a string when provided');
        }

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
     * @throws {Error} If data is null or undefined
     * @throws {Error} If data is empty
     */
    static calculateEntropy(data) {
        // Validate data parameter
        if (data === null || data === undefined) {
            throw new Error('Data cannot be null or undefined');
        }

        const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

        if (bytes.length === 0) {
            throw new Error('Data cannot be empty');
        }
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
     * @throws {Error} If hashes is not an array
     * @throws {Error} If hashes array exceeds maximum size
     */
    static generateMerkleRoot(hashes) {
        // Validate hashes parameter
        if (!Array.isArray(hashes)) {
            throw new Error('Hashes must be an array');
        }
        if (hashes.length > 100000) {
            throw new Error('Hashes array exceeds maximum allowed size of 100000');
        }

        if (hashes.length === 0) {
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
     * @throws {Error} If a or b is not a string
     */
    static timingSafeEqual(a, b) {
        // Validate parameters
        if (typeof a !== 'string') {
            throw new Error('First argument must be a string');
        }
        if (typeof b !== 'string') {
            throw new Error('Second argument must be a string');
        }

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
     * @throws {Error} If data is undefined
     * @throws {Error} If privateKey is null/undefined
     */
    static signData(data, privateKey) {
        // Validate data parameter
        if (data === undefined) {
            throw new Error('Data cannot be undefined');
        }

        // Validate privateKey parameter
        if (privateKey === null || privateKey === undefined) {
            throw new Error('Private key cannot be null or undefined');
        }

        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        return this.generateHMAC(dataString, privateKey, 'sha256', 'hex');
    }

    /**
     * Verify a cryptographic signature
     * @param {any} data - Original data
     * @param {string} signature - Signature to verify
     * @param {string|Buffer} publicKey - Public key for verification
     * @returns {boolean} True if signature is valid
     * @throws {Error} If data is undefined
     * @throws {Error} If signature is empty or not a string
     * @throws {Error} If publicKey is null/undefined
     */
    static verifySignature(data, signature, publicKey) {
        // Validate data parameter
        if (data === undefined) {
            throw new Error('Data cannot be undefined');
        }

        // Validate signature parameter
        if (typeof signature !== 'string' || signature.length === 0) {
            throw new Error('Signature must be a non-empty string');
        }

        // Validate publicKey parameter
        if (publicKey === null || publicKey === undefined) {
            throw new Error('Public key cannot be null or undefined');
        }

        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const expectedSignature = this.generateHMAC(dataString, publicKey, 'sha256', 'hex');

        return this.timingSafeEqual(signature, expectedSignature);
    }
}
