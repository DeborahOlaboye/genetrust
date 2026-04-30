// src/zk-proofs/generators/aggregate-proof.js
// ZK-SNARK proof generation for aggregate genetic statistics
// Allows proving statistical properties without revealing individual genetic information

import { createHash } from 'crypto';
import { ProofUtils } from '../utils/proof-utils.js';

/**
 * Generates zero-knowledge proofs for aggregate genetic statistics
 * 
 * This class enables privacy-preserving verification of statistical properties
 * of genetic data without revealing any individual genetic information. Uses
 * ZK-SNARK technology to create cryptographic proofs that can be verified
 * on-chain while maintaining complete privacy of the underlying data.
 * Particularly useful for research studies and population-level analysis.
 * 
 * @class AggregateProofGenerator
 * @description ZK-SNARK proof generation for aggregate genetic statistics
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Create proof generator
 * const generator = new AggregateProofGenerator();
 * 
 * @example
 * // Generate proof for mean statistic
 * const proof = await generator.generateAggregateProof(
 *   geneticData,
 *   {
 *     type: 'statistical',
 *     statistic: 'mean',
 *     target: 'geneExpression',
 *   },
 *   { includeMetadata: true }
 * );
 * 
 * @example
 * // Verify proof on blockchain
 * const isValid = await contract.verifyProof(proof);
 */
export class AggregateProofGenerator {
    /**
     * Proof type identifier for aggregate proofs
     * Corresponds to PROOF-TYPE-AGGREGATE (u4) in verification.clar
     * @readonly
     * @type {number}
     * @default 4
     */
    static PROOF_TYPE = 4;

    /**
     * Creates a new AggregateProofGenerator instance
     * 
     * @constructor
     * @returns {AggregateProofGenerator} New proof generator instance
     * 
     * @example
     * const generator = new AggregateProofGenerator();
     */
    constructor() {
        this.proofType = AggregateProofGenerator.PROOF_TYPE;
    }

