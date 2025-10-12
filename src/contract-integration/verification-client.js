// Client interface for interacting with verification.clar contract
// Handles zero-knowledge proof registration and verification

import { 
    stringAsciiCV, 
    uintCV, 
    bufferCV, 
    principalCV,
    listCV
} from '@stacks/transactions';

/**
 * Client for interacting with verification.clar contract
 * Manages zero-knowledge proof registration and verification
 */
export class AttestationsClient {
    constructor(contractAddress, contractName, stacksApi) {
        this.contractAddress = contractAddress;
        this.contractName = contractName;
        this.stacksApi = stacksApi;
        this.contractIdentifier = `${contractAddress}.${contractName}`;

        // Proof type constants from contract
        this.PROOF_TYPES = {
            GENE_PRESENCE: 1,
            GENE_ABSENCE: 2,
            GENE_VARIANT: 3,
            AGGREGATE: 4
        };
    }

    /**
     * Register a new proof verifier (admin function)
     * @param {string} name - Verifier name
     * @param {string} verifierAddress - Verifier's address
     * @param {string} senderAddress - Admin's address
     * @returns {Promise<Object>} Transaction result
     */
    async registerVerifier(name, verifierAddress, senderAddress) {
        try {
            const functionArgs = [
                stringAsciiCV(this._truncateString(name, 64)),
                principalCV(verifierAddress)
            ];

            const txResult = await this._callContractFunction(
                'register-verifier',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                verifierAddress,
                name,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to register verifier: ${error.message}`);
        }
    }

    /**
     * Deactivate a proof verifier (admin function)
     * @param {number} verifierId - Verifier ID to deactivate
     * @param {string} senderAddress - Admin's address
     * @returns {Promise<Object>} Transaction result
     */
    async deactivateVerifier(verifierId, senderAddress) {
        try {
            const functionArgs = [uintCV(verifierId)];

            const txResult = await this._callContractFunction(
                'deactivate-verifier',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                verifierId,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to deactivate verifier: ${error.message}`);
        }
    }

    /**
     * Register a zero-knowledge proof
     * @param {Object} proofData - Proof information
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async registerProof(proofData, senderAddress) {
        try {
            const { dataId, proofType, proofHash, parameters } = proofData;

            // Validate inputs
            this._validateProofData(proofData);

            const functionArgs = [
                uintCV(dataId),
                uintCV(proofType),
                bufferCV(this._ensureBuffer32(proofHash)),
                bufferCV(this._ensureBuffer256(parameters))
            ];

            const txResult = await this._callContractFunction(
                'register-proof',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                proofType,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to register proof: ${error.message}`);
        }
    }

    /**
     * Verify a zero-knowledge proof
     * @param {number} proofId - Proof ID to verify
     * @param {number} verifierId - Verifier ID
     * @param {Buffer} verificationTx - Verification transaction hash
     * @param {string} senderAddress - Verifier's address
     * @returns {Promise<Object>} Transaction result
     */
    async verifyProof(proofId, verifierId, verificationTx, senderAddress) {
        try {
            const functionArgs = [
                uintCV(proofId),
                uintCV(verifierId),
                bufferCV(this._ensureBuffer32(verificationTx))
            ];

            const txResult = await this._callContractFunction(
                'verify-proof',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                proofId,
                verifierId,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to verify proof: ${error.message}`);
        }
    }

    /**
     * Report a verification failure
     * @param {number} proofId - Proof ID that failed verification
     * @param {number} verifierId - Verifier ID
     * @param {Buffer} verificationTx - Verification transaction hash
     * @param {string} senderAddress - Verifier's address
     * @returns {Promise<Object>} Transaction result
     */
    async reportVerificationFailure(proofId, verifierId, verificationTx, senderAddress) {
        try {
            const functionArgs = [
                uintCV(proofId),
                uintCV(verifierId),
                bufferCV(this._ensureBuffer32(verificationTx))
            ];

            const txResult = await this._callContractFunction(
                'report-verification-failure',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                proofId,
                verifierId,
                failed: true,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to report verification failure: ${error.message}`);
        }
    }

    /**
     * Check for verified proofs of a specific type for a dataset
     * @param {number} dataId - Dataset ID
     * @param {number} proofType - Type of proof to check
     * @returns {Promise<Array>} List of verified proof IDs
     */
    async checkVerifiedProof(dataId, proofType) {
        try {
            const result = await this._callReadOnlyFunction(
                'check-verified-proof',
                [uintCV(dataId), uintCV(proofType)]
            );

            if (result.type === 'ok') {
                return result.value.list.map(item => parseInt(item.value));
            }

            return [];
        } catch (error) {
            throw new Error(`Failed to check verified proof: ${error.message}`);
        }
    }

