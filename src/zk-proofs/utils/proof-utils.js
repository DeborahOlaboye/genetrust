// src/zk-proofs/utils/proof-utils.js
// Utility functions for zero-knowledge proof operations
// Shared utilities across all proof generators and verifiers

import { createHash, randomBytes } from 'crypto';

/**
 * Utility functions for zero-knowledge proof operations
 */
export class ProofUtils {
    
    /**
     * Convert a string to a fixed-size buffer (32 bytes for hashes)
     * @param {string} input - Input string to convert
     * @param {number} size - Target buffer size (default 32)
     * @returns {Buffer} Fixed-size buffer
     */
    static stringToFixedBuffer(input, size = 32) {
        const hash = createHash('sha256').update(input).digest();
        const result = Buffer.alloc(size);
        hash.copy(result, 0, 0, Math.min(hash.length, size));
        return result;
    }

    /**
     * Convert a buffer to an array format expected by Clarity contracts
     * @param {Buffer} buffer - Input buffer
     * @returns {Array<number>} Array of bytes
     */
    static bufferToArray(buffer) {
        return Array.from(buffer);
    }

    /**
     * Convert an array back to a buffer
     * @param {Array<number>} array - Array of bytes
     * @returns {Buffer} Buffer object
     */
    static arrayToBuffer(array) {
        return Buffer.from(array);
    }

    /**
     * Generate a secure random nonce
     * @param {number} size - Size in bytes (default 32)
     * @returns {Array<number>} Random nonce as array
     */
    static generateNonce(size = 32) {
        return Array.from(randomBytes(size));
    }

    /**
     * Create a Merkle tree hash from an array of data
     * @param {Array} dataArray - Array of data to hash
     * @returns {Buffer} Merkle root hash
     */
    static createMerkleRoot(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return createHash('sha256').update('').digest();
        }

        // Convert all data to hashes
        let hashes = dataArray.map(data => {
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            return createHash('sha256').update(dataString).digest();
        });

        // Build Merkle tree
        while (hashes.length > 1) {
            const nextLevel = [];
            
            for (let i = 0; i < hashes.length; i += 2) {
                if (i + 1 < hashes.length) {
                    // Hash pair
                    const combined = Buffer.concat([hashes[i], hashes[i + 1]]);
                    nextLevel.push(createHash('sha256').update(combined).digest());
                } else {
                    // Odd number, hash with itself
                    const combined = Buffer.concat([hashes[i], hashes[i]]);
                    nextLevel.push(createHash('sha256').update(combined).digest());
                }
            }
            
            hashes = nextLevel;
        }

