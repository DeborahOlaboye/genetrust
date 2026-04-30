/**
 * Performance configuration management for GeneTrust data processing
 * 
 * Centralizes all performance optimization settings across the GeneTrust platform
 * including data processing, caching, IPFS operations, encryption, and monitoring.
 * Provides environment-specific configurations and customizable parameters for
 * optimal performance in different deployment scenarios.
 * 
 * @class PerformanceConfig
 * @description Performance optimization configuration manager
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Get development configuration
 * const devConfig = PerformanceConfig.getConfig('development');
 * 
 * @example
 * // Get production configuration
 * const prodConfig = PerformanceConfig.getConfig('production');
 * 
 * @example
 * // Create custom configuration
 * const customConfig = PerformanceConfig.createCustom({
 *   chunkSize: 20000,
 *   cacheSize: 200
 * });
 */
export class PerformanceConfig {
    /**
     * Default performance configuration settings
     * Used as base configuration for all environments
     * 
     * @readonly
     * @static
     * @type {Object}
     * @property {number} chunkSize - Data processing chunk size (default: 10000)
     * @property {number} memoryThreshold - Memory threshold in bytes (default: 100MB)
     * @property {number} maxConcurrentOps - Maximum concurrent operations (default: 5)
     * @property {boolean} cacheEnabled - Enable caching (default: true)
     * @property {number} cacheSize - Cache size limit (default: 100)
     * @property {number} cacheTTL - Cache TTL in milliseconds (default: 1 hour)
     * @property {number} maxConcurrentUploads - Max concurrent IPFS uploads (default: 5)
     * @property {number} batchSize - IPFS batch size (default: 10)
     * @property {number} retryAttempts - Retry attempts for operations (default: 3)
     * @property {number} timeout - Operation timeout in milliseconds (default: 30s)
     * @property {boolean} parallelEncryption - Enable parallel encryption (default: true)
     * @property {number} keyDerivationIterations - PBKDF2 iterations (default: 100000)
     * @property {boolean} performanceMonitoring - Enable performance monitoring (default: true)
     * @property {boolean} profilingEnabled - Enable profiling (default: true)
     * @property {Object} alertThresholds - Performance alert thresholds
     * @property {number} alertThresholds.processingTime - Processing time threshold (default: 5s)
     * @property {number} alertThresholds.memoryUsage - Memory usage threshold (default: 200MB)
     * @property {number} alertThresholds.errorRate - Error rate threshold (default: 5%)
     */
    static DEFAULT_CONFIG = {
        // Data processing
        chunkSize: 10000,
        memoryThreshold: 100 * 1024 * 1024, // 100MB
        maxConcurrentOps: 5,
        
        // Caching
        cacheEnabled: true,
        cacheSize: 100,
        cacheTTL: 3600000, // 1 hour
        
        // IPFS
        maxConcurrentUploads: 5,
        batchSize: 10,
        retryAttempts: 3,
        timeout: 30000,
        
        // Encryption
        parallelEncryption: true,
        keyDerivationIterations: 100000,
        
        // Monitoring
        performanceMonitoring: true,
        profilingEnabled: true,
        alertThresholds: {
            processingTime: 5000,
            memoryUsage: 200 * 1024 * 1024,
            errorRate: 0.05
        }
    };

    /**
     * Get performance configuration for a specific environment
     * 
     * Returns environment-specific performance settings optimized for
     * different deployment scenarios. Includes development, testing,
     * staging, and production configurations.
     * 
     * @static
     * @method getConfig
     * 
     * @param {string} [environment='development'] - Target environment
     * @returns {Object} Performance configuration object
     * @returns {number} returns.chunkSize - Chunk size for data processing
     * @returns {number} returns.memoryThreshold - Memory usage threshold
     * @returns {number} returns.maxConcurrentOps - Maximum concurrent operations
     * @returns {Object} returns.caching - Caching configuration
     * @returns {Object} returns.ipfs - IPFS operation settings
     * @returns {Object} returns.encryption - Encryption settings
     * @returns {Object} returns.monitoring - Monitoring and profiling settings
     * 
     * @throws {Error} When environment is not supported
     * 
     * @example
     * // Get development config (optimized for debugging)
     * const devConfig = PerformanceConfig.getConfig('development');
     * 
     * @example
     * // Get production config (optimized for performance)
     * const prodConfig = PerformanceConfig.getConfig('production');
     * 
     * @example
     * // Get testing config (minimal resources)
     * const testConfig = PerformanceConfig.getConfig('testing');
     */
    static getConfig(environment = 'development') {
        const configs = {
            development: {
                ...this.DEFAULT_CONFIG,
                chunkSize: 5000,
                cacheSize: 50,
                profilingEnabled: true
            },
            
            testing: {
                ...this.DEFAULT_CONFIG,
                chunkSize: 1000,
                cacheSize: 10,
                timeout: 5000,
                performanceMonitoring: false
            },
            
            production: {
                ...this.DEFAULT_CONFIG,
                chunkSize: 15000,
                cacheSize: 200,
                maxConcurrentOps: 10,
                profilingEnabled: false
            }
        };

        return configs[environment] || this.DEFAULT_CONFIG;
    }

    static optimizeForDataset(datasetSize) {
        const config = { ...this.DEFAULT_CONFIG };
        
        if (datasetSize < 1000) {
            // Small dataset
            config.chunkSize = 500;
            config.maxConcurrentOps = 2;
        } else if (datasetSize < 10000) {
            // Medium dataset
            config.chunkSize = 2000;
            config.maxConcurrentOps = 3;
        } else if (datasetSize < 100000) {
            // Large dataset
            config.chunkSize = 10000;
            config.maxConcurrentOps = 5;
        } else {
            // Very large dataset
            config.chunkSize = 20000;
            config.maxConcurrentOps = 8;
            config.cacheSize = 50; // Reduce cache for memory
        }
        
        return config;
    }
}