    /**
     * Get proofs by data ID and type
     * @param {number} dataId - Dataset ID
     * @param {number} proofType - Type of proof
     * @returns {Promise<Array>} List of proof IDs
     */
    async getProofsByDataId(dataId, proofType) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-proofs-by-data-id',
                [uintCV(dataId), uintCV(proofType)]
            );

            if (result.type === 'ok') {
                return result.value.list.map(item => parseInt(item.value));
            }

            return [];
        } catch (error) {
            throw new Error(`Failed to get proofs by data ID: ${error.message}`);
        }
    }

    /**
     * Get verifier details
     * @param {number} verifierId - Verifier ID
     * @returns {Promise<Object|null>} Verifier details or null
     */
    async getVerifier(verifierId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-verifier',
                [uintCV(verifierId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const verifierData = result.value.data;
            return {
                address: verifierData.address.value,
                name: verifierData.name.data,
                active: verifierData.active.value,
                verificationCount: parseInt(verifierData['verification-count'].value),
                addedAt: parseInt(verifierData['added-at'].value)
            };
        } catch (error) {
            throw new Error(`Failed to get verifier: ${error.message}`);
        }
    }

    /**
     * Get proof details
     * @param {number} proofId - Proof ID
     * @returns {Promise<Object|null>} Proof details or null
     */
    async getProof(proofId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-proof',
                [uintCV(proofId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const proofData = result.value.data;
            return {
                dataId: parseInt(proofData['data-id'].value),
                proofType: parseInt(proofData['proof-type'].value),
                proofHash: Array.from(proofData['proof-hash'].buffer),
                parameters: Array.from(proofData.parameters.buffer),
                creator: proofData.creator.value,
                verified: proofData.verified.value,
                verifier: proofData.verifier.type === 'some' ? 
                    parseInt(proofData.verifier.value.value) : null,
                createdAt: parseInt(proofData['created-at'].value)
            };
        } catch (error) {
            throw new Error(`Failed to get proof: ${error.message}`);
        }
    }

    /**
     * Get verification result
     * @param {number} proofId - Proof ID
     * @returns {Promise<Object|null>} Verification result or null
     */
    async getVerificationResult(proofId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-verification-result',
                [uintCV(proofId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const resultData = result.value.data;
            return {
                result: resultData.result.value,
                verifier: parseInt(resultData.verifier.value),
                verifiedAt: parseInt(resultData['verified-at'].value),
                verificationTx: Array.from(resultData['verification-tx'].buffer)
            };
        } catch (error) {
            throw new Error(`Failed to get verification result: ${error.message}`);
        }
    }

    /**
     * Check if a proof has been verified
     * @param {number} proofId - Proof ID
     * @returns {Promise<boolean>} True if verified
     */
    async isVerified(proofId) {
        try {
            const result = await this._callReadOnlyFunction(
                'is-verified',
                [uintCV(proofId)]
            );

            return result.type === 'bool' && result.value;
        } catch (error) {
            throw new Error(`Failed to check if proof is verified: ${error.message}`);
        }
    }

    /**
     * Get all proofs for a dataset
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object>} Proofs organized by type
     */
    async getAllProofsForDataset(dataId) {
        try {
            const proofsByType = {};

            // Check each proof type
            for (const [typeName, typeValue] of Object.entries(this.PROOF_TYPES)) {
                const proofs = await this.getProofsByDataId(dataId, typeValue);
                if (proofs.length > 0) {
                    proofsByType[typeName] = proofs;
                }
            }

            return proofsByType;
        } catch (error) {
            throw new Error(`Failed to get all proofs for dataset: ${error.message}`);
        }
    }

    /**
     * Get verification statistics for a dataset
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object>} Verification statistics
     */
    async getDatasetVerificationStats(dataId) {
        try {
            const allProofs = await this.getAllProofsForDataset(dataId);
            const stats = {
                totalProofs: 0,
                verifiedProofs: 0,
                proofTypeBreakdown: {},
                verificationRate: 0
            };

            for (const [typeName, proofIds] of Object.entries(allProofs)) {
                stats.totalProofs += proofIds.length;
                stats.proofTypeBreakdown[typeName] = {
                    total: proofIds.length,
                    verified: 0
                };

                // Check verification status for each proof
                for (const proofId of proofIds) {
                    const isVerified = await this.isVerified(proofId);
                    if (isVerified) {
                        stats.verifiedProofs++;
                        stats.proofTypeBreakdown[typeName].verified++;
                    }
                }
            }

            stats.verificationRate = stats.totalProofs > 0 ? 
                (stats.verifiedProofs / stats.totalProofs) * 100 : 0;

            return stats;
        } catch (error) {
            throw new Error(`Failed to get verification stats: ${error.message}`);
        }
    }

    /**
     * Batch register multiple proofs
     * @param {Array} proofDataArray - Array of proof data objects
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Array>} Array of transaction results
     */
    async batchRegisterProofs(proofDataArray, senderAddress) {
        try {
            const results = [];

            for (const proofData of proofDataArray) {
                try {
                    const result = await this.registerProof(proofData, senderAddress);
                    results.push(result);
                } catch (error) {
                    results.push({
                        success: false,
                        error: error.message,
                        dataId: proofData.dataId,
                        proofType: proofData.proofType
                    });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Batch proof registration failed: ${error.message}`);
        }
    }

    /**
     * Set contract owner (admin function)
     * @param {string} newOwnerAddress - New owner's address
     * @param {string} senderAddress - Current owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async setContractOwner(newOwnerAddress, senderAddress) {
        try {
            const functionArgs = [principalCV(newOwnerAddress)];

            const txResult = await this._callContractFunction(
                'set-contract-owner',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                newOwner: newOwnerAddress,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to set contract owner: ${error.message}`);
        }
    }

    /**
     * Helper method to call contract functions
     * @private
     */
    async _callContractFunction(functionName, functionArgs, senderAddress) {
        const contractCallTx = {
            contractAddress: this.contractAddress,
            contractName: this.contractName,
            functionName,
            functionArgs,
            senderKey: senderAddress
        };

        return await this.stacksApi.callContractFunction(contractCallTx);
    }

    /**
     * Helper method to call read-only functions
     * @private
     */
    async _callReadOnlyFunction(functionName, functionArgs) {
        return await this.stacksApi.callReadOnlyFunction(
            this.contractAddress,
            this.contractName,
            functionName,
            functionArgs
        );
    }

    /**
     * Validate proof data before registration
     * @private
     */
    _validateProofData(proofData) {
        const required = ['dataId', 'proofType', 'proofHash', 'parameters'];
        
        for (const field of required) {
            if (proofData[field] === undefined || proofData[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        const validTypes = Object.values(this.PROOF_TYPES);
        if (!validTypes.includes(proofData.proofType)) {
            throw new Error(`Invalid proof type: ${proofData.proofType}`);
        }
    }

    /**
     * Ensure buffer is exactly 32 bytes
     * @private
     */
    _ensureBuffer32(input) {
        let buffer;
        
        if (Array.isArray(input)) {
            buffer = Buffer.from(input);
        } else if (Buffer.isBuffer(input)) {
            buffer = input;
        } else if (typeof input === 'string') {
            buffer = Buffer.from(input, 'hex');
        } else {
            throw new Error('Invalid buffer input');
        }

        // Ensure exactly 32 bytes
        if (buffer.length > 32) {
            return buffer.slice(0, 32);
        } else if (buffer.length < 32) {
            const padded = Buffer.alloc(32);
            buffer.copy(padded);
            return padded;
        }
        
        return buffer;
    }

    /**
     * Ensure buffer is exactly 256 bytes
     * @private
     */
    _ensureBuffer256(input) {
        let buffer;
        
        if (Array.isArray(input)) {
            buffer = Buffer.from(input);
        } else if (Buffer.isBuffer(input)) {
            buffer = input;
        } else if (typeof input === 'string') {
            buffer = Buffer.from(input, 'utf8');
        } else {
            throw new Error('Invalid buffer input');
        }

        // Ensure exactly 256 bytes
        const result = Buffer.alloc(256);
        buffer.copy(result, 0, 0, Math.min(buffer.length, 256));
        
        return result;
    }

    /**
     * Truncate string to specified length
     * @private
     */
    _truncateString(str, maxLength) {
        if (typeof str !== 'string') {
            str = String(str);
        }
        return str.length > maxLength ? str.substring(0, maxLength) : str;
    }
}
