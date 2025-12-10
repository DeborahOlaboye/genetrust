// Performance configuration for GeneTrust data processing
// Centralized configuration for all performance optimizations

export class PerformanceConfig {
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