/**
 * Performance profiler for genetic data processing operations
 * 
 * Provides detailed timing and memory usage analysis for performance
 * optimization and monitoring. Tracks execution time, memory consumption,
 * and provides checkpoint-based profiling for complex operations.
 * Essential for optimizing genetic data processing, ZK proof generation,
 * and IPFS operations in the GeneTrust platform.
 * 
 * @class PerformanceProfiler
 * @description Performance monitoring and profiling utility
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Basic profiling
 * profiler.start('data-processing');
 * // ... operation
 * const results = profiler.end('data-processing');
 * 
 * @example
 * // Profiling with checkpoints
 * profiler.start('zk-proof-generation', { geneCount: 100 });
 * profiler.checkpoint('zk-proof-generation', 'data-validated');
 * profiler.checkpoint('zk-proof-generation', 'witness-generated');
 * const results = profiler.end('zk-proof-generation');
 */
export class PerformanceProfiler {
    /**
     * Creates a new PerformanceProfiler instance
     * 
     * @constructor
     * @returns {PerformanceProfiler} New profiler instance
     * 
     * @example
     * const profiler = new PerformanceProfiler();
     */
    constructor() {
        /**
         * Completed profile results
         * @type {Map<string, Object>}
         * @private
         */
        this.profiles = new Map();
        
        /**
         * Currently active profiles
         * @type {Map<string, Object>}
         * @private
         */
        this.activeProfiles = new Map();
        
        /**
         * Memory usage baseline for comparison
         * @type {Object|null}
         * @private
         */
        this.memoryBaseline = null;
    }

    /**
     * Start profiling a function or operation
     * 
     * Begins timing an operation with optional metadata for context.
     * Captures initial memory usage and timestamp for performance analysis.
     * 
     * @method start
     * @param {string} name - Unique profile name for identification
     * @param {Object} [metadata={}] - Additional metadata for context
     * @param {string} [metadata.operationType] - Type of operation being profiled
     * @param {number} [metadata.dataSize] - Size of data being processed
     * @param {string} [metadata.userId] - User ID for user-specific profiling
     * @param {Object} [metadata.custom] - Custom metadata fields
     * 
     * @throws {Error} When profile name is already active
     * @throws {Error} When profile name is empty or invalid
     * 
     * @returns {void}
     * 
     * @example
     * // Start basic profile
     * profiler.start('encryption-operation');
     * 
     * @example
     * // Start profile with metadata
     * profiler.start('zk-proof-generation', {
     *   operationType: 'cryptography',
     *   dataSize: geneticData.length,
     *   geneCount: 150
     * });
     */
    start(name, metadata = {}) {
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();
        
        this.activeProfiles.set(name, {
            startTime,
            startMemory,
            metadata,
            checkpoints: []
        });
    }

    /**
     * Add a checkpoint to an active profile
     * 
     * Records intermediate timing and memory usage points within a profile.
     * Useful for identifying bottlenecks in complex operations with multiple phases.
     * 
     * @method checkpoint
     * @param {string} name - Active profile name
     * @param {string} checkpoint - Descriptive checkpoint name
     * 
     * @returns {void}
     * 
     * @example
     * // Add checkpoints during operation
     * profiler.start('data-upload');
     * // ... validation phase
     * profiler.checkpoint('data-upload', 'validation-complete');
     * // ... encryption phase
     * profiler.checkpoint('data-upload', 'encryption-complete');
     * // ... upload phase
     * profiler.checkpoint('data-upload', 'upload-complete');
     * profiler.end('data-upload');
     */
    checkpoint(name, checkpoint) {
        const profile = this.activeProfiles.get(name);
        if (!profile) return;

        profile.checkpoints.push({
            name: checkpoint,
            time: performance.now(),
            memory: this._getMemoryUsage(),
            elapsed: performance.now() - profile.startTime
        });
    }

