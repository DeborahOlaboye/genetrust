// Client interface for interacting with genetic-data.clar contract
// Provides JavaScript wrapper for all contract functions

import { 
    stringAsciiCV, 
    uintCV, 
    bufferCV, 
    someCV, 
    noneCV, 
    principalCV,
    contractPrincipalCV
} from '@stacks/transactions';

/**
 * Client for interacting with genetic-data.clar contract
 * Handles data registration, updates, and access management
 */
export class DatasetRegistryClient {
    constructor(contractAddress, contractName, stacksApi) {
        this.contractAddress = contractAddress;
        this.contractName = contractName;
        this.stacksApi = stacksApi;
        this.contractIdentifier = `${contractAddress}.${contractName}`;
    }

    /**
     * Register a new genetic dataset on the blockchain
     * @param {Object} dataInfo - Dataset information
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async registerGeneticData(dataInfo, senderAddress) {
        try {
            const { 
                dataId, 
                price, 
                accessLevel, 
                metadataHash, 
                storageUrl, 
                description 
            } = dataInfo;

            // Validate inputs
            this._validateDataInfo(dataInfo);

            // Prepare function arguments
            const functionArgs = [
                uintCV(dataId),
                uintCV(price),
                uintCV(accessLevel),
                bufferCV(this._ensureBuffer32(metadataHash)),
                stringAsciiCV(this._truncateString(storageUrl, 256)),
                stringAsciiCV(this._truncateString(description, 256))
            ];

            // Call contract function
            const txResult = await this._callContractFunction(
                'register-genetic-data',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to register genetic data: ${error.message}`);
        }
    }

    /**
     * Update existing genetic dataset
     * @param {number} dataId - Dataset ID to update
     * @param {Object} updates - Fields to update
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async updateGeneticData(dataId, updates, senderAddress) {
        try {
            // Prepare optional updates
            const functionArgs = [
                uintCV(dataId),
                updates.price ? someCV(uintCV(updates.price)) : noneCV(),
                updates.accessLevel ? someCV(uintCV(updates.accessLevel)) : noneCV(),
                updates.metadataHash ? someCV(bufferCV(this._ensureBuffer32(updates.metadataHash))) : noneCV(),
                updates.storageUrl ? someCV(stringAsciiCV(this._truncateString(updates.storageUrl, 256))) : noneCV(),
                updates.description ? someCV(stringAsciiCV(this._truncateString(updates.description, 256))) : noneCV()
            ];

            const txResult = await this._callContractFunction(
                'update-genetic-data',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                updatedFields: Object.keys(updates),
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to update genetic data: ${error.message}`);
        }
    }

    /**
     * Grant access to genetic data
     * @param {number} dataId - Dataset ID
     * @param {string} userAddress - User to grant access to
     * @param {number} accessLevel - Access level to grant
     * @param {string} senderAddress - Sender's address (must be owner)
     * @returns {Promise<Object>} Transaction result
     */
    async grantAccess(dataId, userAddress, accessLevel, senderAddress) {
        try {
            const functionArgs = [
                uintCV(dataId),
                principalCV(userAddress),
                uintCV(accessLevel)
            ];

            const txResult = await this._callContractFunction(
                'grant-access',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                grantedTo: userAddress,
                accessLevel,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to grant access: ${error.message}`);
        }
    }

    /**
     * Transfer ownership of genetic data
     * @param {number} dataId - Dataset ID
     * @param {string} newOwnerAddress - New owner's address
     * @param {string} senderAddress - Current owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async transferOwnership(dataId, newOwnerAddress, senderAddress) {
        try {
            const functionArgs = [
                uintCV(dataId),
                principalCV(newOwnerAddress)
            ];

            const txResult = await this._callContractFunction(
                'transfer-ownership',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                newOwner: newOwnerAddress,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to transfer ownership: ${error.message}`);
        }
    }

    /**
     * Get dataset details (read-only)
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object>} Dataset details
     */
    async getDatasetDetails(dataId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-dataset-details',
                [uintCV(dataId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const datasetData = result.value.data;
            return {
                owner: datasetData.owner.value,
                price: parseInt(datasetData.price.value),
                accessLevel: parseInt(datasetData['access-level'].value),
                metadataHash: Array.from(datasetData['metadata-hash'].buffer),
                storageUrl: datasetData['encrypted-storage-url'].data,
                description: datasetData.description.data,
                createdAt: parseInt(datasetData['created-at'].value),
                updatedAt: parseInt(datasetData['updated-at'].value)
            };
        } catch (error) {
            throw new Error(`Failed to get dataset details: ${error.message}`);
        }
    }

    /**
     * Get user's access rights to a dataset (read-only)
     * @param {number} dataId - Dataset ID
     * @param {string} userAddress - User's address
     * @returns {Promise<Object|null>} Access rights or null if none
     */
    async getUserAccess(dataId, userAddress) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-user-access',
                [uintCV(dataId), principalCV(userAddress)]
            );

            if (result.type === 'none') {
                return null;
            }

