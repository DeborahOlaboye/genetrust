/**
 * Backoff utility functions for retry logic.
 * All strategies use full jitter to avoid thundering-herd.
 */

/**
 * Full jitter: random in [0, min(maxMs, base * 2^attempt)]
 * Recommended by AWS for distributed systems.
 */
export function fullJitter(base, attempt, maxMs = 30000) {
  const cap = Math.min(maxMs, base * Math.pow(2, attempt));
  return Math.random() * cap;
}

/**
 * Equal jitter: half deterministic + half random.
 * Better minimum guarantee than full jitter.
 */
export function equalJitter(base, attempt, maxMs = 30000) {
  const cap = Math.min(maxMs, base * Math.pow(2, attempt));
  const half = cap / 2;
  return half + Math.random() * half;
}

/**
 * Decorrelated jitter (Polly-style): random in [base, min(maxMs, prev * 3)]
 * Requires tracking the previous delay.
 */
export function decorrelatedJitter(base, prevDelay, maxMs = 30000) {
  return Math.min(maxMs, base + Math.random() * (prevDelay * 3 - base));
}

/**
 * Linear backoff with cap (no jitter) — for deterministic testing only.
 */
export function linearBackoff(base, attempt, maxMs = 30000) {
  return Math.min(maxMs, base * (attempt + 1));
}

/**
 * Create a retry scheduler that yields successive delay values using full jitter.
 * @param {number} base       — base delay in ms
 * @param {number} maxMs      — maximum delay cap
 * @param {number} maxRetries — stop after this many retries
 * @yields {number} delay in ms
 */
export function* retrySchedule(base, maxMs = 30000, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    yield fullJitter(base, attempt, maxMs);
  }
}

export default { fullJitter, equalJitter, decorrelatedJitter, linearBackoff, retrySchedule };
