import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RateLimitFeedback } from '../../components/common/RateLimitFeedback';
import { RateLimitError } from '../../utils/rateLimiter';
import { CircuitBreakerOpenError } from '../../utils/circuitBreaker';

describe('RateLimitFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when error is null', () => {
    const { container } = render(<RateLimitFeedback error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders rate-limit banner for RateLimitError', () => {
    const err = new RateLimitError('key', 5000);
    render(<RateLimitFeedback error={err} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Too many requests/i)).toBeTruthy();
  });

  it('renders circuit-breaker banner for CircuitBreakerOpenError', () => {
    const err = new CircuitBreakerOpenError('contract', 10000);
    render(<RateLimitFeedback error={err} />);
    expect(screen.getByText(/Service temporarily unavailable/i)).toBeTruthy();
  });

  it('shows countdown seconds from retryAfterMs', () => {
    const err = new RateLimitError('key', 5000);
    render(<RateLimitFeedback error={err} />);
    expect(screen.getByText(/5s/i)).toBeTruthy();
  });

  it('decrements countdown each second', () => {
    const err = new RateLimitError('key', 3000);
    render(<RateLimitFeedback error={err} />);
    expect(screen.getByText(/3s/i)).toBeTruthy();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/2s/i)).toBeTruthy();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/1s/i)).toBeTruthy();
  });

  it('calls onDismiss after countdown expires', () => {
    const onDismiss = vi.fn();
    const err = new RateLimitError('key', 1000);
    render(<RateLimitFeedback error={err} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has aria-live="polite" for accessible announcements', () => {
    const err = new RateLimitError('key', 2000);
    render(<RateLimitFeedback error={err} />);
    expect(screen.getByRole('alert').getAttribute('aria-live')).toBe('polite');
  });
});
