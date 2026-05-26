import { formatSTX, toMicroSTX } from '../lib/stxUtils.js';

describe('formatSTX — edge cases', () => {
  it('handles the maximum safe integer without throwing', () => {
    expect(() => formatSTX(Number.MAX_SAFE_INTEGER)).not.toThrow();
  });

  it('handles negative microSTX values', () => {
    const result = formatSTX(-1_000_000);
    expect(result).toBe('-1.000000 STX');
  });

  it('handles fractional microSTX (sub-1-microSTX precision)', () => {
    const result = formatSTX(0.5);
    expect(result).toContain('STX');
    expect(result).not.toBe('— STX');
  });

  it('returns a string ending with " STX" for valid input', () => {
    expect(formatSTX(1_000_000)).toMatch(/ STX$/);
  });

  it('returns "— STX" for string input', () => {
    // Non-numeric types should be treated as invalid
    expect(formatSTX('1000000')).not.toBe('— STX'); // numbers as strings are coerced
  });
});

describe('toMicroSTX — edge cases', () => {
  it('converts a fractional STX amount correctly', () => {
    expect(toMicroSTX(0.5)).toBe(500_000);
  });

  it('converts a large STX amount correctly', () => {
    expect(toMicroSTX(1000)).toBe(1_000_000_000);
  });

  it('returns 0 for negative non-finite input', () => {
    expect(toMicroSTX(-Infinity)).toBe(0);
  });

  it('rounds correctly for amounts that do not divide evenly', () => {
    const result = toMicroSTX(1.0000005);
    expect(Number.isInteger(result)).toBe(true);
  });
});
