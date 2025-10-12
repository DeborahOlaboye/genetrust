// Client interface for interacting with marketplace.clar contract
// Handles data listings, purchases, and marketplace operations

import { 
    stringAsciiCV, 
    uintCV, 
    bufferCV, 
    principalCV,
    boolCV,
    contractPrincipalCV
} from '@stacks/transactions';

/**
 * Client for interacting with marketplace.clar contract
 * Manages genetic data marketplace operations
 */
export class ExchangeClient {
    constructor(contractAddress, contractName, stacksApi) {
        this.contractAddress = contractAddress;
        this.contractName = contractName;
        this.stacksApi = stacksApi;
        this.contractIdentifier = `${contractAddress}.${contractName}`;
    }

    /**
     * Create a new data listing
     * @param {Object} listingData - Listing information
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async createListing(listingData, senderAddress) {
        try {
            const {
                listingId,
                price,
                dataContract,
                dataId,
                accessLevel,
                metadataHash,
                requiresVerification
            } = listingData;

            // Validate inputs
            this._validateListingData(listingData);

            const functionArgs = [
                uintCV(listingId),
                uintCV(price),
                principalCV(dataContract),
                uintCV(dataId),
                uintCV(accessLevel),
                bufferCV(this._ensureBuffer32(metadataHash)),
                boolCV(requiresVerification)
            ];

            const txResult = await this._callContractFunction(
                'create-listing',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                listingId,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to create listing: ${error.message}`);
        }
    }

    /**
     * Set access level pricing for a listing
     * @param {number} listingId - Listing ID
     * @param {number} accessLevel - Access level
     * @param {number} price - Price for this access level
     * @param {string} senderAddress - Sender's address (must be listing owner)
     * @returns {Promise<Object>} Transaction result
     */
    async setAccessLevelPrice(listingId, accessLevel, price, senderAddress) {
        try {
            const functionArgs = [
                uintCV(listingId),
                uintCV(accessLevel),
                uintCV(price)
            ];

            const txResult = await this._callContractFunction(
                'set-access-level-price',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                listingId,
                accessLevel,
                price,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to set access level price: ${error.message}`);
        }
    }

    /**
     * Update listing status (active/inactive)
     * @param {number} listingId - Listing ID
     * @param {boolean} active - New status
     * @param {string} senderAddress - Sender's address (must be listing owner)
     * @returns {Promise<Object>} Transaction result
     */
    async updateListingStatus(listingId, active, senderAddress) {
        try {
            const functionArgs = [
                uintCV(listingId),
                boolCV(active)
            ];

            const txResult = await this._callContractFunction(
                'update-listing-status',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                listingId,
                active,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to update listing status: ${error.message}`);
        }
    }

    /**
     * Create purchase escrow
     * @param {number} listingId - Listing ID
     * @param {number} accessLevel - Requested access level
     * @param {string} senderAddress - Buyer's address
     * @returns {Promise<Object>} Transaction result
     */
    async createPurchaseEscrow(listingId, accessLevel, senderAddress) {
        try {
            const functionArgs = [
                uintCV(listingId),
                uintCV(accessLevel)
            ];

            const txResult = await this._callContractFunction(
                'create-purchase-escrow',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                listingId,
                accessLevel,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to create purchase escrow: ${error.message}`);
        }
    }

    /**
     * Complete purchase by releasing escrow
     * @param {number} escrowId - Escrow ID
     * @param {Buffer} txId - Transaction ID for the purchase
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async completePurchase(escrowId, txId, senderAddress) {
        try {
            const functionArgs = [
                uintCV(escrowId),
                bufferCV(this._ensureBuffer32(txId))
            ];

            const txResult = await this._callContractFunction(
                'complete-purchase',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                escrowId,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to complete purchase: ${error.message}`);
        }
    }

    /**
     * Refund escrow (if expired or cancelled)
     * @param {number} escrowId - Escrow ID
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async refundEscrow(escrowId, senderAddress) {
        try {
            const functionArgs = [uintCV(escrowId)];

            const txResult = await this._callContractFunction(
                'refund-escrow',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                escrowId,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to refund escrow: ${error.message}`);
        }
    }

    /**
     * Direct purchase without escrow
     * @param {number} listingId - Listing ID
     * @param {number} accessLevel - Requested access level
     * @param {Buffer} txId - Transaction ID for the purchase
     * @param {string} senderAddress - Buyer's address
     * @returns {Promise<Object>} Transaction result
     */
    async purchaseListingDirect(listingId, accessLevel, txId, senderAddress) {
        try {
            const functionArgs = [
                uintCV(listingId),
                uintCV(accessLevel),
                bufferCV(this._ensureBuffer32(txId))
            ];

            const txResult = await this._callContractFunction(
                'purchase-listing-direct',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                listingId,
                accessLevel,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to purchase listing: ${error.message}`);
        }
    }

    /**
     * Extend user access to a listing
     * @param {number} listingId - Listing ID
     * @param {string} userAddress - User's address
     * @param {number} duration - Duration to extend (in blocks)
     * @param {string} senderAddress - Sender's address (must be owner or admin)
     * @returns {Promise<Object>} Transaction result
     */
    async extendAccess(listingId, userAddress, duration, senderAddress) {
        try {
            const functionArgs = [
                uintCV(listingId),
                principalCV(userAddress),
                uintCV(duration)
            ];

            const txResult = await this._callContractFunction(
                'extend-access',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                listingId,
                userAddress,
                duration,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to extend access: ${error.message}`);
        }
    }

