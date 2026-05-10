/**
 * CircuitBreaker — protects downstream services from cascading failures.
 *
 * States:
 *   CLOSED   — normal operation; failures are counted
 *   OPEN     — requests are short-circuited for `resetTimeoutMs`
 *   HALF_OPEN — one probe request is allowed; success → CLOSED, failure → OPEN
 */

export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

export class CircuitBreakerOpenError extends Error {
  constructor(name, retryAfterMs) {
    super(`Circuit "${name}" is OPEN. Retry after ${retryAfterMs}ms.`);
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = name;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.onStateChange = options.onStateChange || null;

    this._state = CircuitState.CLOSED;
    this._failures = 0;
    this._successes = 0;
    this._openedAt = null;
  }

  get state() {
    return this._state;
  }

  _transition(nextState) {
    if (this._state === nextState) return;
    const prev = this._state;
    this._state = nextState;
    if (nextState === CircuitState.OPEN) this._openedAt = Date.now();
    if (nextState === CircuitState.CLOSED) { this._failures = 0; this._successes = 0; }
    if (nextState === CircuitState.HALF_OPEN) this._successes = 0;
    if (this.onStateChange) this.onStateChange({ from: prev, to: nextState, circuit: this.name });
  }

  _checkHalfOpen() {
    if (
      this._state === CircuitState.OPEN &&
      this._openedAt !== null &&
      Date.now() - this._openedAt >= this.resetTimeoutMs
    ) {
      this._transition(CircuitState.HALF_OPEN);
    }
  }

  retryAfterMs() {
    if (this._state !== CircuitState.OPEN) return 0;
    return Math.max(0, this.resetTimeoutMs - (Date.now() - (this._openedAt || 0)));
  }

  async execute(fn) {
    this._checkHalfOpen();

    if (this._state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(this.name, this.retryAfterMs());
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    if (this._state === CircuitState.HALF_OPEN) {
      this._successes++;
      if (this._successes >= this.successThreshold) this._transition(CircuitState.CLOSED);
    } else {
      this._failures = 0;
    }
  }

  _onFailure() {
    this._failures++;
    if (
      this._state === CircuitState.HALF_OPEN ||
      this._failures >= this.failureThreshold
    ) {
      this._transition(CircuitState.OPEN);
    }
  }

  forceOpen() {
    this._transition(CircuitState.OPEN);
  }

  forceClose() {
    this._transition(CircuitState.CLOSED);
  }

  getStats() {
    return {
      state: this._state,
      failures: this._failures,
      successes: this._successes,
      retryAfterMs: this.retryAfterMs(),
    };
  }
}

// Pre-configured circuit breakers for each service layer
export const contractCircuit = new CircuitBreaker({
  name: 'contract',
  failureThreshold: 5,
  resetTimeoutMs: 30000,
});

export const ipfsCircuit = new CircuitBreaker({
  name: 'ipfs',
  failureThreshold: 3,
  resetTimeoutMs: 20000,
});

export const apiCircuit = new CircuitBreaker({
  name: 'api',
  failureThreshold: 5,
  resetTimeoutMs: 15000,
});

export default CircuitBreaker;
