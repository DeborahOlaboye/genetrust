/**
 * Rate limiting monitoring and metrics collection
 * Provides insights into rate limit usage and performance
 */

import { getAllRateLimits } from './rateLimitConfig.js';

/**
 * Rate limit monitor class for tracking usage statistics
 */
export class RateLimitMonitor {
    constructor() {
        // Store metrics for each rate limiter
        this.metrics = new Map();
        this.startTime = Date.now();
        
        // Initialize metrics for all configured rate limits
        this.initializeMetrics();
    }

    /**
     * Initialize metrics for all rate limit configurations
     * @private
     */
    initializeMetrics() {
        const configs = getAllRateLimits();
        
        configs.forEach(config => {
            const key = `${config.category}:${config.endpoint}`;
            this.metrics.set(key, {
                category: config.category,
                endpoint: config.endpoint,
                description: config.description,
                windowMs: config.windowMs,
                max: config.max,
                totalRequests: 0,
                blockedRequests: 0,
                allowedRequests: 0,
                averageRequestsPerWindow: 0,
                peakRequestsPerWindow: 0,
                lastReset: Date.now(),
                windows: [] // Track request counts per time window
            });
        });
    }

    /**
     * Record a request attempt
     * @param {string} category - Rate limit category
     * @param {string} endpoint - Endpoint name
     * @param {boolean} blocked - Whether request was blocked
     */
    recordRequest(category, endpoint, blocked = false) {
        const key = `${category}:${endpoint}`;
        const metric = this.metrics.get(key);

        if (!metric) {
            // Create metric if it doesn't exist
            this.metrics.set(key, {
                category,
                endpoint,
                description: 'Unknown endpoint',
                windowMs: 0,
                max: 0,
                totalRequests: 0,
                blockedRequests: 0,
                allowedRequests: 0,
                averageRequestsPerWindow: 0,
                peakRequestsPerWindow: 0,
                lastReset: Date.now(),
                windows: []
            });
        }

        const updatedMetric = this.metrics.get(key);
        updatedMetric.totalRequests++;

        if (blocked) {
            updatedMetric.blockedRequests++;
        } else {
            updatedMetric.allowedRequests++;
        }

        // Update window statistics
        this.updateWindowMetrics(key);
    }

    /**
     * Update window-based metrics
     * @private
     * @param {string} key - Metric key
     */
    updateWindowMetrics(key) {
        const metric = this.metrics.get(key);
        const now = Date.now();
        const windowStart = now - metric.windowMs;

        // Clean old windows
        metric.windows = metric.windows.filter(window => window.timestamp > windowStart);

        // Add current window
        const currentWindow = metric.windows.find(w => 
            now - w.timestamp < 60000 // 1 minute buckets
        );

        if (currentWindow) {
            currentWindow.count++;
        } else {
            metric.windows.push({
                timestamp: now,
                count: 1
            });
        }

        // Calculate peak and average
        const counts = metric.windows.map(w => w.count);
        metric.peakRequestsPerWindow = Math.max(...counts, 0);
        metric.averageRequestsPerWindow = counts.length > 0 
            ? counts.reduce((a, b) => a + b, 0) / counts.length 
            : 0;
    }

    /**
     * Get metrics for a specific endpoint
     * @param {string} category - Rate limit category
     * @param {string} endpoint - Endpoint name
     * @returns {Object|null} Endpoint metrics
     */
    getMetrics(category, endpoint) {
        const key = `${category}:${endpoint}`;
        return this.metrics.get(key) || null;
    }

