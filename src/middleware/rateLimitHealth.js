/**
 * Rate limiting health check utilities
 * Provides health monitoring and diagnostic tools for rate limiting system
 */

import { RateLimitMonitor } from './rateLimitMonitor.js';

/**
 * Health check status levels
 * @readonly
 * @enum {string}
 */
export const HealthStatus = {
    HEALTHY: 'healthy',
    WARNING: 'warning',
    CRITICAL: 'critical',
    UNKNOWN: 'unknown'
};

/**
 * Rate limiting health checker
 */
export class RateLimitHealth {
    constructor(monitor = null) {
        this.monitor = monitor || new RateLimitMonitor();
        this.thresholds = {
            maxBlockRate: 10, // 10% block rate threshold
            maxMemoryUsage: 80, // 80% memory usage threshold
            minCacheHitRate: 50, // 50% cache hit rate threshold
            maxResponseTime: 100 // 100ms response time threshold
        };
    }

    /**
     * Check overall health of rate limiting system
     * @param {Object} options - Check options
     * @returns {Object} Health check result
     */
    checkHealth(options = {}) {
        const checks = {
            blockRate: this.checkBlockRate(),
            memoryUsage: this.checkMemoryUsage(),
            cachePerformance: this.checkCachePerformance(),
            responseTime: this.checkResponseTime(),
            errorRate: this.checkErrorRate()
        };

        const overallStatus = this.determineOverallStatus(checks);
        const summary = this.generateSummary(checks, overallStatus);

        return {
            status: overallStatus,
            checks,
            summary,
            timestamp: new Date().toISOString(),
            uptime: this.monitor.getSummary().uptime
        };
    }

    /**
     * Check block rate health
     * @private
     * @returns {Object} Block rate check result
     */
    checkBlockRate() {
        const summary = this.monitor.getSummary();
        const blockRate = parseFloat(summary.overallBlockRate) || 0;

        return {
            status: blockRate > this.thresholds.maxBlockRate ? HealthStatus.WARNING : HealthStatus.HEALTHY,
            value: blockRate,
            threshold: this.thresholds.maxBlockRate,
            message: blockRate > this.thresholds.maxBlockRate 
                ? `High block rate: ${blockRate}% (threshold: ${this.thresholds.maxBlockRate}%)`
                : `Block rate normal: ${blockRate}%`
        };
    }

    /**
     * Check memory usage health
     * @private
     * @returns {Object} Memory usage check result
     */
    checkMemoryUsage() {
        const allMetrics = this.monitor.getAllMetrics();
        const totalEntries = allMetrics.reduce((sum, m) => sum + (m.windows?.length || 0), 0);
        
        // Simulate memory usage (in real implementation, use process.memoryUsage())
        const memoryUsage = Math.min(100, (totalEntries / 10000) * 100);

        return {
            status: memoryUsage > this.thresholds.maxMemoryUsage ? HealthStatus.CRITICAL : HealthStatus.HEALTHY,
            value: memoryUsage,
            threshold: this.thresholds.maxMemoryUsage,
            message: memoryUsage > this.thresholds.maxMemoryUsage
                ? `High memory usage: ${memoryUsage}% (threshold: ${this.thresholds.maxMemoryUsage}%)`
                : `Memory usage normal: ${memoryUsage}%`
        };
    }

    /**
     * Check cache performance health
     * @private
     * @returns {Object} Cache performance check result
     */
    checkCachePerformance() {
        // This would need access to actual cache stats
        // For now, return a healthy status
        const hitRate = 75; // Simulated hit rate

        return {
            status: hitRate < this.thresholds.minCacheHitRate ? HealthStatus.WARNING : HealthStatus.HEALTHY,
            value: hitRate,
            threshold: this.thresholds.minCacheHitRate,
            message: hitRate < this.thresholds.minCacheHitRate
                ? `Low cache hit rate: ${hitRate}% (threshold: ${this.thresholds.minCacheHitRate}%)`
                : `Cache performance normal: ${hitRate}% hit rate`
        };
    }

    /**
     * Check response time health
     * @private
     * @returns {Object} Response time check result
     */
    checkResponseTime() {
        // In real implementation, track actual response times
        const avgResponseTime = 45; // Simulated response time in ms

        return {
            status: avgResponseTime > this.thresholds.maxResponseTime ? HealthStatus.WARNING : HealthStatus.HEALTHY,
            value: avgResponseTime,
            threshold: this.thresholds.maxResponseTime,
            message: avgResponseTime > this.thresholds.maxResponseTime
                ? `High response time: ${avgResponseTime}ms (threshold: ${this.thresholds.maxResponseTime}ms)`
                : `Response time normal: ${avgResponseTime}ms`
        };
    }

