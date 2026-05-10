import { useState, useCallback, useEffect } from 'react';
import { CircuitState, CircuitBreakerOpenError } from '../utils/circuitBreaker';

/**
 * useCircuitBreaker — exposes circuit state to React components and wraps
 * async calls so the UI can render degraded states when the circuit is open.
 *
 * @param {CircuitBreaker} circuit — a CircuitBreaker instance
 */
export function useCircuitBreaker(circuit) {
  const [circuitState, setCircuitState] = useState(() => circuit.state);
  const [retryAfterMs, setRetryAfterMs] = useState(0);
  const [lastError, setLastError] = useState(null);

  // Sync state whenever the circuit transitions
  useEffect(() => {
    const prevOnStateChange = circuit.onStateChange;
    circuit.onStateChange = ({ to }) => {
      setCircuitState(to);
      setRetryAfterMs(circuit.retryAfterMs());
      if (prevOnStateChange) prevOnStateChange({ to, circuit: circuit.name });
    };
    return () => {
      circuit.onStateChange = prevOnStateChange;
    };
  }, [circuit]);

  /**
   * Execute fn via the circuit breaker, updating component state accordingly.
   */
  const execute = useCallback(async (fn) => {
    setLastError(null);
    try {
      const result = await circuit.execute(fn);
      setCircuitState(circuit.state);
      setRetryAfterMs(circuit.retryAfterMs());
      return result;
    } catch (err) {
      setLastError(err);
      setCircuitState(circuit.state);
      setRetryAfterMs(circuit.retryAfterMs());
      throw err;
    }
  }, [circuit]);

  const isOpen = circuitState === CircuitState.OPEN;
  const isHalfOpen = circuitState === CircuitState.HALF_OPEN;
  const isClosed = circuitState === CircuitState.CLOSED;

  return {
    circuitState,
    retryAfterMs,
    lastError,
    isOpen,
    isHalfOpen,
    isClosed,
    execute,
    stats: circuit.getStats(),
  };
}

export default useCircuitBreaker;
