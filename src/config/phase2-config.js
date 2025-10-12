// Configuration settings for Phase 2 components
// Manages settings for ZK proofs, storage, and contract integration

/**
 * Phase 2 Configuration Manager
 * Centralizes all configuration for ZK proofs, IPFS storage, and contract integration
 */
export class Phase2Config {
    constructor(environment = 'development') {
        this.environment = environment;
        this._initializeConfig();
    }

    /**
     * Initialize configuration based on environment
     * @private
     */
    _initializeConfig() {
        // Base configuration
        this.config = {
            // Environment settings
            environment: this.environment,
            debug: this.environment === 'development',
            
            // ZK Proof Configuration
            zkProofs: {
                // Proof generation settings
                defaultAlgorithm: 'simplified-zk-snark',
                version: '1.0.0',
                maxProofSize: 256, // bytes for contract parameters
                
                // Proof types and their settings
                proofTypes: {
                    genePresence: {
                        id: 1,
                        algorithm: 'simplified-zk-snark',
                        privacyLevel: 'high',
                        maxTargetGenes: 100
                    },
                    geneAbsence: {
                        id: 2,
                        algorithm: 'simplified-zk-snark-absence',
                        privacyLevel: 'high',
                        maxTargetGenes: 100
                    },
                    geneVariant: {
                        id: 3,
                        algorithm: 'simplified-zk-snark-variant',
                        privacyLevel: 'medium',
                        maxVariants: 1000,
                        confidenceThreshold: 0.8
                    },
                    aggregate: {
                        id: 4,
                        algorithm: 'simplified-zk-snark-aggregate',
                        privacyLevel: 'medium',
                        maxDataPoints: 10000,
                        confidenceLevel: 0.95
                    }
                },
                
                // Performance settings
                batchSize: 10,
                timeout: 30000, // 30 seconds
                retries: 3
            },
            
            // IPFS Storage Configuration
            ipfs: {
                // Connection settings
                host: 'localhost',
                port: 5001,
                protocol: 'http',
                timeout: 30000,
                
                // Storage settings
                autoPinning: true,
                compressionEnabled: true,
                encryptionEnabled: true,
                maxFileSize: 100 * 1024 * 1024, // 100MB
                
                // Gateway settings
                gateways: [
                    'https://ipfs.io',
                    'https://gateway.pinata.cloud',
                    'https://cloudflare-ipfs.com'
                ],
                defaultGateway: 'https://ipfs.io'
            },
            
            // Encryption Configuration
            encryption: {
                // Algorithm settings
                algorithm: 'aes-256-gcm',
                keyDerivationIterations: 100000,
                saltLength: 32,
                ivLength: 16,
                tagLength: 16,
                
                // Access level encryption
                accessLevels: {
                    1: { keySize: 16, algorithm: 'aes-128-gcm' }, // Basic
                    2: { keySize: 24, algorithm: 'aes-192-gcm' }, // Detailed
                    3: { keySize: 32, algorithm: 'aes-256-gcm' }  // Full
                },
                
                // Password requirements
                passwordPolicy: {
                    minLength: 12,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true,
                    forbiddenPatterns: ['123456', 'password', 'qwerty']
                }
            },
            
            // Contract Integration Configuration
            contracts: {
                // Network settings
                network: this.environment === 'production' ? 'mainnet' : 'testnet',
                
                // Contract addresses (will be set after deployment)
                addresses: {
                    geneticData: null,
                    marketplace: null,
                    verification: null,
                    compliance: null
                },
                
                // Transaction settings
                gasLimit: 100000,
                gasPrice: 1000,
                
                // Retry and timeout settings
                maxRetries: 3,
                retryDelay: 2000,
                timeout: 60000
            },
            
            // Data Processing Configuration
            dataProcessing: {
                // Validation settings
                strictValidation: this.environment === 'production',
                validateChecksums: true,
                requireMetadata: true,
                
                // Format support
                supportedFormats: ['json', 'vcf', 'fasta', 'csv'],
                defaultFormat: 'json',
                
                // Size limits
                maxDataSize: 50 * 1024 * 1024, // 50MB
                maxVariants: 1000000,
                maxGenes: 100000,
                maxSequenceLength: 10000000,
                
                // Processing options
                parallel: true,
                maxConcurrency: 4,
                chunkSize: 10000
            },
            
            // API Configuration
            api: {
                // Rate limiting
                rateLimit: {
                    enabled: true,
                    windowMs: 15 * 60 * 1000, // 15 minutes
                    maxRequests: 100
                },
                
                // CORS settings
                cors: {
                    enabled: true,
                    origins: this.environment === 'production' ? 
                        ['https://genomicchain.org'] : 
                        ['http://localhost:3000', 'http://localhost:8080']
                },
                
                // Security settings
                security: {
                    helmet: true,
                    apiKeyRequired: this.environment === 'production',
                    httpsOnly: this.environment === 'production'
                }
            },
            
            // Logging Configuration
            logging: {
                level: this.environment === 'development' ? 'debug' : 'info',
                format: 'json',
                maxFiles: 5,
                maxSize: '10MB',
                
                // Log categories
                categories: {
                    zkProofs: true,
                    storage: true,
                    contracts: true,
                    api: true,
                    security: true
                }
            },
            
            // Monitoring Configuration
            monitoring: {
                enabled: this.environment === 'production',
                metricsInterval: 60000, // 1 minute
                
                // Performance thresholds
                thresholds: {
                    proofGenerationTime: 10000, // 10 seconds
                    storageUploadTime: 30000,   // 30 seconds
                    contractCallTime: 15000,    // 15 seconds
                    memoryUsage: 512 * 1024 * 1024 // 512MB
                },
                
                // Alerting
                alerts: {
                    enabled: this.environment === 'production',
                    endpoints: [],
                    channels: ['email', 'slack']
                }
            }
        };

        // Environment-specific overrides
        this._applyEnvironmentOverrides();
    }

