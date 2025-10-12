// src/zk-proofs/verifiers/proof-verifier.js
// Client-side verification of zero-knowledge proofs
// Validates proofs before submitting to blockchain for gas efficiency

import { createHash } from 'crypto';
import { ProofUtils } from '../utils/proof-utils.js';

/**
 * Verifies zero-knowledge proofs for genetic data
 * Handles all proof types defined in verification.clar
 */
export class ProofVerifier {
    constructor() {
        this.PROOF_TYPES = {
            GENE_PRESENCE: 1,
            GENE_ABSENCE: 2,
            GENE_VARIANT: 3,
            AGGREGATE: 4
        };
    }

    /**
     * Verify a proof of any type
     * @param {Object} proof - The proof object to verify
     * @param {Object} publicInputs - The public inputs that should match the proof
     * @param {Object} options - Verification options
     * @returns {Promise<Object>} Verification result with details
     */
    async verifyProof(proof, publicInputs, options = {}) {
        try {
            // Basic structural validation
            const structuralCheck = this._validateProofStructure(proof);
            if (!structuralCheck.valid) {
                return structuralCheck;
            }

            // Route to specific verifier based on proof type
            let result;
            switch (proof.proofType) {
                case this.PROOF_TYPES.GENE_PRESENCE:
                    result = await this._verifyGenePresenceProof(proof, publicInputs, options);
                    break;
                case this.PROOF_TYPES.GENE_ABSENCE:
                    result = await this._verifyGeneAbsenceProof(proof, publicInputs, options);
                    break;
                case this.PROOF_TYPES.GENE_VARIANT:
                    result = await this._verifyGeneVariantProof(proof, publicInputs, options);
                    break;
                case this.PROOF_TYPES.AGGREGATE:
                    result = await this._verifyAggregateProof(proof, publicInputs, options);
                    break;
                default:
                    return {
                        valid: false,
                        error: `Unsupported proof type: ${proof.proofType}`,
                        details: null
                    };
            }

            // Additional security checks
            if (result.valid && options.strictMode) {
                const securityCheck = await this._performSecurityChecks(proof, publicInputs);
                if (!securityCheck.valid) {
                    return securityCheck;
                }
            }

            return result;
        } catch (error) {
            return {
                valid: false,
                error: `Verification failed: ${error.message}`,
                details: null
            };
        }
    }

    /**
     * Validate basic proof structure
     * @private
     */
    _validateProofStructure(proof) {
        // Check required fields
        const requiredFields = ['proofType', 'proofHash', 'parameters'];
        for (const field of requiredFields) {
            if (!proof[field]) {
                return {
                    valid: false,
                    error: `Missing required field: ${field}`,
                    details: null
                };
            }
        }

        // Validate proof hash format (should be 32 bytes)
        if (!Array.isArray(proof.proofHash) || proof.proofHash.length !== 32) {
            return {
                valid: false,
                error: 'Invalid proof hash format: must be 32-byte array',
                details: null
            };
        }

        // Validate parameters format (should be 256 bytes)
        if (!Array.isArray(proof.parameters) || proof.parameters.length !== 256) {
            return {
                valid: false,
                error: 'Invalid parameters format: must be 256-byte array',
                details: null
            };
        }

        // Validate proof type
        const validTypes = Object.values(this.PROOF_TYPES);
        if (!validTypes.includes(proof.proofType)) {
            return {
                valid: false,
                error: `Invalid proof type: ${proof.proofType}`,
                details: null
            };
        }

        return { valid: true };
    }

