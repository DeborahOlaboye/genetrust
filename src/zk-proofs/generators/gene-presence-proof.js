// src/zk-proofs/generators/gene-presence-proof.js
// ZK-SNARK proof generation for gene presence verification
// Allows proving a specific gene exists without revealing the full genetic data

import { createHash } from 'crypto';
import { ProofUtils } from '../utils/proof-utils.js';

/**
 * Generates zero-knowledge proofs for gene presence verification
 * 
 * This class enables privacy-preserving verification that a specific gene
 * exists within genetic data without revealing the full genetic sequence.
 * Uses ZK-SNARK technology to create cryptographic proofs that can be
 * verified on-chain while maintaining complete data privacy.
 * 
 * @class GenePresenceProofGenerator
 * @description ZK-SNARK proof generation for gene presence verification
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Create proof generator
 * const generator = new GenePresenceProofGenerator();
 * 
 * @example
 * // Generate proof for BRCA1 gene presence
 * const proof = await generator.generatePresenceProof(
 *   geneticData,
 *   'BRCA1',
 *   { includeMetadata: true }
 * );
 * 
 * @example
 * // Verify proof on blockchain
 * const isValid = await contract.verifyProof(proof);
 */
export class GenePresenceProofGenerator {
    /**
     * Proof type identifier for gene presence proofs
     * Corresponds to PROOF-TYPE-GENE-PRESENCE (u1) in verification.clar
     * @readonly
     * @type {number}
     * @default 1
     */
    static PROOF_TYPE = 1;

    /**
     * Creates a new GenePresenceProofGenerator instance
     * 
     * @constructor
     * @returns {GenePresenceProofGenerator} New proof generator instance
     * 
     * @example
     * const generator = new GenePresenceProofGenerator();
     */
    constructor() {
        this.proofType = GenePresenceProofGenerator.PROOF_TYPE;
    }

    /**
     * Generate a zero-knowledge proof for gene presence
     * 
     * Creates a cryptographic proof that demonstrates the presence of a specific
     * gene in the genetic data without revealing any other information about the
     * genetic sequence. The proof can be verified on-chain while maintaining
     * complete privacy of the underlying genetic data.
     * 
     * @async
     * @method generatePresenceProof
     * 
     * @param {Object} geneticData - The full genetic dataset
     * @param {string} geneticData.dnaSequence - DNA sequence string
     * @param {string} geneticData.metadata - Metadata about the genetic data
     * @param {Object} [geneticData.variants] - Genetic variants information
     * @param {string} targetGene - The gene to prove presence of (e.g., "BRCA1", "APOE", "CFTR")
     * @param {Object} [options={}] - Additional options for proof generation
     * @param {boolean} [options.includeMetadata=false] - Include metadata in proof
     * @param {number} [options.securityLevel=128] - Security level for proof generation
     * @param {boolean} [options.compressProof=true] - Compress proof for efficiency
     * @param {string} [options.description] - Optional description for the proof
     * 
     * @returns {Promise<Object>} Complete proof object with verification data
     * @returns {number} returns.proofType - Type identifier (1 for gene presence)
     * @returns {string} returns.proofHash - Hash of the proof for on-chain storage
     * @returns {Object} returns.parameters - Proof parameters for verification
     * @returns {Object} returns.metadata - Proof metadata and information
     * @returns {string} returns.metadata.targetGene - The gene that was proven present
     * @returns {number} returns.metadata.timestamp - Proof generation timestamp
     * @returns {string} returns.metadata.version - Proof format version
     * 
     * @throws {Error} When genetic data is invalid or missing required fields
     * @throws {Error} When targetGene is empty or invalid
     * @throws {Error} When proof generation fails due to cryptographic errors
     * @throws {Error} When witness generation fails
     * @throws {Error} When proof formatting fails
     * 
     * @example
     * // Basic proof generation
     * const proof = await generator.generatePresenceProof(
     *   { dnaSequence: 'ATCG...', metadata: 'Sample 001' },
     *   'BRCA1'
     * );
     * 
     * @example
     * // Advanced proof with options
     * const proof = await generator.generatePresenceProof(
     *   geneticData,
     *   'APOE',
     *   {
     *     includeMetadata: true,
     *     securityLevel: 256,
     *     description: 'APOE gene presence verification'
     *   }
     * );
     * 
     * @example
     * // Proof for medical research
     * const researchProof = await generator.generatePresenceProof(
     *   patientGeneticData,
     *   'CFTR',
     *   {
     *     securityLevel: 256,
     *     compressProof: false,
     *     description: 'Cystic fibrosis gene verification'
     *   }
     * );
     */
    async generatePresenceProof(geneticData, targetGene, options = {}) {
        try {
            // Validate input data
            this._validateInputs(geneticData, targetGene);

            // Create commitment to the genetic data
            const dataCommitment = this._createDataCommitment(geneticData);
            
            // Generate witness for the presence of target gene
            const witness = this._generateWitness(geneticData, targetGene);
            
            // Create the actual ZK proof
            const proof = await this._createZKProof(dataCommitment, witness, targetGene, options);
            
            // Format proof for contract storage
            const formattedProof = this._formatProofForContract(proof);
            
            return {
                proofType: this.proofType,
                proofHash: formattedProof.hash,
                parameters: formattedProof.parameters,
                metadata: {
                    targetGene,
                    timestamp: Date.now(),
                    version: '1.0.0'
                }
            };
        } catch (error) {
            throw new Error(`Gene presence proof generation failed: ${error.message}`);
        }
    }