    /**
     * Get listing details
     * @param {number} listingId - Listing ID
     * @returns {Promise<Object|null>} Listing details or null
     */
    async getListing(listingId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-listing',
                [uintCV(listingId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const listingData = result.value.data;
            return {
                owner: listingData.owner.value,
                price: parseInt(listingData.price.value),
                dataContract: listingData['data-contract'].value,
                dataId: parseInt(listingData['data-id'].value),
                active: listingData.active.value,
                accessLevel: parseInt(listingData['access-level'].value),
                metadataHash: Array.from(listingData['metadata-hash'].buffer),
                requiresVerification: listingData['requires-verification'].value,
                platformFeePercent: parseInt(listingData['platform-fee-percent'].value),
                createdAt: parseInt(listingData['created-at'].value),
                updatedAt: parseInt(listingData['updated-at'].value)
            };
        } catch (error) {
            throw new Error(`Failed to get listing: ${error.message}`);
        }
    }

    /**
     * Get user's purchase information
     * @param {string} userAddress - User's address
     * @param {number} listingId - Listing ID
     * @returns {Promise<Object|null>} Purchase information or null
     */
    async getUserPurchase(userAddress, listingId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-user-purchase',
                [principalCV(userAddress), uintCV(listingId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const purchaseData = result.value.data;
            return {
                purchaseTime: parseInt(purchaseData['purchase-time'].value),
                accessExpiry: parseInt(purchaseData['access-expiry'].value),
                accessLevel: parseInt(purchaseData['access-level'].value),
                transactionId: Array.from(purchaseData['transaction-id'].buffer),
                purchasePrice: parseInt(purchaseData['purchase-price'].value),
                isActive: parseInt(purchaseData['access-expiry'].value) > Date.now() / 1000
            };
        } catch (error) {
            throw new Error(`Failed to get user purchase: ${error.message}`);
        }
    }

    /**
     * Get escrow details
     * @param {number} escrowId - Escrow ID
     * @returns {Promise<Object|null>} Escrow details or null
     */
    async getEscrow(escrowId) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-escrow',
                [uintCV(escrowId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const escrowData = result.value.data;
            return {
                listingId: parseInt(escrowData['listing-id'].value),
                buyer: escrowData.buyer.value,
                amount: parseInt(escrowData.amount.value),
                createdAt: parseInt(escrowData['created-at'].value),
                expiresAt: parseInt(escrowData['expires-at'].value),
                released: escrowData.released.value,
                refunded: escrowData.refunded.value,
                accessLevel: parseInt(escrowData['access-level'].value),
                isExpired: parseInt(escrowData['expires-at'].value) < Date.now() / 1000
            };
        } catch (error) {
            throw new Error(`Failed to get escrow: ${error.message}`);
        }
    }

    /**
     * Get access level price for a listing
     * @param {number} listingId - Listing ID
     * @param {number} accessLevel - Access level
     * @returns {Promise<number>} Price for the access level
     */
    async getAccessLevelPrice(listingId, accessLevel) {
        try {
            const result = await this._callReadOnlyFunction(
                'get-access-level-price',
                [uintCV(listingId), uintCV(accessLevel)]
            );

            if (result.type === 'ok') {
                return parseInt(result.value.value);
            }

            throw new Error('Price not found');
        } catch (error) {
            throw new Error(`Failed to get access level price: ${error.message}`);
        }
    }

    /**
     * Verify purchase eligibility
     * @param {number} listingId - Listing ID
     * @param {number} accessLevel - Requested access level
     * @returns {Promise<boolean>} True if purchase is eligible
     */
    async verifyPurchaseEligibility(listingId, accessLevel) {
        try {
            const result = await this._callReadOnlyFunction(
                'verify-purchase-eligibility',
                [uintCV(listingId), uintCV(accessLevel)]
            );

            return result.type === 'ok';
        } catch (error) {
            return false;
        }
    }

    /**
     * Get data details using trait interface
     * @param {number} dataId - Data ID
     * @returns {Promise<Object|null>} Data details or null
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
     * Verify access rights using trait interface
     * @param {number} dataId - Data ID
     * @param {string} userAddress - User's address
     * @returns {Promise<boolean>} True if user has access
     */
    async verifyAccessRights(dataId, userAddress) {
        try {
            const result = await this._callReadOnlyFunction(
                'verify-access-rights',
                [uintCV(dataId), principalCV(userAddress)]
            );

            return result.type === 'ok' && result.value.type === 'bool' && result.value.value;
        } catch (error) {
            return false;
        }
    }

    /**
     * Grant access using trait interface (admin function)
     * @param {number} dataId - Data ID
     * @param {string} userAddress - User's address
     * @param {number} accessLevel - Access level to grant
     * @param {string} senderAddress - Admin's address
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
                userAddress,
                accessLevel,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to grant access: ${error.message}`);
        }
    }

    /**
     * Get active listings for a user
     * @param {string} ownerAddress - Owner's address
     * @param {Array<number>} listingIdRange - Range of IDs to check [start, end]
     * @returns {Promise<Array>} Active listings
     */
    async getListingsByOwner(ownerAddress, listingIdRange = [1, 100]) {
        try {
            const [start, end] = listingIdRange;
            const listingIds = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            
            const listings = [];
            for (const id of listingIds) {
                try {
                    const listing = await this.getListing(id);
                    if (listing && listing.owner === ownerAddress) {
                        listings.push({
                            listingId: id,
                            ...listing
                        });
                    }
                } catch (error) {
                    // Continue if listing doesn't exist
                    continue;
                }
            }

            return listings;
        } catch (error) {
            throw new Error(`Failed to get listings by owner: ${error.message}`);
        }
    }

    /**
     * Get marketplace statistics
     * @param {Array<number>} listingIdRange - Range of IDs to analyze [start, end]
     * @returns {Promise<Object>} Marketplace statistics
     */
    async getMarketplaceStats(listingIdRange = [1, 100]) {
        try {
            const [start, end] = listingIdRange;
            const listingIds = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            
            const stats = {
                totalListings: 0,
                activeListings: 0,
                totalVolume: 0,
                averagePrice: 0,
                accessLevelDistribution: { 1: 0, 2: 0, 3: 0 },
                verificationRequired: 0
            };

            const prices = [];

            for (const id of listingIds) {
                try {
                    const listing = await this.getListing(id);
                    if (listing) {
                        stats.totalListings++;
                        
                        if (listing.active) {
                            stats.activeListings++;
                        }
                        
                        prices.push(listing.price);
                        stats.totalVolume += listing.price;
                        stats.accessLevelDistribution[listing.accessLevel]++;
                        
                        if (listing.requiresVerification) {
                            stats.verificationRequired++;
                        }
                    }
                } catch (error) {
                    continue;
                }
            }

            if (prices.length > 0) {
                stats.averagePrice = stats.totalVolume / prices.length;
            }

            return stats;
        } catch (error) {
            throw new Error(`Failed to get marketplace stats: ${error.message}`);
        }
    }

    /**
     * Set admin address (admin function)
     * @param {string} newAdminAddress - New admin's address
     * @param {string} senderAddress - Current admin's address
     * @returns {Promise<Object>} Transaction result
     */
    async setAdmin(newAdminAddress, senderAddress) {
        try {
            const functionArgs = [principalCV(newAdminAddress)];

            const txResult = await this._callContractFunction(
                'set-admin',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                newAdmin: newAdminAddress,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to set admin: ${error.message}`);
        }
    }

    /**
     * Set platform fee (admin function)
     * @param {number} newFeePercent - New fee percentage (in basis points)
     * @param {string} senderAddress - Admin's address
     * @returns {Promise<Object>} Transaction result
     */
    async setPlatformFee(newFeePercent, senderAddress) {
        try {
            const functionArgs = [uintCV(newFeePercent)];

            const txResult = await this._callContractFunction(
                'set-platform-fee',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                newFeePercent,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to set platform fee: ${error.message}`);
        }
    }

    /**
     * Set platform address (admin function)
     * @param {string} newPlatformAddress - New platform address
     * @param {string} senderAddress - Admin's address
     * @returns {Promise<Object>} Transaction result
     */
    async setPlatformAddress(newPlatformAddress, senderAddress) {
        try {
            const functionArgs = [principalCV(newPlatformAddress)];

            const txResult = await this._callContractFunction(
                'set-platform-address',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                newPlatformAddress,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to set platform address: ${error.message}`);
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
     * Validate listing data before creation
     * @private
     */
    _validateListingData(listingData) {
        const required = ['listingId', 'price', 'dataContract', 'dataId', 'accessLevel', 'metadataHash'];
        
        for (const field of required) {
            if (listingData[field] === undefined || listingData[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (listingData.accessLevel < 1 || listingData.accessLevel > 3) {
            throw new Error('Access level must be between 1 and 3');
        }

        if (listingData.price < 0) {
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
}