    /**
     * Check error rate health
     * @private
     * @returns {Object} Error rate check result
     */
    checkErrorRate() {
        const allMetrics = this.monitor.getAllMetrics();
        const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
        const totalErrors = allMetrics.reduce((sum, m) => sum + (m.errorCount || 0), 0);
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

        return {
            status: errorRate > 5 ? HealthStatus.CRITICAL : HealthStatus.HEALTHY,
            value: errorRate,
            threshold: 5,
            message: errorRate > 5
                ? `High error rate: ${errorRate.toFixed(2)}%`
                : `Error rate normal: ${errorRate.toFixed(2)}%`
        };
    }

    /**
     * Determine overall health status
     * @private
     * @param {Object} checks - Individual check results
     * @returns {string} Overall status
     */
    determineOverallStatus(checks) {
        const statuses = Object.values(checks).map(check => check.status);
        
        if (statuses.includes(HealthStatus.CRITICAL)) {
            return HealthStatus.CRITICAL;
        }
        if (statuses.includes(HealthStatus.WARNING)) {
            return HealthStatus.WARNING;
        }
        if (statuses.includes(HealthStatus.HEALTHY)) {
            return HealthStatus.HEALTHY;
        }
        return HealthStatus.UNKNOWN;
    }

    /**
     * Generate health summary
     * @private
     * @param {Object} checks - Individual check results
     * @param {string} overallStatus - Overall status
     * @returns {Object} Summary object
     */
    generateSummary(checks, overallStatus) {
        const healthyCount = Object.values(checks).filter(c => c.status === HealthStatus.HEALTHY).length;
        const warningCount = Object.values(checks).filter(c => c.status === HealthStatus.WARNING).length;
        const criticalCount = Object.values(checks).filter(c => c.status === HealthStatus.CRITICAL).length;

        return {
            overallStatus,
            healthyChecks: healthyCount,
            warningChecks: warningCount,
            criticalChecks: criticalCount,
            totalChecks: Object.keys(checks).length,
            recommendations: this.generateRecommendations(checks, overallStatus)
        };
    }

    /**
     * Generate health recommendations
     * @private
     * @param {Object} checks - Individual check results
     * @param {string} overallStatus - Overall status
     * @returns {Array} List of recommendations
     */
    generateRecommendations(checks, overallStatus) {
        const recommendations = [];

        if (checks.blockRate.status === HealthStatus.WARNING) {
            recommendations.push('Consider adjusting rate limits or investigating potential abuse');
        }

        if (checks.memoryUsage.status === HealthStatus.CRITICAL) {
            recommendations.push('Increase cache size or reduce retention period');
        }

        if (checks.cachePerformance.status === HealthStatus.WARNING) {
            recommendations.push('Review cache configuration and access patterns');
        }

        if (checks.responseTime.status === HealthStatus.WARNING) {
            recommendations.push('Optimize rate limiting algorithm or increase resources');
        }

        if (checks.errorRate.status === HealthStatus.CRITICAL) {
            recommendations.push('Investigate and fix rate limiting errors immediately');
        }

        if (overallStatus === HealthStatus.HEALTHY) {
            recommendations.push('Rate limiting system is operating normally');
        }

        return recommendations;
    }

    /**
     * Get detailed diagnostics
     * @returns {Object} Diagnostic information
     */
    getDiagnostics() {
        const summary = this.monitor.getSummary();
        const allMetrics = this.monitor.getAllMetrics();

        return {
            systemInfo: {
                uptime: summary.uptime,
                totalEndpoints: summary.totalEndpoints,
                totalRequests: summary.totalRequests,
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            },
            topEndpoints: allMetrics
                .sort((a, b) => b.totalRequests - a.totalRequests)
                .slice(0, 10),
            problemEndpoints: allMetrics
                .filter(m => parseFloat(m.blockRate) > 5)
                .sort((a, b) => parseFloat(b.blockRate) - parseFloat(a.blockRate)),
            thresholds: this.thresholds,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Update health check thresholds
     * @param {Object} newThresholds - New threshold values
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }
}

/**
 * Create Express middleware for health checks
 * @param {RateLimitHealth} healthChecker - Health checker instance
 * @returns {Function} Express middleware
 */
export const createHealthCheckMiddleware = (healthChecker = null) => {
    const checker = healthChecker || new RateLimitHealth();
    
    return (req, res, next) => {
        if (req.path === '/health/rate-limiter') {
            const health = checker.checkHealth();
            const statusCode = health.status === HealthStatus.CRITICAL ? 503 : 
                              health.status === HealthStatus.WARNING ? 200 : 200;
            
            res.status(statusCode).json(health);
            return;
        }
        
        if (req.path === '/health/rate-limiter/diagnostics') {
            const diagnostics = checker.getDiagnostics();
            res.json(diagnostics);
            return;
        }
        
        next();
    };
};

// Default health checker instance
export const defaultHealthChecker = new RateLimitHealth();

export default RateLimitHealth;
