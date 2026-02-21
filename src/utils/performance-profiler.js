// Performance profiler for genetic data processing
// Provides detailed timing and memory usage analysis

export class PerformanceProfiler {
    constructor() {
        this.profiles = new Map();
        this.activeProfiles = new Map();
        this.memoryBaseline = null;
    }

    /**
     * Start profiling a function or operation
     * @param {string} name - Profile name
     * @param {Object} metadata - Additional metadata
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
     * @param {string} name - Profile name
     * @param {string} checkpoint - Checkpoint name
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
     * @param {string} name - Profile name
     * @returns {Object} Profile results
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