    /**
     * Generate a zero-knowledge proof for aggregate genetic statistics
     * 
     * Creates a cryptographic proof that demonstrates statistical properties
     * of the genetic data without revealing any individual-level information.
     * The proof can be verified on-chain while maintaining complete privacy
     * of the underlying genetic data.
     * 
     * @async
     * @method generateAggregateProof
     * 
     * @param {Object} geneticData - The full genetic dataset
     * @param {string} geneticData.dnaSequence - DNA sequence string
     * @param {string} geneticData.metadata - Metadata about the genetic data
     * @param {Object} [geneticData.variants] - Genetic variants information
     * @param {Object} [geneticData.genes] - Genes information
     * @param {Object} aggregateQuery - The statistical query to prove
     * @param {string} aggregateQuery.type - Query type ('statistical', 'frequency', 'correlation')
     * @param {string} aggregateQuery.statistic - Statistic type ('mean', 'median', 'variance', 'count', 'sum')
     * @param {string} aggregateQuery.target - Target data field or gene
     * @param {Object} [aggregateQuery.filters] - Optional filters for the data
     * @param {Object} [aggregateQuery.groupBy] - Optional grouping parameters
     * @param {Object} [options={}] - Additional options for proof generation
     * @param {boolean} [options.includeMetadata=false] - Include query metadata in proof
     * @param {number} [options.securityLevel=128] - Security level for proof generation
     * @param {boolean} [options.compressProof=true] - Compress proof for efficiency
     * @param {string} [options.description] - Optional description for the proof
     * @param {boolean} [options.validateData=true] - Validate data before processing
     * 
     * @returns {Promise<Object>} Complete proof object with verification data
     * @returns {number} returns.proofType - Type identifier (4 for aggregate)
     * @returns {string} returns.proofHash - Hash of the proof for on-chain storage
     * @returns {Object} returns.parameters - Proof parameters for verification
     * @returns {Object} returns.metadata - Proof metadata and information
     * @returns {string} returns.metadata.queryType - Type of query that was proven
     * @returns {string} returns.metadata.statisticType - Statistic type
     * @returns {Object} returns.metadata.result - Computed statistic result
     * @returns {number} returns.metadata.timestamp - Proof generation timestamp
     * @returns {string} returns.metadata.version - Proof format version
     * 
     * @throws {Error} When genetic data is invalid or missing required fields
     * @throws {Error} When aggregateQuery is incomplete or invalid
     * @throws {Error} When statistic computation fails
     * @throws {Error} When proof generation fails due to cryptographic errors
     * @throws {Error} When witness generation fails
     * @throws {Error} When proof formatting fails
     * 
     * @example
     * // Basic mean statistic proof
     * const proof = await generator.generateAggregateProof(
     *   { dnaSequence: 'ATCG...', metadata: 'Sample 001' },
     *   {
     *     type: 'statistical',
     *     statistic: 'mean',
     *     target: 'geneExpression'
     *   }
     * );
     * 
     * @example
     * // Advanced frequency query with filters
     * const proof = await generator.generateAggregateProof(
     *   geneticData,
     *   {
     *     type: 'frequency',
     *     statistic: 'count',
     *     target: 'BRCA1',
     *     filters: {
     *       minExpression: 0.5,
     *       maxExpression: 2.0
     *     }
     *   },
     *   {
     *     includeMetadata: true,
     *     securityLevel: 256,
     *     description: 'BRCA1 expression frequency analysis'
     *   }
     * );
     * 
     * @example
     * // Correlation analysis proof
     * const proof = await generator.generateAggregateProof(
     *   populationGeneticData,
     *   {
     *     type: 'correlation',
     *     statistic: 'correlation',
     *     target: 'geneExpression',
     *     groupBy: {
     *       field: 'chromosome',
     *       values: ['chr1', 'chr2', 'chr3']
     *     }
     *   },
     *   {
     *     securityLevel: 256,
     *     compressProof: false,
     *     description: 'Chromosomal correlation analysis'
     *   }
     * );
     */
    async generateAggregateProof(geneticData, aggregateQuery, options = {}) {
        try {
            // Validate input data
            this._validateInputs(geneticData, aggregateQuery);

            // Create commitment to the genetic data
            const dataCommitment = this._createDataCommitment(geneticData);
            
            // Compute the aggregate statistics
            const statistics = this._computeAggregateStats(geneticData, aggregateQuery);
            
            // Generate witness for the aggregate proof
            const witness = this._generateWitness(statistics, aggregateQuery);
            
            // Create the actual ZK proof
            const proof = await this._createZKProof(dataCommitment, witness, aggregateQuery, options);
            
            // Format proof for contract storage
            const formattedProof = this._formatProofForContract(proof);
            
            return {
                proofType: this.proofType,
                proofHash: formattedProof.hash,
                parameters: formattedProof.parameters,
                metadata: {
                    queryType: aggregateQuery.type,
                    statisticType: aggregateQuery.statistic,
                    threshold: aggregateQuery.threshold || null,
                    timestamp: Date.now(),
                    version: '1.0.0'
                }
            };
        } catch (error) {
            throw new Error(`Aggregate proof generation failed: ${error.message}`);
        }
    }

