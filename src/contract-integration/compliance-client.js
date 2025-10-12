// Client interface for interacting with compliance.clar contract
// Handles regulatory compliance, consent management, and audit trails

import { 
    stringAsciiCV, 
    uintCV, 
    bufferCV, 
    principalCV,
    boolCV
} from '@stacks/transactions';

/**
 * Client for interacting with compliance.clar contract
 * Manages regulatory compliance and consent tracking
 */
export class DataGovernanceClient {
    constructor(contractAddress, contractName, stacksApi) {
        this.contractAddress = contractAddress;
        this.contractName = contractName;
        this.stacksApi = stacksApi;
        this.contractIdentifier = `${contractAddress}.${contractName}`;

        // Jurisdiction constants from contract
        this.JURISDICTIONS = {
            GLOBAL: 0,
            US: 1,        // HIPAA
            EU: 2,        // GDPR
            UK: 3,        // UK GDPR
            CANADA: 4     // PIPEDA
        };

        // Consent type constants from contract
        this.CONSENT_TYPES = {
            RESEARCH: 1,
            COMMERCIAL: 2,
            CLINICAL: 3
        };
    }

    /**
     * Register consent for genetic data
     * @param {Object} consentData - Consent information
     * @param {string} senderAddress - Data owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async registerConsent(consentData, senderAddress) {
        try {
            const {
                dataId,
                researchConsent,
                commercialConsent,
                clinicalConsent,
                jurisdiction,
                consentDuration
            } = consentData;

            // Validate inputs
            this._validateConsentData(consentData);

            const functionArgs = [
                uintCV(dataId),
                boolCV(researchConsent),
                boolCV(commercialConsent),
                boolCV(clinicalConsent),
                uintCV(jurisdiction),
                uintCV(consentDuration)
            ];

            const txResult = await this._callContractFunction(
                'set-consent-policy',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                jurisdiction,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to register consent: ${error.message}`);
        }
    }

    /**
     * Update existing consent
     * @param {Object} consentData - Updated consent information
     * @param {string} senderAddress - Data owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async updateConsent(consentData, senderAddress) {
        try {
            const {
                dataId,
                researchConsent,
                commercialConsent,
                clinicalConsent,
                jurisdiction,
                consentDuration
            } = consentData;

            // Validate inputs
            this._validateConsentData(consentData);

            const functionArgs = [
                uintCV(dataId),
                boolCV(researchConsent),
                boolCV(commercialConsent),
                boolCV(clinicalConsent),
                uintCV(jurisdiction),
                uintCV(consentDuration)
            ];

            const txResult = await this._callContractFunction(
                'amend-consent-policy',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                updated: true,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to update consent: ${error.message}`);
        }
    }

    /**
     * Register data usage
     * @param {Object} usageData - Usage information
     * @param {string} senderAddress - Sender's address
     * @returns {Promise<Object>} Transaction result
     */
    async registerDataUsage(usageData, senderAddress) {
        try {
            const {
                dataId,
                userAddress,
                purpose,
                accessDuration,
                accessLevel
            } = usageData;

            // Validate inputs
            this._validateUsageData(usageData);

            const functionArgs = [
                uintCV(dataId),
                principalCV(userAddress),
                uintCV(purpose),
                uintCV(accessDuration),
                uintCV(accessLevel)
            ];

            const txResult = await this._callContractFunction(
                'record-processing-activity',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                userAddress,
                purpose,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to register data usage: ${error.message}`);
        }
    }

    /**
     * Log data access for audit trail
     * @param {number} dataId - Dataset ID
     * @param {number} purpose - Purpose of access
     * @param {Buffer} txId - Transaction ID
     * @param {string} senderAddress - Accessor's address
     * @returns {Promise<Object>} Transaction result
     */
    async logDataAccess(dataId, purpose, txId, senderAddress) {
        try {
            const functionArgs = [
                uintCV(dataId),
                uintCV(purpose),
                bufferCV(this._ensureBuffer32(txId))
            ];

            const txResult = await this._callContractFunction(
                'audit-access',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                purpose,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to log data access: ${error.message}`);
        }
    }