        return hashes[0];
    }

    /**
     * Create a commitment to data with a nonce for privacy
     * @param {any} data - Data to commit to
     * @param {Array<number>} nonce - Nonce for privacy (optional)
     * @returns {Object} Commitment object with hash and nonce
     */
    static createCommitment(data, nonce = null) {
        const actualNonce = nonce || this.generateNonce();
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const dataHash = createHash('sha256').update(dataString).digest();
        const nonceBuffer = Buffer.from(actualNonce);
        
        const commitment = createHash('sha256')
            .update(Buffer.concat([dataHash, nonceBuffer]))
            .digest();

        return {
            commitment,
            nonce: actualNonce,
            dataHash
        };
    }

    /**
     * Verify a commitment
     * @param {any} data - Original data
     * @param {Array<number>} nonce - Original nonce
     * @param {Buffer} expectedCommitment - Expected commitment hash
     * @returns {boolean} True if commitment is valid
     */
    static verifyCommitment(data, nonce, expectedCommitment) {
        try {
            const commitment = this.createCommitment(data, nonce);
            return commitment.commitment.equals(expectedCommitment);
        } catch (error) {
            return false;
        }
    }

    /**
     * Format data for contract parameters (256-byte buffer)
     * @param {Object} data - Data to format
     * @returns {Array<number>} 256-byte array for contract
     */
    static formatForContract(data) {
        const jsonString = JSON.stringify(data);
        const buffer = Buffer.from(jsonString, 'utf8');
        
        // Create exactly 256-byte array
        const result = Buffer.alloc(256);
        buffer.copy(result, 0, 0, Math.min(buffer.length, 256));
        
        return Array.from(result);
    }

    /**
     * Parse data from contract parameters
     * @param {Array<number>} paramArray - 256-byte array from contract
     * @returns {Object} Parsed data object
     */
    static parseFromContract(paramArray) {
        const buffer = Buffer.from(paramArray);
        const jsonString = buffer.toString('utf8').replace(/\0+$/, '');
        return JSON.parse(jsonString);
    }

    /**
     * Calculate hash of genetic data with privacy preservation
     * @param {Object} geneticData - Genetic data object
     * @param {Object} options - Privacy options
     * @returns {Buffer} Privacy-preserving hash
     */
    static createPrivacyPreservingHash(geneticData, options = {}) {
        const privacyLevel = options.privacyLevel || 'medium';
        
        switch (privacyLevel) {
            case 'high':
                // Only hash aggregate statistics
                return this._createHighPrivacyHash(geneticData);
            case 'medium':
                // Hash data structure without specific values
                return this._createMediumPrivacyHash(geneticData);
            case 'low':
                // Hash full data but with salt
                return this._createLowPrivacyHash(geneticData, options.salt);
            default:
                throw new Error(`Invalid privacy level: ${privacyLevel}`);
        }
    }

    /**
     * Create high privacy hash (aggregate statistics only)
     * @private
     */
    static _createHighPrivacyHash(geneticData) {
        const stats = {
            totalVariants: geneticData.variants ? geneticData.variants.length : 0,
            totalGenes: geneticData.genes ? geneticData.genes.length : 0,
            totalSequences: geneticData.sequences ? geneticData.sequences.length : 0,
            dataTypes: Object.keys(geneticData).sort(),
            timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour precision
        };
        
        return createHash('sha256').update(JSON.stringify(stats)).digest();
    }

    /**
     * Create medium privacy hash (structure without values)
     * @private
     */
    static _createMediumPrivacyHash(geneticData) {
        const structure = this._extractDataStructure(geneticData);
        return createHash('sha256').update(JSON.stringify(structure)).digest();
    }

    /**
     * Create low privacy hash (full data with salt)
     * @private
     */
    static _createLowPrivacyHash(geneticData, salt) {
        const actualSalt = salt || this.generateNonce(16);
        const dataString = JSON.stringify(geneticData);
        const saltedData = dataString + Buffer.from(actualSalt).toString('hex');
        return createHash('sha256').update(saltedData).digest();
    }

    /**
     * Extract data structure without sensitive values
     * @private
     */
    static _extractDataStructure(data, depth = 0, maxDepth = 3) {
        if (depth > maxDepth || data === null || typeof data !== 'object') {
            return typeof data;
        }

        if (Array.isArray(data)) {
            return {
                type: 'array',
                length: data.length,
                sampleStructure: data.length > 0 ? 
                    this._extractDataStructure(data[0], depth + 1, maxDepth) : null
            };
        }

        const structure = {};
        for (const [key, value] of Object.entries(data)) {
            // Skip potentially sensitive fields
            if (this._isSensitiveField(key)) {
                structure[key] = '<REDACTED>';
            } else {
                structure[key] = this._extractDataStructure(value, depth + 1, maxDepth);
            }
        }

        return structure;
    }

    /**
     * Check if a field contains sensitive information
     * @private
     */
    static _isSensitiveField(fieldName) {
        const sensitiveFields = [
            'sequence', 'allele', 'genotype', 'phenotype',
            'patient_id', 'sample_id', 'individual_id',
            'dna', 'rna', 'protein', 'mutation',
            'variant_call', 'snp_data', 'indel_data'
        ];
        
        const fieldLower = fieldName.toLowerCase();
        return sensitiveFields.some(sensitive => fieldLower.includes(sensitive));
    }

    /**
     * Validate genetic data format
     * @param {Object} geneticData - Genetic data to validate
     * @returns {Object} Validation result
     */
    static validateGeneticData(geneticData) {
        const errors = [];
        const warnings = [];

        // Basic structure validation
        if (!geneticData || typeof geneticData !== 'object') {
            errors.push('Genetic data must be a valid object');
            return { valid: false, errors, warnings };
        }

        // Check for at least one data type
        const dataTypes = ['variants', 'genes', 'sequences', 'phenotypes'];
        const hasDataType = dataTypes.some(type => 
            geneticData[type] && Array.isArray(geneticData[type]) && geneticData[type].length > 0
        );

        if (!hasDataType) {
            errors.push('Genetic data must contain at least one of: variants, genes, sequences, or phenotypes');
        }

        // Validate variants if present
        if (geneticData.variants) {
            if (!Array.isArray(geneticData.variants)) {
                errors.push('Variants must be an array');
            } else {
                geneticData.variants.forEach((variant, index) => {
                    if (!variant.type) {
                        warnings.push(`Variant at index ${index} missing type field`);
                    }
                    if (!variant.gene && !variant.chromosome) {
                        warnings.push(`Variant at index ${index} missing gene or chromosome reference`);
                    }
                });
            }
        }

        // Validate genes if present
        if (geneticData.genes) {
            if (!Array.isArray(geneticData.genes)) {
                errors.push('Genes must be an array');
            } else {
                geneticData.genes.forEach((gene, index) => {
                    if (!gene.symbol && !gene.name) {
                        warnings.push(`Gene at index ${index} missing symbol or name`);
                    }
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Generate proof metadata
     * @param {string} proofType - Type of proof
     * @param {Object} options - Additional options
     * @returns {Object} Metadata object
     */
    static generateProofMetadata(proofType, options = {}) {
        return {
            proofType,
            version: options.version || '1.0.0',
            algorithm: options.algorithm || 'simplified-zk-snark',
            timestamp: Math.floor(Date.now() / 1000),
            generator: options.generator || 'genomic-chain',
            privacyLevel: options.privacyLevel || 'high',
            validUntil: options.validFor ? 
                Math.floor(Date.now() / 1000) + options.validFor : null
        };
    }

    /**
     * Compare two hashes safely (constant time to prevent timing attacks)
     * @param {Buffer} hash1 - First hash
     * @param {Buffer} hash2 - Second hash
     * @returns {boolean} True if hashes are equal
     */
    static safeCompareHashes(hash1, hash2) {
        if (hash1.length !== hash2.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < hash1.length; i++) {
            result |= hash1[i] ^ hash2[i];
        }

        return result === 0;
    }

    /**
     * Calculate entropy of data (useful for randomness checking)
     * @param {Buffer|Array} data - Data to analyze
     * @returns {number} Shannon entropy value
     */
    static calculateEntropy(data) {
        const dataArray = Buffer.isBuffer(data) ? Array.from(data) : data;
        const counts = {};
        
        // Count occurrences
        dataArray.forEach(byte => {
            counts[byte] = (counts[byte] || 0) + 1;
        });

        // Calculate Shannon entropy
        let entropy = 0;
        const total = dataArray.length;
        
        Object.values(counts).forEach(count => {
            const probability = count / total;
            entropy -= probability * Math.log2(probability);
        });

        return entropy;
    }

    /**
     * Generate deterministic ID from genetic data
     * @param {Object} geneticData - Genetic data
     * @param {string} userAddress - User's blockchain address
     * @returns {string} Deterministic ID
     */
    static generateDataId(geneticData, userAddress) {
        const dataHash = this.createPrivacyPreservingHash(geneticData, { privacyLevel: 'medium' });
        const addressHash = createHash('sha256').update(userAddress).digest();
        const combined = Buffer.concat([dataHash, addressHash]);
        const finalHash = createHash('sha256').update(combined).digest();
        
        // Convert to a readable ID (first 16 bytes as hex)
        return finalHash.slice(0, 16).toString('hex');
    }

    /**
     * Batch process genetic data for multiple proofs
     * @param {Array} geneticDataArray - Array of genetic datasets
     * @param {Function} processor - Processing function
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed results
     */
    static async batchProcess(geneticDataArray, processor, options = {}) {
        const batchSize = options.batchSize || 10;
        const results = [];
        
        for (let i = 0; i < geneticDataArray.length; i += batchSize) {
            const batch = geneticDataArray.slice(i, i + batchSize);
            const batchPromises = batch.map(data => processor(data));
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                if (options.failFast) {
                    throw error;
                }
                console.warn(`Batch processing error for batch starting at ${i}:`, error);
                results.push(...batch.map(() => ({ error: error.message })));
            }
        }
        
        return results;
    }
}
