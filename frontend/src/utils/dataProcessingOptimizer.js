// Data processing optimizer for frontend genetic data operations
// Provides chunked processing, web workers, and memory management

import performanceTracker from './performance.js';

/**
 * Data processing optimizer for large genetic datasets
 */
export class DataProcessingOptimizer {
    constructor(options = {}) {
        this.config = {
            chunkSize: options.chunkSize || 5000,
            maxMemoryUsage: options.maxMemoryUsage || 100 * 1024 * 1024, // 100MB
            useWebWorkers: options.useWebWorkers !== false,
            workerPoolSize: options.workerPoolSize || navigator.hardwareConcurrency || 4,
            ...options
        };

        this.workerPool = [];
        this.activeWorkers = 0;
        this.processingQueue = [];
        this.memoryMonitor = null;
    }

    /**
     * Initialize the optimizer
     */
    async initialize() {
        if (this.config.useWebWorkers && typeof Worker !== 'undefined') {
            await this._initializeWorkerPool();
        }
        
        this._startMemoryMonitoring();
    }

    /**
     * Process large dataset with chunking and optimization
     * @param {Array} data - Large dataset to process
     * @param {Function} processor - Processing function
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed results
     */
    async processLargeDataset(data, processor, options = {}) {
        const operationId = `processLargeDataset_${Date.now()}`;
        performanceTracker.mark(`${operationId}_start`);

        try {
            const chunkSize = options.chunkSize || this.config.chunkSize;
            const useWorkers = options.useWebWorkers !== false && this.config.useWebWorkers;
            
            if (data.length <= chunkSize) {
                // Small dataset, process directly
                const result = await processor(data);
                performanceTracker.mark(`${operationId}_end`);
                performanceTracker.measure(operationId, `${operationId}_start`, `${operationId}_end`);
                return result;
            }

            // Large dataset, process in chunks
            const chunks = this._createChunks(data, chunkSize);
            const results = [];

            if (useWorkers && this.workerPool.length > 0) {
                // Process with web workers
                results.push(...await this._processWithWorkers(chunks, processor, options));
            } else {
                // Process with chunking but no workers
                results.push(...await this._processWithChunking(chunks, processor, options));
            }

            performanceTracker.mark(`${operationId}_end`);
            performanceTracker.measure(operationId, `${operationId}_start`, `${operationId}_end`, {
                dataSize: data.length,
                chunkCount: chunks.length,
                useWorkers
            });

            return results.flat();
        } catch (error) {
            performanceTracker.mark(`${operationId}_error`);
            throw new Error(`Data processing failed: ${error.message}`);
        }
    }

    /**
     * Process genetic variants with optimization
     * @param {Array} variants - Genetic variants
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed variants
     */
    async processVariants(variants, options = {}) {
        return this.processLargeDataset(variants, (chunk) => {
            return chunk.map(variant => ({
                ...variant,
                id: variant.id || variant.rsid || `var_${Math.random().toString(36).substr(2, 9)}`,
                chromosome: this._standardizeChromosome(variant.chromosome || variant.chr),
                position: parseInt(variant.position || variant.pos) || null,
                type: this._classifyVariantType(variant),
                processed: true,
                processedAt: Date.now()
            })).filter(v => v.chromosome && v.position);
        }, options);
    }

    /**
     * Process genetic sequences with memory optimization
     * @param {Array} sequences - Genetic sequences
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed sequences
     */
    async processSequences(sequences, options = {}) {
        // Use smaller chunks for sequences due to memory usage
        const sequenceOptions = {
            ...options,
            chunkSize: Math.min(options.chunkSize || 1000, 1000)
        };

        return this.processLargeDataset(sequences, (chunk) => {
            return chunk.map(seq => {
                const sequence = seq.sequence || seq.data || '';
                return {
                    id: seq.id || seq.name || `seq_${Math.random().toString(36).substr(2, 9)}`,
                    type: seq.type || 'DNA',
                    sequence: sequence,
                    length: sequence.length,
                    gc_content: this._calculateGCContent(sequence),
                    description: seq.description || '',
                    processed: true,
                    processedAt: Date.now()
                };
            });
        }, sequenceOptions);
    }