    /**
     * Check consent validity for specific purpose
     * @param {number} dataId - Dataset ID
     * @param {number} purpose - Purpose to check
     * @returns {Promise<boolean>} True if consent is valid
     */
    async checkConsentValidity(dataId, purpose) {
        try {
            const result = await this._callReadOnlyFunction(
                'validate-consent-for-purpose',
                [uintCV(dataId), uintCV(purpose)]
            );

            return result.type === 'ok' && result.value.type === 'bool' && result.value.value;
        } catch (error) {
            return false;
        }
    }

    /**
     * Request right to be forgotten (GDPR)
     * @param {number} dataId - Dataset ID
     * @param {string} senderAddress - Data owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async requestRightToBeForgotten(dataId, senderAddress) {
        try {
            const functionArgs = [uintCV(dataId)];

            const txResult = await this._callContractFunction(
                'gdpr-request-erasure',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                gdprRequest: 'right-to-be-forgotten',
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to request right to be forgotten: ${error.message}`);
        }
    }

    /**
     * Request data portability (GDPR)
     * @param {number} dataId - Dataset ID
     * @param {string} senderAddress - Data owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async requestDataPortability(dataId, senderAddress) {
        try {
            const functionArgs = [uintCV(dataId)];

            const txResult = await this._callContractFunction(
                'gdpr-request-portability',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                gdprRequest: 'data-portability',
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to request data portability: ${error.message}`);
        }
    }

    /**
     * Restrict data processing (GDPR)
     * @param {number} dataId - Dataset ID
     * @param {string} senderAddress - Data owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async restrictDataProcessing(dataId, senderAddress) {
        try {
            const functionArgs = [uintCV(dataId)];

            const txResult = await this._callContractFunction(
                'gdpr-restrict-processing',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                processingRestricted: true,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to restrict data processing: ${error.message}`);
        }
    }

    /**
     * Restore data processing (GDPR)
     * @param {number} dataId - Dataset ID
     * @param {string} senderAddress - Data owner's address
     * @returns {Promise<Object>} Transaction result
     */
    async restoreDataProcessing(dataId, senderAddress) {
        try {
            const functionArgs = [uintCV(dataId)];

            const txResult = await this._callContractFunction(
                'gdpr-restore-processing',
                functionArgs,
                senderAddress
            );

            return {
                success: true,
                txId: txResult.txid,
                dataId,
                processingRestricted: false,
                contractCall: txResult
            };
        } catch (error) {
            throw new Error(`Failed to restore data processing: ${error.message}`);
        }
    }

