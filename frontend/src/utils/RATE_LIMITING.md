# Rate Limiting, Backoff & Circuit Breaker

## Overview

GeneTrust uses a three-layer system to prevent cascading failures and thundering-herd retry storms:

1. **Rate Limiting** — enforces request quotas per key (sliding window + burst window + token bucket)
2. **Full-Jitter Backoff** — randomises retry delays to spread load across retrying clients
3. **Circuit Breaker** — short-circuits requests to a failing downstream service

---

## Rate Limiting (`utils/rateLimiter.js`)

### Algorithms

| Class | Algorithm | Use case |
|---|---|---|
| `RateLimiter` | Sliding window | Per-minute quota (contract reads, IPFS, general API) |
| `BurstLimiter` | Sliding window × 2 | Short burst cap + per-minute cap (contract writes) |
| `TokenBucketLimiter` | Token bucket | Smooth, continuous rate limiting (wallet signing) |

### Pre-configured instances

| Export | Limit | Use case |
|---|---|---|
| `contractApiLimiter` | 50 req/min | Stacks node contract reads |
| `contractBurstLimiter` | 10 req/5s AND 50 req/min | Contract write bursts |
| `ipfsLimiter` | 30 req/min | IPFS gateway requests |
| `generalApiLimiter` | 100 req/min | Hiro API and general calls |
| `walletSignLimiter` | 5 tokens, 1 refill/2s | Wallet signing operations |

### Key API

```js
limiter.isAllowed(key)          // consume one token — returns bool
limiter.peek(key)               // check without consuming
limiter.getRemaining(key)       // tokens left in window
limiter.getResetTime(key)       // ms until next slot opens
limiter.getRateLimitHeaders(key)// { X-RateLimit-Limit, Remaining, Reset }
limiter.isNearLimit(key, 0.2)   // true when ≤ 20% remaining
limiter.withRateLimit(key, fn)  // async — throws or calls fn
limiter.waitForSlot(key, ms)    // resolves when slot opens
limiter.reset(key)              // clear quota for key
```

### `RateLimitError`

```js
import { RateLimitError } from './rateLimiter';
// err.retryAfterMs — ms until retry is safe
// err.key          — the quota key
```

---

## Full-Jitter Backoff (`services/apiService.js`, `hooks/useTransactionRetry.js`, `hooks/useOptimizedQuery.js`)

All retry loops use **full jitter**:

```
delay = random(0, min(maxDelay, base * 2^attempt))
```

This is the AWS "Full Jitter" strategy. It prevents multiple clients from retrying at the same time (thundering herd), which would otherwise amplify the load on the failing service.

### Parameters

| Parameter | Default | Scope |
|---|---|---|
| `initialDelay` / `retryDelay` | 1000–2000ms | First attempt base delay |
| `maxDelay` / `maxRetryDelay` | 20000–30000ms | Hard cap on any single delay |
| `maxRetries` / `retryAttempts` | 2–3 | Maximum retry count |

### Retry-After header

`fetchWithRetry` reads `Retry-After` from HTTP 429 responses and uses it as the delay instead of computing its own backoff. Both delta-seconds (`"30"`) and HTTP-date formats are supported.

---

## Circuit Breaker (`utils/circuitBreaker.js`)

### States

```
CLOSED   ──(threshold failures)──► OPEN
OPEN     ──(resetTimeoutMs)──────► HALF_OPEN
HALF_OPEN ──(success × threshold)─► CLOSED
HALF_OPEN ──(failure)────────────► OPEN
```

### Pre-configured instances

| Export | Threshold | Reset timeout |
|---|---|---|
| `contractCircuit` | 5 failures | 30s |
| `ipfsCircuit` | 3 failures | 20s |
| `apiCircuit` | 5 failures | 15s |

### Usage

```js
import { contractCircuit } from '../utils/circuitBreaker';

try {
  const result = await contractCircuit.execute(() => callContract(...));
} catch (err) {
  if (err instanceof CircuitBreakerOpenError) {
    // Circuit is open — show user a degraded UI
    console.warn('Service unavailable, retry in', err.retryAfterMs, 'ms');
  }
}
```

---

## React Hooks

### `useRateLimiter(limiter, key)`

Exposes rate limit state to components:

```jsx
const { remaining, isLimited, resetTimeMs, consume, guardedCall } = useRateLimiter(contractApiLimiter, 'user-1');

<button disabled={isLimited} onClick={() => guardedCall(submitTransaction)}>
  Submit {isLimited ? `(wait ${Math.ceil(resetTimeMs / 1000)}s)` : ''}
</button>
```

### `useRequestThrottle(fn, limiter, key)`

Wraps any async function with rate limiting:

```jsx
const { throttledFn, isThrottled } = useRequestThrottle(fetchDataset, ipfsLimiter, 'ipfs');
```

### `useBurstGuard(limiter, key)`

Short-window protection for wallet operations:

```jsx
const { guardedExecute, burstExceeded, cooldownMs } = useBurstGuard(contractBurstLimiter, 'sign');

const handleSign = () => guardedExecute(openWalletModal);
```

---

## Testing

```bash
cd frontend
npx vitest run src/__tests__/rateLimiter.test.js
npx vitest run src/__tests__/circuitBreaker.test.js
npx vitest run src/__tests__/apiServiceJitter.test.js
npx vitest run src/__tests__/useRateLimiter.test.jsx
npx vitest run src/__tests__/useRequestThrottle.test.jsx
npx vitest run src/__tests__/useBurstGuard.test.jsx
npx vitest run src/__tests__/rateLimiterIntegration.test.js
```
