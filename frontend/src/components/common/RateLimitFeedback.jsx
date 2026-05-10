import { useEffect, useState } from 'react';
import { RateLimitError } from '../../utils/rateLimiter';
import { CircuitBreakerOpenError } from '../../utils/circuitBreaker';

/**
 * RateLimitFeedback — inline banner shown when a rate limit or circuit-breaker
 * error is caught. Auto-dismisses once the cooldown expires.
 *
 * Props:
 *   error     — a RateLimitError or CircuitBreakerOpenError (or null)
 *   onDismiss — optional callback after auto-dismiss
 */
export function RateLimitFeedback({ error, onDismiss }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!error) return;

    const ms =
      error instanceof RateLimitError ? error.retryAfterMs :
      error instanceof CircuitBreakerOpenError ? error.retryAfterMs :
      0;

    if (ms <= 0) return;
    setSecondsLeft(Math.ceil(ms / 1000));

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onDismiss) onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [error, onDismiss]);

  if (!error) return null;

  const isCircuit = error instanceof CircuitBreakerOpenError;
  const title = isCircuit ? 'Service temporarily unavailable' : 'Too many requests';
  const detail = isCircuit
    ? 'The service is recovering from repeated failures.'
    : 'You have reached the request limit.';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
    >
      <span aria-hidden="true" className="text-lg">⚠</span>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-yellow-700">{detail}{secondsLeft > 0 ? ` Retry in ${secondsLeft}s.` : ''}</p>
      </div>
    </div>
  );
}

export default RateLimitFeedback;
