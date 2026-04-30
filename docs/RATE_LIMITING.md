# Rate Limiting Middleware

## Overview

This document describes the rate limiting middleware implementation for protecting API endpoints from abuse.

## Features

### Core Components

1. **RateLimiter** (`rateLimiter.js`)
   - Sliding window algorithm implementation
   - LRU cache for memory efficiency
   - Configurable time windows and request limits
   - Custom key generation support

2. **RateLimitConfig** (`rateLimitConfig.js`)
   - Centralized configuration for different endpoint categories
   - Pre-configured limiters for auth, sensitive data, marketplace, etc.
   - Easy lookup and application of rate limits

3. **ExpressRateLimit** (`expressRateLimit.js`)
   - Express.js integration with automatic route detection
   - Path-based category and endpoint identification
   - Middleware factory and decorator support

4. **RateLimitMonitor** (`rateLimitMonitor.js`)
   - Metrics collection and monitoring
   - Request tracking and block rate statistics
   - Dashboard data export functionality

## Usage

### Basic Rate Limiting

```javascript
import { createRateLimiter } from './src/middleware/rateLimiter.js';

const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
});

app.use(limiter.middleware());
```

### Using Pre-configured Limiters

```javascript
import { limiters } from './src/middleware/rateLimiter.js';

// Use strict limiter for sensitive endpoints
app.use('/api/sensitive', limiters.strict.middleware());

// Use auth limiter for authentication
app.use('/auth/login', limiters.auth.middleware());
```

### Category-based Configuration

```javascript
import { createRateLimitMiddleware } from './src/middleware/rateLimitConfig.js';

// Apply rate limiting based on endpoint category
app.use('/auth/login', createRateLimitMiddleware('auth', 'login'));
app.use('/dataset/upload', createRateLimitMiddleware('sensitive', 'dataset-upload'));
```

### Express Integration

```javascript
import { ExpressRateLimit } from './src/middleware/expressRateLimit.js';

// Automatic rate limiting based on route patterns
ExpressRateLimit.apply(app, {
    enableGlobal: true,
    enablePerRoute: true
});

// Manual application to specific routes
ExpressRateLimit.applyToMethod(router, '/api/data', 'post', handler);
```

### Using Decorators

```javascript
import { rateLimit } from './src/middleware/expressRateLimit.js';

class AuthController {
    @rateLimit('auth', 'login')
    async login(req, res) {
        // Handler implementation
    }
}
```

### Monitoring

```javascript
import { rateLimitMonitor, getMonitoringData } from './src/middleware/rateLimitMonitor.js';

// Add monitoring middleware
app.use(rateLimitMonitor());

// Get monitoring data
const metrics = getMonitoringData();
console.log(metrics.summary);
```

## Configuration

### Rate Limit Categories

1. **Auth** (5 requests/15min)
   - Login, register, password reset
   - Most restrictive to prevent brute force attacks

2. **Sensitive** (10 requests/15min)
   - Genetic data operations, dataset uploads/downloads
   - Strict limits for data protection

3. **Marketplace** (100 requests/15min)
   - Create listings, purchases, price updates
   - Standard limits for trading operations

4. **Search** (1000 requests/15min)
   - Dataset searches, browsing, metadata retrieval
   - Lenient limits for public discovery

5. **Utility** (Varies)
   - Health checks: 1000 requests/15min
   - Statistics: 100 requests/15min
   - Version info: 1000 requests/15min

6. **Storage** (Varies)
   - IPFS uploads: 10 requests/15min
   - IPFS downloads: 100 requests/15min
   - Pin operations: 100 requests/15min

7. **Blockchain** (Varies)
   - Contract interactions: 100 requests/15min
   - Balance checks: 1000 requests/15min
   - Transaction details: 1000 requests/15min

### Custom Configuration

```javascript
import { createRateLimiter } from './src/middleware/rateLimiter.js';

const customLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50,
    message: 'Custom rate limit exceeded',
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    keyGenerator: (req) => req.user?.id || req.ip
});
```

## Headers

Rate limiting middleware adds the following headers:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when window resets (ISO 8601)

When rate limited (429 status):
- `Retry-After`: Seconds to wait before retrying

## Monitoring

### Metrics Collected

- Total requests per endpoint
- Blocked requests count
- Block rate percentage
- Average requests per time window
- Peak requests per time window
- Utilization rate

### Monitoring Dashboard

```javascript
import { getMonitoringData } from './src/middleware/rateLimitMonitor.js';

const dashboardData = getMonitoringData();
// Returns:
// {
//   summary: {
//     totalEndpoints: 15,
//     totalRequests: 1250,
//     totalBlocked: 45,
//     overallBlockRate: '3.60%',
//     mostActiveEndpoint: {...},
//     mostBlockedEndpoint: {...}
//   },
//   endpoints: [...],
//   timestamp: '2024-01-01T12:00:00.000Z'
// }
```

## Best Practices

1. **Layered Rate Limiting**: Apply both global and per-endpoint limits
2. **Different Limits by User Type**: Stricter limits for anonymous users
3. **Monitor Block Rates**: High block rates may indicate abuse or limits too strict
4. **Adjust Limits Based on Usage**: Monitor and adjust based on actual usage patterns
5. **Use Meaningful Keys**: Include user ID, API key, or tenant ID in rate limit keys
6. **Set Appropriate Windows**: Shorter windows for sensitive operations, longer for general use

## Security Considerations

- Rate limiting helps prevent DoS attacks and brute force attempts
- Implement additional authentication for sensitive operations
- Monitor for unusual patterns that may indicate automated attacks
- Consider IP-based blocking for repeated violations
- Log rate limit violations for security analysis

## Troubleshooting

### Common Issues

1. **Memory Usage**: LRU cache automatically cleans up old entries
2. **Clock Skew**: Use server-side time for window calculations
3. **Load Balancers**: Ensure consistent IP forwarding configuration
4. **WebSocket Connections**: Rate limit connection establishment, not messages

### Debug Mode

Enable debug logging to track rate limit behavior:

```javascript
const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    debug: true // Enable debug logging
});
```