    /**
     * Get consent record
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object|null>} Consent record or null
     */
    async getConsent(dataId) {
        try {
            const result = await this._callReadOnlyFunction(
                'fetch-consent-record',
                [uintCV(dataId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const consentData = result.value.data;
            return {
                owner: consentData.owner.value,
                researchConsent: consentData['research-consent'].value,
                commercialConsent: consentData['commercial-consent'].value,
                clinicalConsent: consentData['clinical-consent'].value,
                jurisdiction: parseInt(consentData.jurisdiction.value),
                consentExpiresAt: parseInt(consentData['consent-expires-at'].value),
                lastUpdated: parseInt(consentData['last-updated'].value),
                isExpired: parseInt(consentData['consent-expires-at'].value) < Date.now() / 1000
            };
        } catch (error) {
            throw new Error(`Failed to get consent: ${error.message}`);
        }
    }

    /**
     * Get usage record
     * @param {number} usageId - Usage ID
     * @returns {Promise<Object|null>} Usage record or null
     */
    async getUsage(usageId) {
        try {
            const result = await this._callReadOnlyFunction(
                'fetch-usage-record',
                [uintCV(usageId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const usageData = result.value.data;
            return {
                dataId: parseInt(usageData['data-id'].value),
                user: usageData.user.value,
                purpose: parseInt(usageData.purpose.value),
                accessGrantedAt: parseInt(usageData['access-granted-at'].value),
                accessExpiresAt: parseInt(usageData['access-expires-at'].value),
                accessLevel: parseInt(usageData['access-level'].value),
                isActive: parseInt(usageData['access-expires-at'].value) > Date.now() / 1000
            };
        } catch (error) {
            throw new Error(`Failed to get usage: ${error.message}`);
        }
    }

    /**
     * Get access log
     * @param {number} logId - Log ID
     * @returns {Promise<Object|null>} Access log or null
     */
    async getAccessLog(logId) {
        try {
            const result = await this._callReadOnlyFunction(
                'fetch-access-log',
                [uintCV(logId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const logData = result.value.data;
            return {
                dataId: parseInt(logData['data-id'].value),
                user: logData.user.value,
                timestamp: parseInt(logData.timestamp.value),
                purpose: parseInt(logData.purpose.value),
                txId: Array.from(logData['tx-id'].buffer)
            };
        } catch (error) {
            throw new Error(`Failed to get access log: ${error.message}`);
        }
    }

    /**
     * Get GDPR record
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object|null>} GDPR record or null
     */
    async getGdprRecord(dataId) {
        try {
            const result = await this._callReadOnlyFunction(
                'fetch-gdpr-record',
                [uintCV(dataId)]
            );

            if (result.type === 'none') {
                return null;
            }

            const gdprData = result.value.data;
            return {
                rightToBeForgottenRequested: gdprData['right-to-be-forgotten-requested'].value,
                dataPortabilityRequested: gdprData['data-portability-requested'].value,
                processingRestricted: gdprData['processing-restricted'].value,
                lastUpdated: parseInt(gdprData['last-updated'].value)
            };
        } catch (error) {
            throw new Error(`Failed to get GDPR record: ${error.message}`);
        }
    }

    /**
     * Get compliance summary for a dataset
     * @param {number} dataId - Dataset ID
     * @returns {Promise<Object>} Comprehensive compliance information
     */
    async getComplianceSummary(dataId) {
        try {
            const [consent, gdprRecord] = await Promise.all([
                this.getConsent(dataId),
                this.getGdprRecord(dataId)
            ]);

            const summary = {
                dataId,
                hasConsent: consent !== null,
                consent,
                gdpr: gdprRecord,
                complianceStatus: 'unknown'
            };

            if (consent) {
                const currentTime = Date.now() / 1000;
                const isExpired = consent.consentExpiresAt < currentTime;
                
                if (isExpired) {
                    summary.complianceStatus = 'expired';
                } else if (consent.jurisdiction === this.JURISDICTIONS.EU && gdprRecord?.processingRestricted) {
                    summary.complianceStatus = 'restricted';
                } else {
                    summary.complianceStatus = 'compliant';
                }
            } else {
                summary.complianceStatus = 'no_consent';
            }

            return summary;
        } catch (error) {
            throw new Error(`Failed to get compliance summary: ${error.message}`);
        }
    }

    /**
     * Get audit trail for a dataset
     * @param {number} dataId - Dataset ID
     * @param {Array<number>} logIdRange - Range of log IDs to check [start, end]
     * @returns {Promise<Array>} Array of access logs for the dataset
     */
    async getAuditTrail(dataId, logIdRange = [1, 100]) {
        try {
            const [start, end] = logIdRange;
            const logIds = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            
            const auditTrail = [];
            for (const logId of logIds) {
                try {
                    const log = await this.getAccessLog(logId);
                    if (log && log.dataId === dataId) {
                        auditTrail.push({
                            logId,
                            ...log
                        });
                    }
                } catch (error) {
                    // Continue if log doesn't exist
                    continue;
                }
            }

            // Sort by timestamp
            auditTrail.sort((a, b) => b.timestamp - a.timestamp);

            return auditTrail;
        } catch (error) {
            throw new Error(`Failed to get audit trail: ${error.message}`);
        }
    }

    /**
     * Check if data processing is compliant for a specific purpose
     * @param {number} dataId - Dataset ID
     * @param {number} purpose - Purpose of processing
     * @param {string} jurisdiction - Jurisdiction to check against
     * @returns {Promise<Object>} Compliance check result
     */
    async checkProcessingCompliance(dataId, purpose, jurisdiction = 'GLOBAL') {
        try {
            const jurisdictionCode = this.JURISDICTIONS[jurisdiction] || this.JURISDICTIONS.GLOBAL;
            
            // Check basic consent validity
            const hasValidConsent = await this.checkConsentValidity(dataId, purpose);
            
            if (!hasValidConsent) {
                return {
                    compliant: false,
                    reason: 'No valid consent for specified purpose',
                    jurisdiction,
                    dataId,
                    purpose
                };
            }

            // Get detailed consent information
            const consent = await this.getConsent(dataId);
            
            if (!consent) {
                return {
                    compliant: false,
                    reason: 'No consent record found',
                    jurisdiction,
                    dataId,
                    purpose
                };
            }

            // Check jurisdiction-specific requirements
            if (consent.jurisdiction !== jurisdictionCode && jurisdictionCode !== this.JURISDICTIONS.GLOBAL) {
                return {
                    compliant: false,
                    reason: 'Jurisdiction mismatch',
                    jurisdiction,
                    dataId,
                    purpose,
                    consentJurisdiction: consent.jurisdiction
                };
            }

            // For EU jurisdiction, check GDPR requirements
            if (consent.jurisdiction === this.JURISDICTIONS.EU) {
                const gdprRecord = await this.getGdprRecord(dataId);
                
                if (gdprRecord?.rightToBeForgottenRequested) {
                    return {
                        compliant: false,
                        reason: 'Right to be forgotten has been requested',
                        jurisdiction,
                        dataId,
                        purpose
                    };
                }

                if (gdprRecord?.processingRestricted) {
                    return {
                        compliant: false,
                        reason: 'Data processing has been restricted',
                        jurisdiction,
                        dataId,
                        purpose
                    };
                }
            }

            return {
                compliant: true,
                reason: 'All compliance requirements met',
                jurisdiction,
                dataId,
                purpose,
                consentExpiresAt: consent.consentExpiresAt
            };
        } catch (error) {
            throw new Error(`Failed to check processing compliance: ${error.message}`);
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
                'assign-governance-owner',
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
     * Validate consent data before registration
     * @private
     */
    _validateConsentData(consentData) {
        const required = ['dataId', 'jurisdiction', 'consentDuration'];
        
        for (const field of required) {
            if (consentData[field] === undefined || consentData[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        const validJurisdictions = Object.values(this.JURISDICTIONS);
        if (!validJurisdictions.includes(consentData.jurisdiction)) {
            throw new Error(`Invalid jurisdiction: ${consentData.jurisdiction}`);
        }

        if (consentData.consentDuration <= 0) {
            throw new Error('Consent duration must be positive');
        }

        // At least one consent type must be true
        const hasAnyConsent = consentData.researchConsent || 
                             consentData.commercialConsent || 
                             consentData.clinicalConsent;
        
        if (!hasAnyConsent) {
            throw new Error('At least one consent type must be granted');
        }
    }

    /**
     * Validate usage data before registration
     * @private
     */
    _validateUsageData(usageData) {
        const required = ['dataId', 'userAddress', 'purpose', 'accessDuration', 'accessLevel'];
        
        for (const field of required) {
            if (usageData[field] === undefined || usageData[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        const validPurposes = Object.values(this.CONSENT_TYPES);
        if (!validPurposes.includes(usageData.purpose)) {
            throw new Error(`Invalid purpose: ${usageData.purpose}`);
        }

        if (usageData.accessDuration <= 0) {
            throw new Error('Access duration must be positive');
        }

        if (usageData.accessLevel < 1 || usageData.accessLevel > 3) {
            throw new Error('Access level must be between 1 and 3');
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
     * Get jurisdiction name from code
     * @param {number} jurisdictionCode - Jurisdiction code
     * @returns {string} Jurisdiction name
     */
    static getJurisdictionName(jurisdictionCode) {
        const jurisdictionMap = {
            0: 'Global',
            1: 'United States (HIPAA)',
            2: 'European Union (GDPR)',
            3: 'United Kingdom',
            4: 'Canada (PIPEDA)'
        };
        
        return jurisdictionMap[jurisdictionCode] || 'Unknown';
    }

    /**
     * Get consent type name from code
     * @param {number} consentTypeCode - Consent type code
     * @returns {string} Consent type name
     */
    static getConsentTypeName(consentTypeCode) {
        const consentTypeMap = {
            1: 'Research',
            2: 'Commercial',
            3: 'Clinical'
        };
        
        return consentTypeMap[consentTypeCode] || 'Unknown';
    }
}