    /**
     * Apply environment-specific configuration overrides
     * @private
     */
    _applyEnvironmentOverrides() {
        switch (this.environment) {
            case 'development':
                this._applyDevelopmentConfig();
                break;
            case 'testing':
                this._applyTestingConfig();
                break;
            case 'staging':
                this._applyStagingConfig();
                break;
            case 'production':
                this._applyProductionConfig();
                break;
        }
    }

    /**
     * Development environment configuration
     * @private
     */
    _applyDevelopmentConfig() {
        this.config.zkProofs.timeout = 60000; // Longer timeout for debugging
        this.config.ipfs.autoPinning = false; // Don't auto-pin in dev
        this.config.encryption.passwordPolicy.minLength = 8; // Relaxed for testing
        this.config.dataProcessing.strictValidation = false;
        this.config.logging.level = 'debug';
        this.config.monitoring.enabled = false;
    }

    /**
     * Testing environment configuration
     * @private
     */
    _applyTestingConfig() {
        this.config.zkProofs.timeout = 10000; // Faster for tests
        this.config.ipfs.host = 'localhost';
        this.config.ipfs.port = 5002; // Different port for test IPFS
        this.config.encryption.keyDerivationIterations = 1000; // Faster for tests
        this.config.dataProcessing.maxDataSize = 1024 * 1024; // 1MB limit
        this.config.logging.level = 'warn';
        this.config.monitoring.enabled = false;
    }

    /**
     * Staging environment configuration
     * @private
     */
    _applyStagingConfig() {
        this.config.contracts.network = 'testnet';
        this.config.ipfs.host = 'staging-ipfs.genomicchain.org';
        this.config.api.security.httpsOnly = true;
        this.config.monitoring.enabled = true;
        this.config.monitoring.alerts.enabled = false; // No alerts in staging
    }

    /**
     * Production environment configuration
     * @private
     */
    _applyProductionConfig() {
        this.config.contracts.network = 'mainnet';
        this.config.ipfs.host = 'ipfs.genomicchain.org';
        this.config.api.security.httpsOnly = true;
        this.config.api.security.apiKeyRequired = true;
        this.config.dataProcessing.strictValidation = true;
        this.config.logging.level = 'info';
        this.config.monitoring.enabled = true;
        this.config.monitoring.alerts.enabled = true;
    }

    /**
     * Get configuration for a specific component
     * @param {string} component - Component name
     * @returns {Object} Component configuration
     */
    getConfig(component = null) {
        if (!component) {
            return { ...this.config };
        }

        if (this.config[component]) {
            return { ...this.config[component] };
        }

        throw new Error(`Unknown component: ${component}`);
    }

    /**
     * Update configuration for a component
     * @param {string} component - Component name
     * @param {Object} updates - Configuration updates
     */
    updateConfig(component, updates) {
        if (!this.config[component]) {
            throw new Error(`Unknown component: ${component}`);
        }

        this.config[component] = {
            ...this.config[component],
            ...updates
        };
    }

    /**
     * Get IPFS configuration
     * @returns {Object} IPFS configuration
     */
    getIPFSConfig() {
        return this.getConfig('ipfs');
    }

    /**
     * Get ZK Proof configuration
     * @returns {Object} ZK Proof configuration
     */
    getZKProofConfig() {
        return this.getConfig('zkProofs');
    }