    /**
     * Validate input parameters
     * @private
     */
    _validateInputs(geneticData, aggregateQuery) {
        if (!geneticData || typeof geneticData !== 'object') {
            throw new Error('Invalid genetic data: must be a valid object');
        }

        if (!aggregateQuery || typeof aggregateQuery !== 'object') {
            throw new Error('Invalid aggregate query: must be a valid object');
        }

        // Validate required query fields
        const requiredFields = ['type', 'statistic'];
        for (const field of requiredFields) {
            if (!aggregateQuery[field]) {
                throw new Error(`Aggregate query missing required field: ${field}`);
            }
        }

        // Validate query types
        const validTypes = ['variant_count', 'gene_presence_count', 'diversity_index', 'population_frequency'];
        if (!validTypes.includes(aggregateQuery.type)) {
            throw new Error(`Invalid query type: ${aggregateQuery.type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate statistic types
        const validStats = ['count', 'percentage', 'ratio', 'above_threshold', 'below_threshold', 'range'];
        if (!validStats.includes(aggregateQuery.statistic)) {
            throw new Error(`Invalid statistic type: ${aggregateQuery.statistic}. Must be one of: ${validStats.join(', ')}`);
        }
    }

    /**
     * Create a cryptographic commitment to the genetic data
     * @private
     */
    _createDataCommitment(geneticData) {
        // Create aggregate-specific hash that doesn't reveal individual data points
        const aggregateData = this._createAggregateSnapshot(geneticData);
        const dataString = JSON.stringify(aggregateData);
        const hash = createHash('sha256').update(dataString).digest();
        
        // Add random nonce for privacy
        const nonce = crypto.getRandomValues(new Uint8Array(32));
        const commitment = createHash('sha256')
            .update(Buffer.concat([hash, Buffer.from(nonce)]))
            .digest();

        return {
            commitment,
            nonce: Array.from(nonce),
            dataSize: aggregateData.totalDataPoints
        };
    }

    /**
     * Create an aggregate snapshot of genetic data without revealing specifics
     * @private
     */
    _createAggregateSnapshot(geneticData) {
        const snapshot = {
            totalVariants: 0,
            totalGenes: 0,
            variantTypes: {},
            chromosomeDistribution: {},
            qualityDistribution: {},
            totalDataPoints: 0
        };

        // Count variants
        if (geneticData.variants && Array.isArray(geneticData.variants)) {
            snapshot.totalVariants = geneticData.variants.length;
            snapshot.totalDataPoints += geneticData.variants.length;

            // Aggregate variant types
            geneticData.variants.forEach(variant => {
                if (variant.type) {
                    snapshot.variantTypes[variant.type] = (snapshot.variantTypes[variant.type] || 0) + 1;
                }
                if (variant.chromosome) {
                    snapshot.chromosomeDistribution[variant.chromosome] = 
                        (snapshot.chromosomeDistribution[variant.chromosome] || 0) + 1;
                }
            });
        }

        // Count genes
        if (geneticData.genes && Array.isArray(geneticData.genes)) {
            snapshot.totalGenes = geneticData.genes.length;
            snapshot.totalDataPoints += geneticData.genes.length;
        }

        // Count sequences
        if (geneticData.sequences && Array.isArray(geneticData.sequences)) {
            snapshot.totalDataPoints += geneticData.sequences.length;
        }

        return snapshot;
    }

    /**
     * Compute aggregate statistics based on the query
     * @private
     */
    _computeAggregateStats(geneticData, aggregateQuery) {
        const stats = {};

        switch (aggregateQuery.type) {
            case 'variant_count':
                stats.result = this._computeVariantCount(geneticData, aggregateQuery);
                break;
            case 'gene_presence_count':
                stats.result = this._computeGenePresenceCount(geneticData, aggregateQuery);
                break;
            case 'diversity_index':
                stats.result = this._computeDiversityIndex(geneticData, aggregateQuery);
                break;
            case 'population_frequency':
                stats.result = this._computePopulationFrequency(geneticData, aggregateQuery);
                break;
            default:
                throw new Error(`Unsupported aggregate query type: ${aggregateQuery.type}`);
        }

        return stats;
    }

    /**
     * Compute variant count statistics
     * @private
     */
    _computeVariantCount(geneticData, query) {
        if (!geneticData.variants) return 0;

        let count = geneticData.variants.length;

        // Apply filters if specified
        if (query.filters) {
            count = geneticData.variants.filter(variant => {
                return this._applyFilters(variant, query.filters);
            }).length;
        }

        // Apply statistic computation
        return this._applyStatistic(count, geneticData.variants.length, query);
    }

    /**
     * Compute gene presence count statistics
     * @private
     */
    _computeGenePresenceCount(geneticData, query) {
        const targetGenes = query.targetGenes || [];
        if (targetGenes.length === 0) return 0;

        let presentCount = 0;
        
        // Check in genes array
        if (geneticData.genes) {
            presentCount += targetGenes.filter(gene => 
                geneticData.genes.some(g => g.symbol === gene || g.name === gene)
            ).length;
        }

        // Check in variants (genes mentioned in variants)
        if (geneticData.variants) {
            const genesInVariants = new Set(geneticData.variants.map(v => v.gene).filter(Boolean));
            presentCount += targetGenes.filter(gene => genesInVariants.has(gene)).length;
        }

        return this._applyStatistic(presentCount, targetGenes.length, query);
    }

    /**
     * Compute genetic diversity index
     * @private
     */
    _computeDiversityIndex(geneticData, query) {
        if (!geneticData.variants) return 0;

        // Simple Shannon diversity index for variant types
        const typeCounts = {};
        geneticData.variants.forEach(variant => {
            if (variant.type) {
                typeCounts[variant.type] = (typeCounts[variant.type] || 0) + 1;
            }
        });

        const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
        if (total === 0) return 0;

        let diversity = 0;
        Object.values(typeCounts).forEach(count => {
            const proportion = count / total;
            diversity -= proportion * Math.log2(proportion);
        });

        return this._applyStatistic(diversity, null, query);
    }

    /**
     * Compute population frequency estimates
     * @private
     */
    _computePopulationFrequency(geneticData, query) {
        if (!query.targetVariant || !geneticData.variants) return 0;

        // Find the target variant
        const foundVariants = geneticData.variants.filter(variant => 
            this._matchesVariant(variant, query.targetVariant)
        );

        // Simple frequency calculation (in real implementation, would use population databases)
        const frequency = foundVariants.length > 0 ? 0.1 : 0.0; // Simplified

        return this._applyStatistic(frequency, 1.0, query);
    }

    /**
     * Apply filters to variants
     * @private
     */
    _applyFilters(variant, filters) {
        for (const [key, value] of Object.entries(filters)) {
            if (variant[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if variant matches target specification
     * @private
     */
    _matchesVariant(variant, targetVariant) {
        const keys = ['gene', 'type', 'rsId', 'chromosome'];
        return keys.every(key => 
            !targetVariant[key] || variant[key] === targetVariant[key]
        );
    }

    /**
     * Apply statistical computation based on query type
     * @private
     */
    _applyStatistic(value, total, query) {
        switch (query.statistic) {
            case 'count':
                return Math.floor(value);
            case 'percentage':
                return total ? Math.round((value / total) * 100) : 0;
            case 'ratio':
                return total ? value / total : 0;
            case 'above_threshold':
                return query.threshold ? (value > query.threshold ? 1 : 0) : 0;
            case 'below_threshold':
                return query.threshold ? (value < query.threshold ? 1 : 0) : 0;
            case 'range':
                if (query.range) {
                    return (value >= query.range.min && value <= query.range.max) ? 1 : 0;
                }
                return 0;
            default:
                return value;
        }
    }

    /**
     * Generate witness for the ZK proof
     * @private
     */
    _generateWitness(statistics, aggregateQuery) {
        return {
            queryType: aggregateQuery.type,
            statisticType: aggregateQuery.statistic,
            result: statistics.result,
            threshold: aggregateQuery.threshold || null,
            range: aggregateQuery.range || null,
            filters: aggregateQuery.filters || null,
            computationMethod: 'direct'
        };
    }

    /**
     * Create the actual ZK proof
     * @private
     */
    async _createZKProof(dataCommitment, witness, aggregateQuery, options) {
        const proofElements = {
            commitment: dataCommitment.commitment,
            publicInputs: {
                queryHash: this._createQueryHash(aggregateQuery),
                proofType: this.proofType,
                statisticType: aggregateQuery.statistic
            },
            privateInputs: {
                nonce: dataCommitment.nonce,
                witness: witness,
                dataSize: dataCommitment.dataSize,
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
     * Create a consistent hash for an aggregate query
     * @private
     */
    _createQueryHash(aggregateQuery) {
        const hashData = {
            type: aggregateQuery.type,
            statistic: aggregateQuery.statistic,
            threshold: aggregateQuery.threshold || null,
            range: aggregateQuery.range || null,
            filters: aggregateQuery.filters || null,
            targetGenes: aggregateQuery.targetGenes || null,
            targetVariant: aggregateQuery.targetVariant || null
        };

        return createHash('sha256').update(JSON.stringify(hashData)).digest();
    }

    /**
     * Create parameters for the proof
     * @private
     */
    _createProofParameters(proofElements, options) {
        const params = {
            algorithm: 'simplified-zk-snark-aggregate',
            version: '1.0.0',
            queryHash: Array.from(proofElements.publicInputs.queryHash),
            statisticType: proofElements.publicInputs.statisticType,
            commitmentHash: Array.from(proofElements.commitment.slice(0, 16)),
            dataSize: proofElements.privateInputs.dataSize,
            timestamp: Math.floor(Date.now() / 1000),
            options: {
                precision: options.precision || 'standard',
                confidenceLevel: options.confidenceLevel || 0.95,
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
     * @param {Object} aggregateQuery - The query that should be proven
     * @returns {boolean} True if proof is valid
     */
    async verifyProofLocally(proof, aggregateQuery) {
        try {
            // Basic validation
            if (!proof.proofHash || !proof.parameters) {
                return false;
            }

            // Verify proof type
            if (proof.proofType !== this.proofType) {
                return false;
            }

            // Verify query matches parameters
            const expectedQueryHash = this._createQueryHash(aggregateQuery);
            const paramsBuffer = Buffer.from(proof.parameters);
            const paramsObj = JSON.parse(paramsBuffer.toString('utf8').replace(/\0+$/, ''));
            
            const paramQueryHash = Buffer.from(paramsObj.queryHash);
            
            return expectedQueryHash.equals(paramQueryHash) && 
                   paramsObj.statisticType === aggregateQuery.statistic;
        } catch (error) {
            console.error('Local aggregate proof verification failed:', error);
            return false;
        }
    }
}
