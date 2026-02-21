// Performance monitoring service for genetic data processing
// Tracks processing times, memory usage, and user experience metrics

import performanceTracker from '../utils/performance.js';
import { dataOptimizer } from '../utils/dataProcessingOptimizer.js';

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.thresholds = {
            processingTime: 5000, // 5 seconds
            memoryUsage: 200 * 1024 * 1024, // 200MB
            cacheHitRate: 0.7, // 70%
            errorRate: 0.05 // 5%
        };
        this.alerts = [];
        this.isMonitoring = false;
    }

    /**
     * Start performance monitoring
     */
    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        performanceTracker.init();
        
        // Monitor at regular intervals
        this.monitoringInterval = setInterval(() => {
            this._collectMetrics();
        }, 10000); // Every 10 seconds

        console.log('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        console.log('Performance monitoring stopped');
    }

    /**
     * Monitor data processing operation
     * @param {string} operationType - Type of operation
     * @param {Function} operation - Operation to monitor
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<any>} Operation result
     */
    async monitorOperation(operationType, operation, metadata = {}) {
        const operationId = `${operationType}_${Date.now()}`;
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();

        performanceTracker.mark(`${operationId}_start`);

        try {
            const result = await operation();
            
            const endTime = performance.now();
            const endMemory = this._getMemoryUsage();
            const duration = endTime - startTime;
            const memoryDelta = endMemory - startMemory;

            performanceTracker.mark(`${operationId}_end`);
            performanceTracker.measure(operationId, `${operationId}_start`, `${operationId}_end`, {
                operationType,
                duration,
                memoryDelta,
                ...metadata
            });

            // Record metrics
            this._recordMetric(operationType, {
                duration,
                memoryDelta,
                success: true,
                timestamp: Date.now(),
                metadata
            });

            // Check thresholds
            this._checkThresholds(operationType, duration, memoryDelta);

            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;

            performanceTracker.mark(`${operationId}_error`);

            // Record error metrics
            this._recordMetric(operationType, {
                duration,
                success: false,
                error: error.message,
                timestamp: Date.now(),
                metadata
            });

            throw error;
        }
    }

    /**
     * Monitor genetic data formatting
     * @param {Object} geneticData - Data to format
     * @param {Object} options - Formatting options
     * @returns {Promise<Object>} Formatted data
     */
    async monitorDataFormatting(geneticData, options = {}) {
        return this.monitorOperation('data_formatting', async () => {
            const dataSize = JSON.stringify(geneticData).length;
            
            if (dataSize > 1024 * 1024) { // > 1MB
                // Use optimizer for large datasets
                return dataOptimizer.processLargeDataset(
                    [geneticData],
                    (data) => this._formatGeneticData(data[0], options)
                );
            } else {
                return this._formatGeneticData(geneticData, options);
            }
        }, { dataSize: JSON.stringify(geneticData).length });
    }

    /**
     * Monitor variant processing
     * @param {Array} variants - Variants to process
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed variants
     */
    async monitorVariantProcessing(variants, options = {}) {
        return this.monitorOperation('variant_processing', async () => {
            return dataOptimizer.processVariants(variants, options);
        }, { variantCount: variants.length });
    }

    /**
     * Monitor sequence processing
     * @param {Array} sequences - Sequences to process
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed sequences
     */
    async monitorSequenceProcessing(sequences, options = {}) {
        return this.monitorOperation('sequence_processing', async () => {
            return dataOptimizer.processSequences(sequences, options);
        }, { sequenceCount: sequences.length });
    }

    /**
     * Get performance metrics summary
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        const summary = {};
        
        for (const [operationType, metrics] of this.metrics.entries()) {
            const successfulOps = metrics.filter(m => m.success);
            const failedOps = metrics.filter(m => !m.success);
            
            if (successfulOps.length > 0) {
                const durations = successfulOps.map(m => m.duration);
                const memoryDeltas = successfulOps.map(m => m.memoryDelta || 0);
                
                summary[operationType] = {
                    totalOperations: metrics.length,
                    successfulOperations: successfulOps.length,
                    failedOperations: failedOps.length,
                    errorRate: failedOps.length / metrics.length,
                    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                    minDuration: Math.min(...durations),
                    maxDuration: Math.max(...durations),
                    averageMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
                    p95Duration: this._calculatePercentile(durations, 95),
                    p99Duration: this._calculatePercentile(durations, 99)
                };
            }
        }

        return {
            summary,
            alerts: this.alerts,
            thresholds: this.thresholds,
            optimizerStats: dataOptimizer.getStats(),
            timestamp: Date.now()
        };
    }

    /**
     * Get performance report
     * @returns {Object} Detailed performance report
     */
    getPerformanceReport() {
        const metrics = this.getMetrics();
        const recommendations = this._generateRecommendations(metrics);
        
        return {
            ...metrics,
            recommendations,
            performanceScore: this._calculatePerformanceScore(metrics),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Clear all metrics and alerts
     */
    clearMetrics() {
        this.metrics.clear();
        this.alerts = [];
    }

    /**
     * Set performance thresholds
     * @param {Object} newThresholds - New threshold values
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    /**
     * Collect system metrics
     * @private
     */
    _collectMetrics() {
        const memoryUsage = this._getMemoryUsage();
        const optimizerStats = dataOptimizer.getStats();
        
        // Check for memory issues
        if (memoryUsage > this.thresholds.memoryUsage) {
            this._addAlert('high_memory_usage', {
                current: Math.round(memoryUsage / 1024 / 1024),
                threshold: Math.round(this.thresholds.memoryUsage / 1024 / 1024),
                unit: 'MB'
            });
        }

        // Store system metrics
        this._recordMetric('system', {
            memoryUsage,
            optimizerStats,
            timestamp: Date.now(),
            success: true
        });
    }

    /**
     * Record performance metric
     * @private
     */
    _recordMetric(operationType, metric) {
        if (!this.metrics.has(operationType)) {
            this.metrics.set(operationType, []);
        }
        
        const metrics = this.metrics.get(operationType);
        metrics.push(metric);
        
        // Keep only last 100 metrics per operation type
        if (metrics.length > 100) {
            metrics.shift();
        }
    }

    /**
     * Check performance thresholds
     * @private
     */
    _checkThresholds(operationType, duration, memoryDelta) {
        if (duration > this.thresholds.processingTime) {
            this._addAlert('slow_processing', {
                operationType,
                duration: Math.round(duration),
                threshold: this.thresholds.processingTime
            });
        }

        if (memoryDelta > this.thresholds.memoryUsage) {
            this._addAlert('high_memory_delta', {
                operationType,
                memoryDelta: Math.round(memoryDelta / 1024 / 1024),
                threshold: Math.round(this.thresholds.memoryUsage / 1024 / 1024),
                unit: 'MB'
            });
        }
    }

    /**
     * Add performance alert
     * @private
     */
    _addAlert(type, data) {
        const alert = {
            type,
            data,
            timestamp: Date.now(),
            id: `${type}_${Date.now()}`
        };
        
        this.alerts.push(alert);
        
        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }
        
        console.warn('Performance Alert:', alert);
    }

    /**
     * Get memory usage
     * @private
     */
    _getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Format genetic data (simplified)
     * @private
     */
    _formatGeneticData(geneticData, options) {
        // Simplified formatting for monitoring
        return {
            variants: geneticData.variants || [],
            genes: geneticData.genes || [],
            sequences: geneticData.sequences || [],
            metadata: {
                ...geneticData.metadata,
                processedAt: Date.now(),
                formatVersion: '1.0.0'
            }
        };
    }

    /**
     * Calculate percentile
     * @private
     */
    _calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }

    /**
     * Generate performance recommendations
     * @private
     */
    _generateRecommendations(metrics) {
        const recommendations = [];
        
        for (const [operationType, stats] of Object.entries(metrics.summary || {})) {
            if (stats.errorRate > this.thresholds.errorRate) {
                recommendations.push({
                    type: 'high_error_rate',
                    operation: operationType,
                    message: `High error rate (${(stats.errorRate * 100).toFixed(1)}%) detected for ${operationType}`,
                    suggestion: 'Review error handling and input validation'
                });
            }
            
            if (stats.averageDuration > this.thresholds.processingTime) {
                recommendations.push({
                    type: 'slow_processing',
                    operation: operationType,
                    message: `Slow processing detected for ${operationType} (avg: ${stats.averageDuration.toFixed(0)}ms)`,
                    suggestion: 'Consider using chunked processing or web workers for large datasets'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Calculate overall performance score
     * @private
     */
    _calculatePerformanceScore(metrics) {
        let score = 100;
        
        for (const [operationType, stats] of Object.entries(metrics.summary || {})) {
            // Deduct points for high error rates
            score -= stats.errorRate * 50;
            
            // Deduct points for slow processing
            if (stats.averageDuration > this.thresholds.processingTime) {
                score -= 20;
            }
            
            // Deduct points for high memory usage
            if (stats.averageMemoryDelta > this.thresholds.memoryUsage) {
                score -= 15;
            }
        }
        
        return Math.max(0, Math.round(score));
    }
}

// Create and export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
    performanceMonitor.start();
}

export default performanceMonitor;