// src/zk-proofs/generators/gene-variant-proof.js
// ZK-SNARK proof generation for specific gene variant verification
// Allows proving specific genetic variants exist without revealing full genetic profile

import { createHash } from 'crypto';
import { ProofUtils } from '../utils/proof-utils.js';

/**
 * Generates zero-knowledge proofs for specific gene variants
 * Proof Type: PROOF-TYPE-GENE-VARIANT (u3 in contract)
 */
export class GeneVariantProofGenerator {
    constructor() {
        this.proofType = 3; // PROOF-TYPE-GENE-VARIANT from verification.clar
    }

    /**
     * Generate a proof for a specific gene variant
     * @param {Object} geneticData - The full genetic dataset
     * @param {Object} targetVariant - The variant to prove (gene, position, allele)
     * @param {Object} options - Additional options for proof generation
     * @returns {Promise<Object>} Proof object with hash and parameters
     */
    async generateVariantProof(geneticData, targetVariant, options = {}) {
        try {
            // Validate input data
            this._validateInputs(geneticData, targetVariant);

            // Create commitment to the genetic data
            const dataCommitment = this._createDataCommitment(geneticData);
            
            // Generate witness for the specific variant
            const witness = this._generateWitness(geneticData, targetVariant);
            
            // Create the actual ZK proof
            const proof = await this._createZKProof(dataCommitment, witness, targetVariant, options);
            
            // Format proof for contract storage
            const formattedProof = this._formatProofForContract(proof);
            
            return {
                proofType: this.proofType,
                proofHash: formattedProof.hash,
                parameters: formattedProof.parameters,
                metadata: {
                    targetVariant: {
                        gene: targetVariant.gene,
                        rsId: targetVariant.rsId || null,
                        type: targetVariant.type
                    },
                    timestamp: Date.now(),
                    version: '1.0.0'
                }
            };
        } catch (error) {
            throw new Error(`Gene variant proof generation failed: ${error.message}`);
        }
    }

    /**
     * Validate input parameters
     * @private
     */
    _validateInputs(geneticData, targetVariant) {
        if (!geneticData || typeof geneticData !== 'object') {
            throw new Error('Invalid genetic data: must be a valid object');
        }

        if (!targetVariant || typeof targetVariant !== 'object') {
            throw new Error('Invalid target variant: must be a valid object');
        }

        // Validate required variant fields
        const requiredFields = ['gene', 'type'];
        for (const field of requiredFields) {
            if (!targetVariant[field]) {
                throw new Error(`Target variant missing required field: ${field}`);
            }
        }

        // Validate variant type
        const validTypes = ['SNP', 'INDEL', 'CNV', 'SV', 'STR'];
        if (!validTypes.includes(targetVariant.type)) {
            throw new Error(`Invalid variant type: ${targetVariant.type}. Must be one of: ${validTypes.join(', ')}`);
        }
    }

    /**
     * Create a cryptographic commitment to the genetic data
     * @private
     */
    _createDataCommitment(geneticData) {
        // Create structured hash of variant data specifically
        const variantData = this._extractVariantData(geneticData);
        const variantString = JSON.stringify(variantData);
        const hash = createHash('sha256').update(variantString).digest();
        
        // Add random nonce for privacy
        const nonce = crypto.getRandomValues(new Uint8Array(32));
        const commitment = createHash('sha256')
            .update(Buffer.concat([hash, Buffer.from(nonce)]))
            .digest();

        return {
            commitment,
            nonce: Array.from(nonce),
            variantCount: variantData.length
        };
    }

    /**
     * Extract variant-specific data from genetic dataset
     * @private
     */
    _extractVariantData(geneticData) {
        let variants = [];

        // Extract from direct variants array
        if (geneticData.variants && Array.isArray(geneticData.variants)) {
            variants = variants.concat(geneticData.variants);
        }

        // Extract from VCF-like structures
        if (geneticData.vcf && Array.isArray(geneticData.vcf)) {
            variants = variants.concat(geneticData.vcf);
        }

        // Extract from sequence annotations
        if (geneticData.sequences && Array.isArray(geneticData.sequences)) {
            geneticData.sequences.forEach(seq => {
                if (seq.variants) {
                    variants = variants.concat(seq.variants);
                }
            });
        }

        return variants;
    }

    /**
     * Generate witness for the ZK proof
     * @private
     */
    _generateWitness(geneticData, targetVariant) {
        const variantData = this._extractVariantData(geneticData);
        
        // Search for the specific variant
        const foundVariant = this._searchVariantInData(variantData, targetVariant);
        
        if (!foundVariant) {
            throw new Error(`Target variant not found: ${JSON.stringify(targetVariant)}`);
        }

        // Create witness that proves variant presence without revealing other variants
        return {
            present: true,
            variant: {
                gene: foundVariant.gene,
                type: foundVariant.type,
                position: foundVariant.position,
                allele: foundVariant.allele,
                rsId: foundVariant.rsId || null,
                quality: foundVariant.quality || null
            },
            index: foundVariant.index,
            confidence: foundVariant.confidence || 1.0
        };
    }

