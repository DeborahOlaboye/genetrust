import { describe, it, expect, vi, beforeEach } from 'vitest';

// The helpers are not exported — test them indirectly through fetchWithRetry behaviour,
// and test the exported parseRateLimitHeaders / getRateLimitStatus utilities.
import {
  fetchWithRetry,
  parseRateLimitHeaders,
  getRateLimitStatus,
  updateRateLimitState,
} from '../../services/apiService';

describe('parseRateLimitHeaders', () => {
  function makeHeaders(obj) {
    return new Headers(obj);
  }

  it('parses numeric X-RateLimit-Limit / Remaining', () => {
    const h = makeHeaders({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '42',
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
    });
    const info = parseRateLimitHeaders(h);
    expect(info.limit).toBe(100);
    expect(info.remaining).toBe(42);
    expect(info.resetAt).toBeInstanceOf(Date);
    expect(info.retryAfterMs).toBeNull();
  });

  it('parses delta-seconds Retry-After', () => {
    const h = makeHeaders({ 'Retry-After': '30' });
    const info = parseRateLimitHeaders(h);
    expect(info.retryAfterMs).toBeCloseTo(30000, -2); // within 100ms
  });

  it('parses HTTP-date Retry-After', () => {
    const future = new Date(Date.now() + 10000).toUTCString();
    const h = makeHeaders({ 'Retry-After': future });
    const info = parseRateLimitHeaders(h);
    expect(info.retryAfterMs).toBeGreaterThan(0);
    expect(info.retryAfterMs).toBeLessThanOrEqual(10100);
  });

  it('returns null fields when headers are absent', () => {
    const h = makeHeaders({});
    const info = parseRateLimitHeaders(h);
    expect(info.limit).toBeNull();
    expect(info.remaining).toBeNull();
    expect(info.resetAt).toBeNull();
    expect(info.retryAfterMs).toBeNull();
  });
});

describe('getRateLimitStatus / updateRateLimitState', () => {
  it('returns null for an unknown prefix', () => {
    expect(getRateLimitStatus('/unknown-endpoint')).toBeNull();
  });

  it('returns the stored state after updateRateLimitState', () => {
    const h = new Headers({ 'X-RateLimit-Remaining': '5', 'X-RateLimit-Limit': '10' });
    updateRateLimitState('/api/test', h);
    const status = getRateLimitStatus('/api/test');
    expect(status).not.toBeNull();
    expect(status.remaining).toBe(5);
    expect(status.limit).toBe(10);
    expect(typeof status.updatedAt).toBe('number');
  });

  it('overwrites the stored state on subsequent calls', () => {
    const h1 = new Headers({ 'X-RateLimit-Remaining': '10' });
    const h2 = new Headers({ 'X-RateLimit-Remaining': '0' });
    updateRateLimitState('/api/overwrite', h1);
    updateRateLimitState('/api/overwrite', h2);
    expect(getRateLimitStatus('/api/overwrite').remaining).toBe(0);
  });
});

describe('fetchWithRetry — jitter backoff behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('succeeds on first try without retrying', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const promise = fetchWithRetry('/api/test', {}, { retry: 2, allowDuplicate: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns success false on a 400 without retrying (not in retryOn list)', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Bad Request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchWithRetry('/api/bad', {}, { retry: 2, retryOn: [500], allowDuplicate: true });
    expect(result.success).toBe(false);
    expect(result.error.status).toBe(400);
  });

  it('deduplicates concurrent identical requests', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const p1 = fetchWithRetry('/api/dedup', { method: 'GET' });
    const p2 = fetchWithRetry('/api/dedup', { method: 'GET' });

    await Promise.all([p1, p2]);
    // Both promises resolve to the same underlying call
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