            const accessData = result.value.data;
            return {
                accessLevel: parseInt(accessData['access-level'].value),
                expiration: parseInt(accessData.expiration.value),
                grantedBy: accessData['granted-by'].value,
                isActive: parseInt(accessData.expiration.value) > Date.now() / 1000
            };
        } catch (error) {
            throw new Error(`Failed to get user access: ${error.message}`);
        }
    }

    /**
     * Check if user has valid access to dataset
     * @param {number} dataId - Dataset ID
     * @param {string} userAddress - User's address
     * @returns {Promise<boolean>} True if user has valid access
     */
    async verifyAccessRights(dataId, userAddress) {
        try {
            const result = await this._callReadOnlyFunction(
                'verify-access-rights',
                [uintCV(dataId), principalCV(userAddress)]
            );

            return result.type === 'ok' && result.value.type === 'bool' && result.value.value;
        } catch (error) {
            throw new Error(`Failed to verify access rights: ${error.message}`);
        }
    }

    /**
     * Get data details in trait format
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object>} Data details for trait interface
     */
    async getDataDetails(dataId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-data-details',
                [uintCV(dataId)]
            );

            if (result.type === 'err') {
                return null;
            }

            const detailsData = result.value.data;
            return {
                owner: detailsData.owner.value,
                price: parseInt(detailsData.price.value),
                accessLevel: parseInt(detailsData['access-level'].value),
                metadataHash: Array.from(detailsData['metadata-hash'].buffer)
            };
        } catch (error) {
            throw new Error(`Failed to get data details: ${error.message}`);
        }
    }

    /**
     * Batch get multiple datasets
     * @param {Array<number>} dataIds - Array of dataset IDs
     * @returns {Promise<Array>} Array of dataset details
     */
    async batchGetDatasets(dataIds) {
        try {
            const results = await Promise.all(
                dataIds.map(id => this.getDatasetDetails(id).catch(() => null))
            );

            return results.map((result, index) => ({
                dataId: dataIds[index],
                data: result,
                found: result !== null
            }));
        } catch (error) {
            throw new Error(`Batch dataset retrieval failed: ${error.message}`);
        }
    }

    /**
     * Search datasets by owner
     * @param {string} ownerAddress - Owner's address
     * @param {Array<number>} dataIdRange - Range of IDs to check [start, end]
     * @returns {Promise<Array>} Datasets owned by the address
     */
    async getDatasetsByOwner(ownerAddress, dataIdRange = [1, 100]) {
        try {
            const [start, end] = dataIdRange;
            const dataIds = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            
            const batchResults = await this.batchGetDatasets(dataIds);
            
            return batchResults
                .filter(result => result.found && result.data.owner === ownerAddress)
                .map(result => ({
                    dataId: result.dataId,
                    ...result.data
                }));
        } catch (error) {
            throw new Error(`Failed to get datasets by owner: ${error.message}`);
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
     * Validate data info before registration
     * @private
     */
    _validateDataInfo(dataInfo) {
        const required = ['dataId', 'price', 'accessLevel', 'metadataHash', 'storageUrl', 'description'];
        
        for (const field of required) {
            if (dataInfo[field] === undefined || dataInfo[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (dataInfo.accessLevel < 1 || dataInfo.accessLevel > 3) {
            throw new Error('Access level must be between 1 and 3');
        }

        if (dataInfo.price < 0) {
            throw new Error('Price must be non-negative');
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
     * Truncate string to specified length
     * @private
     */
    _truncateString(str, maxLength) {
        if (typeof str !== 'string') {
            str = String(str);
        }
        return str.length > maxLength ? str.substring(0, maxLength) : str;
    }

    /**
     * Generate unique dataset ID
     * @param {string} ownerAddress - Owner's address
     * @param {Object} dataInfo - Dataset information
     * @returns {number} Unique dataset ID
     */
    static generateDatasetId(ownerAddress, dataInfo) {
        const combinedString = `${ownerAddress}-${JSON.stringify(dataInfo)}-${Date.now()}`;
        const hash = require('crypto').createHash('sha256').update(combinedString).digest();
        
        // Convert first 4 bytes to uint32
        return hash.readUInt32BE(0);
    }

    /**
     * Estimate transaction fees for operations
     * @param {string} operation - Operation type
     * @param {Object} params - Operation parameters
     * @returns {Promise<Object>} Fee estimation
     */
    async estimateTransactionFee(operation, params = {}) {
        try {
            // This would integrate with Stacks fee estimation API
            const baseFees = {
                'register-genetic-data': 1000,
                'update-genetic-data': 500,
                'grant-access': 300,
                'transfer-ownership': 400,
                'set-contract-owner': 200
            };

            const baseFee = baseFees[operation] || 500;
            
            // Add complexity factor based on parameters
            let complexityMultiplier = 1;
            if (params.metadataHash) complexityMultiplier += 0.1;
            if (params.storageUrl && params.storageUrl.length > 100) complexityMultiplier += 0.2;

            return {
                operation,
                estimatedFee: Math.ceil(baseFee * complexityMultiplier),
                currency: 'STX',
                estimation: 'approximate'
            };
        } catch (error) {
            throw new Error(`Fee estimation failed: ${error.message}`);
        }
    }
}
