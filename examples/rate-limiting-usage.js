/**
 * Example usage of rate limiting middleware
 * Demonstrates various ways to apply rate limiting to an Express.js application
 */

import express from 'express';
import {
    createRateLimiter,
    limiters,
    createRateLimitMiddleware,
    ExpressRateLimit,
    rateLimit,
    rateLimitMonitor,
    getMonitoringData
} from '../src/middleware/index.js';

const app = express();
app.use(express.json());

// Example 1: Global rate limiting
console.log('Example 1: Global rate limiting');
const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // 1000 requests per window
});
app.use(globalLimiter.middleware());

// Example 2: Category-based rate limiting
console.log('Example 2: Category-based rate limiting');

// Auth endpoints with strict limits
app.post('/auth/login', createRateLimitMiddleware('auth', 'login'), (req, res) => {
    res.json({ message: 'Login endpoint' });
});

app.post('/auth/register', createRateLimitMiddleware('auth', 'register'), (req, res) => {
    res.json({ message: 'Register endpoint' });
});

// Sensitive data endpoints
app.post('/dataset/upload', createRateLimitMiddleware('sensitive', 'dataset-upload'), (req, res) => {
    res.json({ message: 'Dataset upload endpoint' });
});

app.get('/dataset/:id/download', createRateLimitMiddleware('sensitive', 'dataset-download'), (req, res) => {
    res.json({ message: 'Dataset download endpoint' });
});

// Example 3: Using pre-configured limiters
console.log('Example 3: Pre-configured limiters');

// Marketplace with standard limiter
app.post('/marketplace/listing', limiters.standard.middleware(), (req, res) => {
    res.json({ message: 'Create listing endpoint' });
});

// Search with lenient limiter
app.get('/search/datasets', limiters.lenient.middleware(), (req, res) => {
    res.json({ message: 'Search datasets endpoint' });
});

// Example 4: Automatic Express integration
console.log('Example 4: Automatic Express integration');

// Create a router for automatic rate limiting
const apiRouter = express.Router();

// Apply automatic rate limiting based on route patterns
ExpressRateLimit.apply(apiRouter, {
    enableGlobal: true,
    globalConfig: 'utility'
});

// Add routes - rate limiting will be applied automatically
apiRouter.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

apiRouter.post('/genetic-data/analyze', (req, res) => {
    res.json({ message: 'Genetic data analysis' });
});

apiRouter.get('/marketplace/browse', (req, res) => {
    res.json({ message: 'Browse marketplace' });
});

app.use('/api', apiRouter);

// Example 5: Class-based controllers with decorators
console.log('Example 5: Controller decorators');

class AuthController {
    @rateLimit('auth', 'login')
    async login(req, res) {
        res.json({ message: 'Login successful', user: req.user });
    }

    @rateLimit('auth', 'register')
    async register(req, res) {
        res.json({ message: 'Registration successful' });
    }

    @rateLimit('auth', 'password-reset')
    async resetPassword(req, res) {
        res.json({ message: 'Password reset email sent' });
    }
}

const authController = new AuthController();

// Apply decorated methods to routes
app.post('/v2/auth/login', authController.login.bind(authController));
app.post('/v2/auth/register', authController.register.bind(authController));
app.post('/v2/auth/reset-password', authController.resetPassword.bind(authController));

// Example 6: Monitoring
console.log('Example 6: Rate limiting monitoring');

// Add monitoring middleware
app.use(rateLimitMonitor());

// Monitoring endpoint
app.get('/admin/rate-limits', (req, res) => {
    const metrics = getMonitoringData();
    res.json(metrics);
});

// Example 7: Custom rate limiter with user-based keys
console.log('Example 7: User-based rate limiting');

const userLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
    },
    message: 'User rate limit exceeded'
});

app.use('/user', userLimiter.middleware());

// Example 8: Route-specific rate limiting with ExpressRateLimit
console.log('Example 8: Route-specific rate limiting');

const specialRouter = express.Router();

// Apply rate limiting to specific methods
ExpressRateLimit.applyToMethod(
    specialRouter,
    '/special-endpoint',
    'post',
    (req, res) => {
        res.json({ message: 'Special endpoint with rate limiting' });
    }
);

ExpressRateLimit.applyToMethod(
    specialRouter,
    '/public-data',
    'get',
    (req, res) => {
        res.json({ message: 'Public data endpoint' });
    }
);

app.use('/special', specialRouter);

// Example 9: Conditional rate limiting
console.log('Example 9: Conditional rate limiting');

// Different limits for different user tiers
const basicUserLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
const premiumUserLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 1000 });

app.get('/data', (req, res, next) => {
    // Choose limiter based on user tier
    if (req.user?.tier === 'premium') {
        return premiumUserLimiter.middleware()(req, res, next);
    } else {
        return basicUserLimiter.middleware()(req, res, next);
    }
}, (req, res) => {
    res.json({ message: 'Data endpoint with tier-based rate limiting' });
});

// Example 10: Error handling for rate limits
console.log('Example 10: Rate limit error handling');

// Custom error handler for rate limits
app.use((err, req, res, next) => {
    if (err.status === 429) {
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: err.message,
            retryAfter: err.retryAfter || 60,
            endpoint: req.path
        });
    } else {
        next(err);
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('- POST /auth/login (5 req/15min)');
    console.log('- POST /auth/register (5 req/15min)');
    console.log('- POST /dataset/upload (10 req/15min)');
    console.log('- GET /dataset/:id/download (10 req/15min)');
    console.log('- POST /marketplace/listing (100 req/15min)');
    console.log('- GET /search/datasets (1000 req/15min)');
    console.log('- GET /api/health (1000 req/15min)');
    console.log('- POST /api/genetic-data/analyze (10 req/15min)');
    console.log('- GET /api/marketplace/browse (1000 req/15min)');
    console.log('- POST /v2/auth/login (5 req/15min)');
    console.log('- POST /user/* (200 req/15min per user)');
    console.log('- POST /special/special-endpoint (100 req/15min)');
    console.log('- GET /special/public-data (1000 req/15min)');
    console.log('- GET /data (100 req/15min basic, 1000 req/15min premium)');
    console.log('- GET /admin/rate-limits (monitoring)');
});

// Export for testing
export default app;