    /**
     * Search for a specific variant in genetic data
     * @private
     */
    _searchVariantInData(variantData, targetVariant) {
        for (let i = 0; i < variantData.length; i++) {
            const variant = variantData[i];
            
            // Match by gene and type at minimum
            if (variant.gene === targetVariant.gene && variant.type === targetVariant.type) {
                
                // If rsId is provided, match exactly
                if (targetVariant.rsId && variant.rsId) {
                    if (variant.rsId === targetVariant.rsId) {
                        return { ...variant, index: i, confidence: 1.0 };
                    }
                    continue;
                }

                // If position and allele are provided, match those
                if (targetVariant.position && targetVariant.allele) {
                    if (variant.position === targetVariant.position && 
                        variant.allele === targetVariant.allele) {
                        return { ...variant, index: i, confidence: 0.95 };
                    }
                    continue;
                }

                // If only position provided, match by position
                if (targetVariant.position && variant.position === targetVariant.position) {
                    return { ...variant, index: i, confidence: 0.8 };
                }

                // If chromosome and position range provided
                if (targetVariant.chromosome && targetVariant.positionRange && 
                    variant.chromosome === targetVariant.chromosome) {
                    const pos = parseInt(variant.position);
                    if (pos >= targetVariant.positionRange.start && 
                        pos <= targetVariant.positionRange.end) {
                        return { ...variant, index: i, confidence: 0.7 };
                    }
                }

                // Fuzzy match by gene and type only (lowest confidence)
                return { ...variant, index: i, confidence: 0.6 };
            }
        }

        return null;
    }

    /**
     * Create the actual ZK proof using a simplified proof system
     * @private
     */
    async _createZKProof(dataCommitment, witness, targetVariant, options) {
        // Simplified proof generation - in production would use proper ZK library
        const proofElements = {
            commitment: dataCommitment.commitment,
            publicInputs: {
                variantHash: this._createVariantHash(targetVariant),
                proofType: this.proofType,
                variantType: targetVariant.type
            },
            privateInputs: {
                nonce: dataCommitment.nonce,
                witness: witness,
                totalVariants: dataCommitment.variantCount,
                originalData: options.includeDataHash ? 
                    createHash('sha256').update(JSON.stringify(witness)).digest() : null
            }
        };

        // Generate proof hash
        const proofData = JSON.stringify(proofElements);
        const proofHash = createHash('sha256').update(proofData).digest();

        // Create proof parameters
        const parameters = this._createProofParameters(proofElements, options);

        return {
            hash: proofHash,
            parameters,
            elements: proofElements
        };
    }

    /**
     * Create a consistent hash for a variant specification
     * @private
     */
    _createVariantHash(targetVariant) {
        const hashData = {
            gene: targetVariant.gene,
            type: targetVariant.type,
            rsId: targetVariant.rsId || null,
            position: targetVariant.position || null,
            allele: targetVariant.allele || null,
            chromosome: targetVariant.chromosome || null
        };

        return createHash('sha256').update(JSON.stringify(hashData)).digest();
    }

    /**
     * Create parameters for the proof
     * @private
     */
    _createProofParameters(proofElements, options) {
        const params = {
            algorithm: 'simplified-zk-snark-variant',
            version: '1.0.0',
            variantHash: Array.from(proofElements.publicInputs.variantHash),
            variantType: proofElements.publicInputs.variantType,
            commitmentHash: Array.from(proofElements.commitment.slice(0, 16)),
            timestamp: Math.floor(Date.now() / 1000),
            options: {
                includeQuality: options.includeQuality || false,
                confidenceThreshold: options.confidenceThreshold || 0.8,
                privacyLevel: options.privacyLevel || 'high'
            }
        };

        // Convert to buffer format expected by contract (buff 256)
        const paramString = JSON.stringify(params);
        const buffer = Buffer.from(paramString, 'utf8');
        
        // Pad or truncate to exactly 256 bytes
        const result = Buffer.alloc(256);
        buffer.copy(result, 0, 0, Math.min(buffer.length, 256));
        
        return Array.from(result);
    }

    /**
     * Format proof for contract storage
     * @private
     */
    _formatProofForContract(proof) {
        // Convert hash to buff 32 format expected by contract
        const hash32 = Buffer.alloc(32);
        proof.hash.copy(hash32, 0, 0, 32);

        return {
            hash: Array.from(hash32),
            parameters: proof.parameters
        };
    }

    /**
     * Verify a generated proof locally before submitting to contract
     * @param {Object} proof - The proof object to verify
     * @param {Object} targetVariant - The target variant that should be proven
     * @returns {boolean} True if proof is valid
     */
    async verifyProofLocally(proof, targetVariant) {
        try {
            // Basic validation
            if (!proof.proofHash || !proof.parameters) {
                return false;
            }

            // Verify proof type
            if (proof.proofType !== this.proofType) {
                return false;
            }

            // Verify target variant matches parameters
            const expectedVariantHash = this._createVariantHash(targetVariant);
            const paramsBuffer = Buffer.from(proof.parameters);
            const paramsObj = JSON.parse(paramsBuffer.toString('utf8').replace(/\0+$/, ''));
            
            const paramVariantHash = Buffer.from(paramsObj.variantHash);
            
            return expectedVariantHash.equals(paramVariantHash) && 
                   paramsObj.variantType === targetVariant.type;
        } catch (error) {
            console.error('Local variant proof verification failed:', error);
            return false;
        }
    }

    /**
     * Generate proof for multiple variants at once
     * @param {Object} geneticData - The full genetic dataset
     * @param {Array} targetVariants - Array of variants to prove
     * @param {Object} options - Additional options
     * @returns {Promise<Array>} Array of proof objects
     */
    async generateMultiVariantProof(geneticData, targetVariants, options = {}) {
        const proofs = [];
        
        for (const variant of targetVariants) {
            try {
                const proof = await this.generateVariantProof(geneticData, variant, options);
                proofs.push(proof);
            } catch (error) {
                console.warn(`Failed to generate proof for variant ${JSON.stringify(variant)}: ${error.message}`);
                if (options.strict) {
                    throw error;
                }
            }
        }
        
        return proofs;
    }
}