    /**
     * Get Encryption configuration
     * @returns {Object} Encryption configuration
     */
    getEncryptionConfig() {
        return this.getConfig('encryption');
    }

    /**
     * Get Contract configuration
     * @returns {Object} Contract configuration
     */
    getContractConfig() {
        return this.getConfig('contracts');
    }

    /**
     * Set contract addresses after deployment
     * @param {Object} addresses - Contract addresses
     */
    setContractAddresses(addresses) {
        this.config.contracts.addresses = {
            ...this.config.contracts.addresses,
            ...addresses
        };
    }

    /**
     * Validate configuration
     * @returns {Object} Validation result
     */
    validateConfig() {
        const errors = [];
        const warnings = [];

        // Validate IPFS config
        if (!this.config.ipfs.host) {
            errors.push('IPFS host not configured');
        }

        // Validate contract addresses in production
        if (this.environment === 'production') {
            const addresses = this.config.contracts.addresses;
            if (!addresses.geneticData || !addresses.marketplace || 
                !addresses.verification || !addresses.compliance) {
                errors.push('Contract addresses not fully configured for production');
            }
        }

        // Validate encryption settings
        if (this.config.encryption.keyDerivationIterations < 10000 && 
            this.environment === 'production') {
            warnings.push('Key derivation iterations may be too low for production');
        }

        // Validate data processing limits
        if (this.config.dataProcessing.maxDataSize > 100 * 1024 * 1024) {
            warnings.push('Maximum data size may be too large');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Export configuration to JSON
     * @param {boolean} includeSecrets - Whether to include sensitive information
     * @returns {string} JSON configuration
     */
    exportConfig(includeSecrets = false) {
        const exportConfig = { ...this.config };

        if (!includeSecrets) {
            // Remove sensitive information
            delete exportConfig.contracts.addresses;
            delete exportConfig.api.security;
            delete exportConfig.monitoring.alerts.endpoints;
        }

        return JSON.stringify(exportConfig, null, 2);
    }

    /**
     * Import configuration from JSON
     * @param {string} jsonConfig - JSON configuration string
     * @param {boolean} merge - Whether to merge with existing config
     */
    importConfig(jsonConfig, merge = true) {
        try {
            const importedConfig = JSON.parse(jsonConfig);
            
            if (merge) {
                this.config = this._deepMerge(this.config, importedConfig);
            } else {
                this.config = importedConfig;
            }
        } catch (error) {
            throw new Error(`Invalid configuration JSON: ${error.message}`);
        }
    }

    /**
     * Deep merge two configuration objects
     * @private
     */
    _deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Get environment-specific database URL
     * @returns {string} Database connection URL
     */
    getDatabaseUrl() {
        const dbConfig = {
            development: 'sqlite://./genomic-chain-dev.db',
            testing: 'sqlite://./genomic-chain-test.db',
            staging: process.env.STAGING_DATABASE_URL || 'postgresql://staging-db',
            production: process.env.PRODUCTION_DATABASE_URL || 'postgresql://prod-db'
        };

        return dbConfig[this.environment] || dbConfig.development;
    }

    /**
     * Get Redis configuration for caching
     * @returns {Object} Redis configuration
     */
    getRedisConfig() {
        return {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || null,
            db: this.environment === 'testing' ? 1 : 0,
            keyPrefix: `genomic-chain:${this.environment}:`
        };
    }

    /**
     * Get feature flags
     * @returns {Object} Feature flags
     */
    getFeatureFlags() {
        return {
            enableZKProofs: true,
            enableIPFSStorage: true,
            enableCompliance: true,
            enableMarketplace: true,
            enableBatchProcessing: this.environment !== 'testing',
            enableMetrics: this.environment === 'production',
            enableDebugLogging: this.environment === 'development'
        };
    }

    /**
     * Create a configuration instance for a specific environment
     * @param {string} environment - Target environment
     * @returns {Phase2Config} Configuration instance
     */
    static forEnvironment(environment) {
        return new Phase2Config(environment);
    }

    /**
     * Load configuration from environment variables
     * @returns {Phase2Config} Configuration instance
     */
    static fromEnvironment() {
        const environment = process.env.NODE_ENV || 'development';
        const config = new Phase2Config(environment);

        // Override with environment variables if available
        if (process.env.IPFS_HOST) {
            config.updateConfig('ipfs', { host: process.env.IPFS_HOST });
        }
        
        if (process.env.IPFS_PORT) {
            config.updateConfig('ipfs', { port: parseInt(process.env.IPFS_PORT) });
        }

        return config;
    }
}
