// src/zk-proofs/index.js
// Main export file for ZK proof components
// Provides unified interface for all zero-knowledge proof functionality

import { GenePresenceProofGenerator } from './generators/gene-presence-proof.js';
import { GeneVariantProofGenerator } from './generators/gene-variant-proof.js';
import { AggregateProofGenerator } from './generators/aggregate-proof.js';
import { ProofVerifier } from './verifiers/proof-verifier.js';
import { ProofUtils } from './utils/proof-utils.js';

// Re-export for external consumers
export { GenePresenceProofGenerator, GeneVariantProofGenerator, AggregateProofGenerator, ProofVerifier, ProofUtils };

/**
 * ZK Proof Factory - Unified interface for creating proofs
 */
export class ZKProofFactory {
    /**
     * Create a proof generator for specific type
     * @param {string} proofType - Type of proof ('gene-presence', 'gene-variant', 'aggregate')
     * @returns {Object} Proof generator instance
     */
    static createGenerator(proofType) {
        switch (proofType) {
            case 'gene-presence':
                return new GenePresenceProofGenerator();
            case 'gene-variant':
                return new GeneVariantProofGenerator();
            case 'aggregate':
                return new AggregateProofGenerator();
            default:
                throw new Error(`Unsupported proof type: ${proofType}`);
        }
    }

    /**
     * Create a proof verifier
     * @returns {ProofVerifier} Verifier instance
     */
    static createVerifier() {
        return new ProofVerifier();
    }

    /**
     * Get supported proof types
     * @returns {Array<string>} List of supported proof types
     */
    static getSupportedTypes() {
        return ['gene-presence', 'gene-variant', 'aggregate'];
    }
}