    /**
     * Get all metrics
     * @returns {Array} Array of all metrics
     */
    getAllMetrics() {
        return Array.from(this.metrics.values()).map(metric => ({
            ...metric,
            blockRate: metric.totalRequests > 0 
                ? (metric.blockedRequests / metric.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            utilizationRate: metric.max > 0
                ? (metric.averageRequestsPerWindow / metric.max * 100).toFixed(2) + '%'
                : '0%',
            uptime: Date.now() - this.startTime
        }));
    }

    /**
     * Get summary statistics
     * @returns {Object} Summary statistics
     */
    getSummary() {
        const allMetrics = this.getAllMetrics();
        const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
        const totalBlocked = allMetrics.reduce((sum, m) => sum + m.blockedRequests, 0);
        const totalAllowed = allMetrics.reduce((sum, m) => sum + m.allowedRequests, 0);

        return {
            totalEndpoints: allMetrics.length,
            totalRequests,
            totalBlocked,
            totalAllowed,
            overallBlockRate: totalRequests > 0 
                ? (totalBlocked / totalRequests * 100).toFixed(2) + '%'
                : '0%',
            uptime: Date.now() - this.startTime,
            mostActiveEndpoint: this.getMostActiveEndpoint(allMetrics),
            mostBlockedEndpoint: this.getMostBlockedEndpoint(allMetrics)
        };
    }

    /**
     * Get the most active endpoint
     * @private
     * @param {Array} metrics - Array of metrics
     * @returns {Object|null} Most active endpoint
     */
    getMostActiveEndpoint(metrics) {
        if (metrics.length === 0) return null;
        
        return metrics.reduce((max, current) => 
            current.totalRequests > max.totalRequests ? current : max
        );
    }

    /**
     * Get the most blocked endpoint
     * @private
     * @param {Array} metrics - Array of metrics
     * @returns {Object|null} Most blocked endpoint
     */
    getMostBlockedEndpoint(metrics) {
        if (metrics.length === 0) return null;
        
        return metrics.reduce((max, current) => 
            current.blockedRequests > max.blockedRequests ? current : max
        );
    }

    /**
     * Reset metrics for a specific endpoint
     * @param {string} category - Rate limit category
     * @param {string} endpoint - Endpoint name
     */
    resetMetrics(category, endpoint) {
        const key = `${category}:${endpoint}`;
        const metric = this.metrics.get(key);
        
        if (metric) {
            metric.totalRequests = 0;
            metric.blockedRequests = 0;
            metric.allowedRequests = 0;
            metric.averageRequestsPerWindow = 0;
            metric.peakRequestsPerWindow = 0;
            metric.lastReset = Date.now();
            metric.windows = [];
        }
    }

    /**
     * Reset all metrics
     */
    resetAllMetrics() {
        this.metrics.forEach(metric => {
            metric.totalRequests = 0;
            metric.blockedRequests = 0;
            metric.allowedRequests = 0;
            metric.averageRequestsPerWindow = 0;
            metric.peakRequestsPerWindow = 0;
            metric.lastReset = Date.now();
            metric.windows = [];
        });
    }

    /**
     * Export metrics to JSON
     * @returns {Object} JSON-serializable metrics
     */
    exportMetrics() {
        return {
            timestamp: new Date().toISOString(),
            summary: this.getSummary(),
            endpoints: this.getAllMetrics()
        };
    }

    /**
     * Create middleware to track rate limit events
     * @returns {Function} Express middleware
     */
    createTrackingMiddleware() {
        return (req, res, next) => {
            const originalSend = res.send;
            let blocked = false;

            // Override send to detect rate limit responses
            res.send = function(data) {
                if (res.statusCode === 429) {
                    blocked = true;
                }
                return originalSend.call(this, data);
            };

            // Track request completion
            res.on('finish', () => {
                // Try to determine category and endpoint from route
                const path = req.route ? req.route.path : req.path;
                const category = req.rateLimitCategory || 'unknown';
                const endpoint = req.rateLimitEndpoint || 'unknown';

                this.recordRequest(category, endpoint, blocked);
            }.bind(this));

            next();
        }.bind(this);
    }
}

// Global monitor instance
export const globalMonitor = new RateLimitMonitor();

/**
 * Express middleware for rate limit monitoring
 * @param {RateLimitMonitor} monitor - Monitor instance (optional)
 * @returns {Function} Express middleware
 */
export const rateLimitMonitor = (monitor = globalMonitor) => {
    return monitor.createTrackingMiddleware();
};

/**
 * Get monitoring dashboard data
 * @param {RateLimitMonitor} monitor - Monitor instance (optional)
 * @returns {Object} Dashboard data
 */
export const getMonitoringData = (monitor = globalMonitor) => {
    return {
        summary: monitor.getSummary(),
        endpoints: monitor.getAllMetrics(),
        timestamp: new Date().toISOString()
    };
};

export default RateLimitMonitor;