    /**
     * Verify gene presence proof
     * @private
     */
    async _verifyGenePresenceProof(proof, publicInputs, options) {
        try {
            // Parse parameters
            const params = this._parseParameters(proof.parameters);
            
            // Validate expected target gene
            if (publicInputs.targetGene) {
                const expectedGeneHash = createHash('sha256').update(publicInputs.targetGene).digest();
                const paramGeneHash = Buffer.from(params.targetGeneHash);
                
                if (!expectedGeneHash.equals(paramGeneHash)) {
                    return {
                        valid: false,
                        error: 'Target gene mismatch',
                        details: { expected: publicInputs.targetGene, found: 'hash_mismatch' }
                    };
                }
            }

            // Verify timestamp freshness
            if (options.maxAge) {
                const proofAge = Date.now() / 1000 - params.timestamp;
                if (proofAge > options.maxAge) {
                    return {
                        valid: false,
                        error: `Proof too old: ${proofAge}s > ${options.maxAge}s`,
                        details: { age: proofAge }
                    };
                }
            }

            // Verify algorithm version
            if (params.algorithm !== 'simplified-zk-snark') {
                return {
                    valid: false,
                    error: `Unsupported algorithm: ${params.algorithm}`,
                    details: null
                };
            }

            return {
                valid: true,
                error: null,
                details: {
                    algorithm: params.algorithm,
                    version: params.version,
                    timestamp: params.timestamp,
                    privacyLevel: params.options.privacyLevel
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: `Gene presence verification failed: ${error.message}`,
                details: null
            };
        }
    }

    /**
     * Verify gene absence proof
     * @private
     */
    async _verifyGeneAbsenceProof(proof, publicInputs, options) {
        try {
            // Parse parameters
            const params = this._parseParameters(proof.parameters);
            
            // Similar validation as presence proof but for absence
            if (publicInputs.targetGene) {
                const expectedGeneHash = createHash('sha256').update(publicInputs.targetGene).digest();
                const paramGeneHash = Buffer.from(params.targetGeneHash);
                
                if (!expectedGeneHash.equals(paramGeneHash)) {
                    return {
                        valid: false,
                        error: 'Target gene mismatch for absence proof',
                        details: { expected: publicInputs.targetGene, found: 'hash_mismatch' }
                    };
                }
            }

            // Verify algorithm is appropriate for absence proofs
            if (params.algorithm !== 'simplified-zk-snark-absence') {
                return {
                    valid: false,
                    error: `Unsupported algorithm for absence proof: ${params.algorithm}`,
                    details: null
                };
            }

            return {
                valid: true,
                error: null,
                details: {
                    algorithm: params.algorithm,
                    version: params.version,
                    timestamp: params.timestamp,
                    privacyLevel: params.options?.privacyLevel
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: `Gene absence verification failed: ${error.message}`,
                details: null
            };
        }
    }

    /**
     * Verify gene variant proof
     * @private
     */
    async _verifyGeneVariantProof(proof, publicInputs, options) {
        try {
            // Parse parameters
            const params = this._parseParameters(proof.parameters);
            
            // Validate variant information
            if (publicInputs.targetVariant) {
                const expectedVariantHash = this._createVariantHash(publicInputs.targetVariant);
                const paramVariantHash = Buffer.from(params.variantHash);
                
                if (!expectedVariantHash.equals(paramVariantHash)) {
                    return {
                        valid: false,
                        error: 'Target variant mismatch',
                        details: { expected: publicInputs.targetVariant, found: 'hash_mismatch' }
                    };
                }

                // Check variant type matches
                if (params.variantType !== publicInputs.targetVariant.type) {
                    return {
                        valid: false,
                        error: 'Variant type mismatch',
                        details: { 
                            expected: publicInputs.targetVariant.type, 
                            found: params.variantType 
                        }
                    };
                }
            }

            // Verify algorithm
            if (params.algorithm !== 'simplified-zk-snark-variant') {
                return {
                    valid: false,
                    error: `Unsupported algorithm: ${params.algorithm}`,
                    details: null
                };
            }

            // Check confidence threshold if specified
            if (options.minConfidence && params.options.confidenceThreshold < options.minConfidence) {
                return {
                    valid: false,
                    error: `Confidence threshold too low: ${params.options.confidenceThreshold} < ${options.minConfidence}`,
                    details: { confidence: params.options.confidenceThreshold }
                };
            }

            return {
                valid: true,
                error: null,
                details: {
                    algorithm: params.algorithm,
                    version: params.version,
                    variantType: params.variantType,
                    timestamp: params.timestamp,
                    confidence: params.options.confidenceThreshold
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: `Gene variant verification failed: ${error.message}`,
                details: null
            };
        }
    }

    /**
     * Verify aggregate proof
     * @private
     */
    async _verifyAggregateProof(proof, publicInputs, options) {
        try {
            // Parse parameters
            const params = this._parseParameters(proof.parameters);
            
            // Validate query information
            if (publicInputs.aggregateQuery) {
                const expectedQueryHash = this._createQueryHash(publicInputs.aggregateQuery);
                const paramQueryHash = Buffer.from(params.queryHash);
                
                if (!expectedQueryHash.equals(paramQueryHash)) {
                    return {
                        valid: false,
                        error: 'Aggregate query mismatch',
                        details: { expected: publicInputs.aggregateQuery, found: 'hash_mismatch' }
                    };
                }

                // Check statistic type matches
                if (params.statisticType !== publicInputs.aggregateQuery.statistic) {
                    return {
                        valid: false,
                        error: 'Statistic type mismatch',
                        details: { 
                            expected: publicInputs.aggregateQuery.statistic, 
                            found: params.statisticType 
                        }
                    };
                }
            }

            // Verify algorithm
            if (params.algorithm !== 'simplified-zk-snark-aggregate') {
                return {
                    valid: false,
                    error: `Unsupported algorithm: ${params.algorithm}`,
                    details: null
                };
            }

            // Validate data size makes sense
            if (params.dataSize <= 0) {
                return {
                    valid: false,
                    error: 'Invalid data size in proof',
                    details: { dataSize: params.dataSize }
                };
            }

            return {
                valid: true,
                error: null,
                details: {
                    algorithm: params.algorithm,
                    version: params.version,
                    statisticType: params.statisticType,
                    dataSize: params.dataSize,
                    timestamp: params.timestamp,
                    confidence: params.options.confidenceLevel
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: `Aggregate proof verification failed: ${error.message}`,
                details: null
            };
        }
    }

    /**
     * Parse parameters from byte array
     * @private
     */
    _parseParameters(parametersArray) {
        try {
            const buffer = Buffer.from(parametersArray);
            const paramString = buffer.toString('utf8').replace(/\0+$/, '');
            return JSON.parse(paramString);
        } catch (error) {
            throw new Error(`Parameter parsing failed: ${error.message}`);
        }
    }

    /**
     * Create variant hash for comparison
     * @private
     */
    _createVariantHash(variant) {
        const hashData = {
            gene: variant.gene,
            type: variant.type,
            rsId: variant.rsId || null,
            position: variant.position || null,
            allele: variant.allele || null,
            chromosome: variant.chromosome || null
        };
        return createHash('sha256').update(JSON.stringify(hashData)).digest();
    }

    /**
     * Create query hash for comparison
     * @private
     */
    _createQueryHash(query) {
        const hashData = {
            type: query.type,
            statistic: query.statistic,
            threshold: query.threshold || null,
            range: query.range || null,
            filters: query.filters || null,
            targetGenes: query.targetGenes || null,
            targetVariant: query.targetVariant || null
        };
        return createHash('sha256').update(JSON.stringify(hashData)).digest();
    }

    /**
     * Perform additional security checks in strict mode
     * @private
     */
    async _performSecurityChecks(proof, publicInputs) {
        try {
            // Check for replay attacks by examining proof uniqueness
            const proofSignature = createHash('sha256')
                .update(Buffer.from(proof.proofHash))
                .update(Buffer.from(proof.parameters))
                .digest();

            // In a real implementation, this would check against a database
            // of previously used proofs to prevent replay attacks
            
            // Verify proof freshness (not older than 1 hour by default)
            const params = this._parseParameters(proof.parameters);
            const maxAge = 3600; // 1 hour
            const proofAge = Date.now() / 1000 - params.timestamp;
            
            if (proofAge > maxAge) {
                return {
                    valid: false,
                    error: `Proof too old for security requirements: ${proofAge}s`,
                    details: { maxAllowedAge: maxAge }
                };
            }

            // Additional entropy check
            const entropy = this._calculateEntropy(proof.proofHash);
            if (entropy < 6.0) { // Minimum entropy threshold
                return {
                    valid: false,
                    error: 'Insufficient proof entropy - possible weakness',
                    details: { entropy, minRequired: 6.0 }
                };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: `Security check failed: ${error.message}`,
                details: null
            };
        }
    }

    /**
     * Calculate Shannon entropy of proof hash
     * @private
     */
    _calculateEntropy(hashArray) {
        const counts = {};
        hashArray.forEach(byte => {
            counts[byte] = (counts[byte] || 0) + 1;
        });

        let entropy = 0;
        const total = hashArray.length;
        Object.values(counts).forEach(count => {
            const probability = count / total;
            entropy -= probability * Math.log2(probability);
        });

        return entropy;
    }

    /**
     * Batch verify multiple proofs
     * @param {Array} proofs - Array of proof objects
     * @param {Array} publicInputsArray - Array of corresponding public inputs
     * @param {Object} options - Verification options
     * @returns {Promise<Array>} Array of verification results
     */
    async batchVerifyProofs(proofs, publicInputsArray, options = {}) {
        const results = [];
        
        for (let i = 0; i < proofs.length; i++) {
            try {
                const result = await this.verifyProof(
                    proofs[i], 
                    publicInputsArray[i] || {}, 
                    options
                );
                results.push({ index: i, ...result });
            } catch (error) {
                results.push({
                    index: i,
                    valid: false,
                    error: `Batch verification failed: ${error.message}`,
                    details: null
                });
            }
        }
        
        return results;
    }

    /**
     * Get verification statistics
     * @param {Array} verificationResults - Results from batch verification
     * @returns {Object} Statistics about the verification results
     */
    getVerificationStats(verificationResults) {
        const total = verificationResults.length;
        const valid = verificationResults.filter(r => r.valid).length;
        const invalid = total - valid;
        
        const errorTypes = {};
        verificationResults.filter(r => !r.valid).forEach(r => {
            errorTypes[r.error] = (errorTypes[r.error] || 0) + 1;
        });

        return {
            total,
            valid,
            invalid,
            successRate: total > 0 ? (valid / total) * 100 : 0,
            errorTypes
        };
    }
}
