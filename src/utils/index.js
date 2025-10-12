// Main export file for utility components
// Provides unified interface for all utility functions

export { CryptoUtils } from './crypto-utils.js';
export { DataFormatter } from './data-formatter.js';

/**
 * Utility Factory - Simplified access to common utility functions
 */
export class UtilityFactory {
    /**
     * Get crypto utilities
     * @returns {CryptoUtils} Crypto utilities class
     */
    static getCryptoUtils() {
        return CryptoUtils;
    }

    /**
     * Get data formatter
     * @returns {DataFormatter} Data formatter class
     */
    static getDataFormatter() {
        return DataFormatter;
    }

    /**
     * Create a secure hash of data
     * @param {any} data - Data to hash
     * @param {string} algorithm - Hash algorithm
     * @returns {string} Hash value
     */
    static hash(data, algorithm = 'sha256') {
        return CryptoUtils.generateHash(data, 'hex');
    }

    /**
     * Generate a secure random key
     * @param {number} length - Key length in bytes
     * @returns {string} Generated key
     */
    static generateKey(length = 32) {
        return CryptoUtils.generateSecureKey(length);
    }

    /**
     * Format genetic data for storage
     * @param {Object} data - Raw genetic data
     * @param {Object} options - Formatting options
     * @returns {Object} Formatted data
     */
    static formatGeneticData(data, options = {}) {
        return DataFormatter.formatForStorage(data, options);
    }

    /**
     * Validate data integrity
     * @param {any} data - Data to validate
     * @param {string} checksum - Expected checksum
     * @returns {boolean} True if data is intact
     */
    static validateIntegrity(data, checksum) {
        return CryptoUtils.validateDataIntegrity(data, checksum);
    }

    /**
     * Create a data fingerprint
     * @param {Object} data - Data to fingerprint
     * @param {Object} options - Fingerprinting options
     * @returns {string} Data fingerprint
     */
    static createFingerprint(data, options = {}) {
        return CryptoUtils.createDataFingerprint(data, options);
    }
}