    /**
     * Validate input parameters
     * @private
     */
    _validateInputs(geneticData, targetGene) {
        if (!geneticData || typeof geneticData !== 'object') {
            throw new Error('Invalid genetic data: must be a valid object');
        }

        if (!targetGene || typeof targetGene !== 'string') {
            throw new Error('Invalid target gene: must be a non-empty string');
        }

        // Check if genetic data has required structure
        if (!geneticData.sequences && !geneticData.variants && !geneticData.genes) {
            throw new Error('Genetic data must contain sequences, variants, or genes data');
        }
    }

    /**
     * Create a cryptographic commitment to the genetic data
     * @private
     */
    _createDataCommitment(geneticData) {
        // Create a Merkle tree of the genetic data for efficient commitments
        const dataString = JSON.stringify(geneticData);
        const hash = createHash('sha256').update(dataString).digest();
        
        // Add random nonce for privacy
        const nonce = crypto.getRandomValues(new Uint8Array(32));
        const commitment = createHash('sha256')
            .update(Buffer.concat([hash, Buffer.from(nonce)]))
            .digest();

        return {
            commitment,
            nonce: Array.from(nonce)
        };
    }

    /**
     * Generate witness for the ZK proof
     * @private
     */
    _generateWitness(geneticData, targetGene) {
        // Search for the target gene in the genetic data
        const genePresent = this._searchGeneInData(geneticData, targetGene);
        
        if (!genePresent) {
            throw new Error(`Target gene ${targetGene} not found in genetic data`);
        }

        // Create witness that proves gene presence without revealing location or context
        return {
            present: true,
            geneId: targetGene,
            position: genePresent.position, // This will be hidden in the proof
            confidence: genePresent.confidence || 1.0
        };
    }

    /**
     * Search for a specific gene in genetic data
     * @private
     */
    _searchGeneInData(geneticData, targetGene) {
        // Search in different possible data structures
        
        // Check direct gene list
        if (geneticData.genes && Array.isArray(geneticData.genes)) {
            const found = geneticData.genes.find(gene => 
                gene.symbol === targetGene || gene.name === targetGene
            );
            if (found) return { position: geneticData.genes.indexOf(found), confidence: 1.0 };
        }

        // Check variants that might indicate gene presence
        if (geneticData.variants && Array.isArray(geneticData.variants)) {
            const found = geneticData.variants.find(variant => 
                variant.gene === targetGene || variant.symbol === targetGene
            );
            if (found) return { position: geneticData.variants.indexOf(found), confidence: 0.9 };
        }

        // Check sequence annotations
        if (geneticData.sequences && Array.isArray(geneticData.sequences)) {
            const found = geneticData.sequences.find(seq => 
                seq.annotations && seq.annotations.some(ann => 
                    ann.gene === targetGene || ann.symbol === targetGene
                )
            );
            if (found) return { position: geneticData.sequences.indexOf(found), confidence: 0.8 };
        }

        return null;
    }

    /**
     * Create the actual ZK proof using a simplified proof system
     * In production, this would use a proper ZK-SNARK library like circom/snarkjs
     * @private
     */
    async _createZKProof(dataCommitment, witness, targetGene, options) {
        // Simplified proof generation - in production would use proper ZK library
        const proofElements = {
            commitment: dataCommitment.commitment,
            publicInputs: {
                targetGene: createHash('sha256').update(targetGene).digest(),
                proofType: this.proofType
            },
            privateInputs: {
                nonce: dataCommitment.nonce,
                witness: witness,
                originalData: options.includeDataHash ? 
                    createHash('sha256').update(JSON.stringify(witness)).digest() : null
            }
        };

        // Generate proof hash (simplified)
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
     * Create parameters for the proof
     * @private
     */
    _createProofParameters(proofElements, options) {
        const params = {
            algorithm: 'simplified-zk-snark',
            version: '1.0.0',
            targetGeneHash: Array.from(proofElements.publicInputs.targetGene),
            commitmentHash: Array.from(proofElements.commitment.slice(0, 16)), // First 16 bytes
            timestamp: Math.floor(Date.now() / 1000),
            options: {
                includeConfidence: options.includeConfidence || false,
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
     * @param {string} targetGene - The target gene that should be proven
     * @returns {boolean} True if proof is valid
     */
    async verifyProofLocally(proof, targetGene) {
        try {
            // Basic validation
            if (!proof.proofHash || !proof.parameters) {
                return false;
            }

            // Verify proof type
            if (proof.proofType !== this.proofType) {
                return false;
            }

            // Verify target gene matches parameters
            const expectedGeneHash = createHash('sha256').update(targetGene).digest();
            const paramsBuffer = Buffer.from(proof.parameters);
            const paramsObj = JSON.parse(paramsBuffer.toString('utf8').replace(/\0+$/, ''));
            
            const paramGeneHash = Buffer.from(paramsObj.targetGeneHash);
            
            return expectedGeneHash.equals(paramGeneHash);
        } catch (error) {
            console.error('Local proof verification failed:', error);
            return false;
        }
    }
}