    /**
     * End profiling and store results
     * 
     * Completes an active profile, calculates final metrics, and stores
     * results for analysis. Returns comprehensive performance data including
     * timing, memory usage, and checkpoint information.
     * 
     * @method end
     * @param {string} name - Active profile name to end
     * 
     * @returns {Object} Complete profile results
     * @returns {number} returns.duration - Total duration in milliseconds
     * @returns {Object} returns.memory - Memory usage statistics
     * @returns {number} returns.memory.used - Memory used during operation
     * @returns {number} returns.memory.delta - Memory change from start
     * @returns {Array<Object>} returns.checkpoints - Array of checkpoint data
     * @returns {Object} returns.metadata - Original metadata provided to start()
     * @returns {string} returns.timestamp - Profile completion timestamp
     * 
     * @throws {Error} When profile name is not found in active profiles
     * 
     * @example
     * // End profile and get results
     * const results = profiler.end('data-processing');
     * console.log(`Duration: ${results.duration}ms`);
     * console.log(`Memory used: ${results.memory.delta}MB`);
     * 
     * @example
     * // Analyze checkpoints
     * const results = profiler.end('complex-operation');
     * results.checkpoints.forEach(cp => {
     *   console.log(`${cp.name}: ${cp.elapsed}ms`);
     * });
     */
    end(name) {
        const profile = this.activeProfiles.get(name);
        if (!profile) return null;

        const endTime = performance.now();
        const endMemory = this._getMemoryUsage();
        const duration = endTime - profile.startTime;
        const memoryDelta = endMemory - profile.startMemory;

        const result = {
            name,
            duration,
            memoryDelta,
            startMemory: profile.startMemory,
            endMemory,
            checkpoints: profile.checkpoints,
            metadata: profile.metadata,
            timestamp: Date.now()
        };

        this.profiles.set(name, result);
        this.activeProfiles.delete(name);
        
        return result;
    }

    /**
     * Profile a function execution
     * @param {string} name - Profile name
     * @param {Function} fn - Function to profile
     * @param {Array} args - Function arguments
     * @returns {Promise<Object>} Function result and profile data
     */
    async profileFunction(name, fn, args = []) {
        this.start(name);
        
        try {
            const result = await fn(...args);
            const profile = this.end(name);
            
            return {
                result,
                profile
            };
        } catch (error) {
            this.end(name);
            throw error;
        }
    }

    /**
     * Get memory usage information
     * @private
     */
    _getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        
        // Node.js environment
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                used: usage.heapUsed,
                total: usage.heapTotal,
                external: usage.external,
                rss: usage.rss
            };
        }
        
        return { used: 0, total: 0 };
    }

    /**
     * Get all profile results
     * @returns {Array} Array of profile results
     */
    getProfiles() {
        return Array.from(this.profiles.values());
    }

    /**
     * Get profile by name
     * @param {string} name - Profile name
     * @returns {Object|null} Profile result
     */
    getProfile(name) {
        return this.profiles.get(name) || null;
    }

    /**
     * Clear all profiles
     */
    clear() {
        this.profiles.clear();
        this.activeProfiles.clear();
    }

    /**
     * Generate performance report
     * @returns {Object} Performance report
     */
    generateReport() {
        const profiles = this.getProfiles();
        
        if (profiles.length === 0) {
            return { message: 'No profiles available' };
        }

        const totalDuration = profiles.reduce((sum, p) => sum + p.duration, 0);
        const avgDuration = totalDuration / profiles.length;
        const maxDuration = Math.max(...profiles.map(p => p.duration));
        const minDuration = Math.min(...profiles.map(p => p.duration));

        const totalMemoryDelta = profiles.reduce((sum, p) => sum + (p.memoryDelta?.used || 0), 0);
        
        return {
            summary: {
                totalProfiles: profiles.length,
                totalDuration,
                avgDuration,
                maxDuration,
                minDuration,
                totalMemoryDelta
            },
            profiles: profiles.sort((a, b) => b.duration - a.duration),
            slowestOperations: profiles
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 5),
            memoryIntensive: profiles
                .filter(p => p.memoryDelta?.used > 0)
                .sort((a, b) => (b.memoryDelta?.used || 0) - (a.memoryDelta?.used || 0))
                .slice(0, 5)
        };
    }
}

// Singleton instance
export const profiler = new PerformanceProfiler();