    /**
     * Optimize data for display (pagination, filtering, sorting)
     * @param {Array} data - Data to optimize
     * @param {Object} options - Display options
     * @returns {Object} Optimized data with pagination
     */
    optimizeForDisplay(data, options = {}) {
        const {
            page = 1,
            pageSize = 50,
            sortBy = null,
            sortOrder = 'asc',
            filters = {}
        } = options;

        let processedData = [...data];

        // Apply filters
        if (Object.keys(filters).length > 0) {
            processedData = this._applyFilters(processedData, filters);
        }

        // Apply sorting
        if (sortBy) {
            processedData = this._applySorting(processedData, sortBy, sortOrder);
        }

        // Apply pagination
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = processedData.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            pagination: {
                page,
                pageSize,
                total: processedData.length,
                totalPages: Math.ceil(processedData.length / pageSize),
                hasNext: endIndex < processedData.length,
                hasPrev: page > 1
            },
            filters: filters,
            sorting: { sortBy, sortOrder }
        };
    }

    /**
     * Create data chunks for processing
     * @private
     */
    _createChunks(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Process chunks with web workers
     * @private
     */
    async _processWithWorkers(chunks, processor, options) {
        const results = [];
        const workerPromises = [];

        for (let i = 0; i < chunks.length; i++) {
            const worker = await this._getAvailableWorker();
            const promise = this._processChunkWithWorker(worker, chunks[i], processor, options);
            workerPromises.push(promise);

            // Limit concurrent workers
            if (workerPromises.length >= this.config.workerPoolSize) {
                const completedResults = await Promise.all(workerPromises);
                results.push(...completedResults);
                workerPromises.length = 0;
            }
        }

        // Process remaining chunks
        if (workerPromises.length > 0) {
            const completedResults = await Promise.all(workerPromises);
            results.push(...completedResults);
        }

        return results;
    }

    /**
     * Process chunks without workers
     * @private
     */
    async _processWithChunking(chunks, processor, options) {
        const results = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunkResult = await processor(chunks[i]);
            results.push(chunkResult);

            // Yield control periodically
            if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // Check memory usage
            if (this._isMemoryUsageHigh()) {
                await this._waitForMemoryRelease();
            }
        }

        return results;
    }

    /**
     * Initialize web worker pool
     * @private
     */
    async _initializeWorkerPool() {
        // Note: In a real implementation, you would create actual web workers
        // For now, we'll simulate the worker pool
        for (let i = 0; i < this.config.workerPoolSize; i++) {
            this.workerPool.push({
                id: i,
                busy: false,
                worker: null // Would be actual Worker instance
            });
        }
    }

    /**
     * Get available worker from pool
     * @private
     */
    async _getAvailableWorker() {
        return new Promise((resolve) => {
            const checkForWorker = () => {
                const availableWorker = this.workerPool.find(w => !w.busy);
                if (availableWorker) {
                    availableWorker.busy = true;
                    resolve(availableWorker);
                } else {
                    setTimeout(checkForWorker, 10);
                }
            };
            checkForWorker();
        });
    }

    /**
     * Process chunk with worker (simulated)
     * @private
     */
    async _processChunkWithWorker(worker, chunk, processor, options) {
        try {
            // In a real implementation, this would send data to web worker
            // For now, we'll process directly but simulate async behavior
            await new Promise(resolve => setTimeout(resolve, 1));
            const result = await processor(chunk);
            return result;
        } finally {
            worker.busy = false;
        }
    }

    /**
     * Start memory monitoring
     * @private
     */
    _startMemoryMonitoring() {
        if (typeof performance !== 'undefined' && performance.memory) {
            this.memoryMonitor = setInterval(() => {
                const memoryInfo = performance.memory;
                if (memoryInfo.usedJSHeapSize > this.config.maxMemoryUsage) {
                    console.warn('High memory usage detected:', {
                        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
                        limit: Math.round(this.config.maxMemoryUsage / 1024 / 1024) + 'MB'
                    });
                }
            }, 5000);
        }
    }

    /**
     * Check if memory usage is high
     * @private
     */
    _isMemoryUsageHigh() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize > this.config.maxMemoryUsage;
        }
        return false;
    }

    /**
     * Wait for memory to be released
     * @private
     */
    async _waitForMemoryRelease() {
        // Force garbage collection if available
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
        
        // Wait a bit for memory to be released
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Standardize chromosome notation
     * @private
     */
    _standardizeChromosome(chr) {
        if (!chr) return null;
        
        const chrStr = String(chr).toLowerCase();
        const cleaned = chrStr.startsWith('chr') ? chrStr.substring(3) : chrStr;
        
        if (cleaned === 'x') return 'X';
        if (cleaned === 'y') return 'Y';
        if (cleaned === 'm' || cleaned === 'mt') return 'MT';
        if (/^\d+$/.test(cleaned)) return cleaned;
        
        return cleaned.toUpperCase();
    }

    /**
     * Classify variant type
     * @private
     */
    _classifyVariantType(variant) {
        if (variant.type) return variant.type;
        
        const ref = variant.reference || variant.ref || '';
        const alt = variant.alternate || variant.alt || '';
        
        if (ref.length === 1 && alt.length === 1) {
            return 'SNP';
        } else if (ref.length > alt.length) {
            return 'DELETION';
        } else if (ref.length < alt.length) {
            return 'INSERTION';
        } else {
            return 'COMPLEX';
        }
    }

    /**
     * Calculate GC content of a sequence
     * @private
     */
    _calculateGCContent(sequence) {
        if (!sequence) return 0;
        
        const gcCount = (sequence.match(/[GCgc]/g) || []).length;
        return Math.round((gcCount / sequence.length) * 100 * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Apply filters to data
     * @private
     */
    _applyFilters(data, filters) {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (value === null || value === undefined || value === '') return true;
                
                const itemValue = item[key];
                if (typeof value === 'string') {
                    return String(itemValue).toLowerCase().includes(value.toLowerCase());
                }
                
                return itemValue === value;
            });
        });
    }

    /**
     * Apply sorting to data
     * @private
     */
    _applySorting(data, sortBy, sortOrder) {
        return data.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            
            if (aVal === bVal) return 0;
            
            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    getStats() {
        return {
            config: this.config,
            workerPool: {
                size: this.workerPool.length,
                active: this.activeWorkers,
                available: this.workerPool.filter(w => !w.busy).length
            },
            memory: typeof performance !== 'undefined' && performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor);
            this.memoryMonitor = null;
        }

        // Cleanup workers
        this.workerPool.forEach(worker => {
            if (worker.worker && worker.worker.terminate) {
                worker.worker.terminate();
            }
        });
        
        this.workerPool = [];
        this.processingQueue = [];
    }
}

// Create and export singleton instance
export const dataOptimizer = new DataProcessingOptimizer();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
    dataOptimizer.initialize().catch(console.error);
}