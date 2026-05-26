import { formatSTX, formatMicroSTX, toMicroSTX, STX_PLACEHOLDER, MICROSTX_PER_STX } from '../lib/stxUtils.js';

describe('formatSTX', () => {
  it('converts a standard microSTX amount to STX string', () => {
    expect(formatSTX(1_000_000)).toBe('1.000000 STX');
  });

  it('converts zero to a zero STX string', () => {
    expect(formatSTX(0)).toBe('0.000000 STX');
  });

  it('returns safe placeholder for null input', () => {
    expect(formatSTX(null)).toBe(STX_PLACEHOLDER);
  });

  it('returns safe placeholder for undefined input', () => {
    expect(formatSTX(undefined)).toBe(STX_PLACEHOLDER);
  });

  it('returns safe placeholder for NaN input', () => {
    expect(formatSTX(NaN)).toBe(STX_PLACEHOLDER);
  });

  it('returns safe placeholder for Infinity input', () => {
    expect(formatSTX(Infinity)).toBe(STX_PLACEHOLDER);
  });

  it('returns safe placeholder for -Infinity input', () => {
    expect(formatSTX(-Infinity)).toBe(STX_PLACEHOLDER);
  });

  it('formats 500 000 microSTX as 0.5 STX', () => {
    expect(formatSTX(500_000)).toBe('0.500000 STX');
  });

  it('formats a large microSTX value correctly', () => {
    expect(formatSTX(9_999_999_000_000)).toBe('9999999.000000 STX');
  });

  it('includes exactly 6 decimal places', () => {
    const result = formatSTX(1_234_567);
    const decimals = result.split('.')[1].replace(' STX', '');
    expect(decimals).toHaveLength(6);
  });
});

describe('formatMicroSTX', () => {
  it('is an alias for formatSTX', () => {
    expect(formatMicroSTX(2_000_000)).toBe(formatSTX(2_000_000));
  });
});

describe('toMicroSTX', () => {
  it('converts 1 STX to 1 000 000 microSTX', () => {
    expect(toMicroSTX(1)).toBe(MICROSTX_PER_STX);
  });

  it('converts 0 STX to 0 microSTX', () => {
    expect(toMicroSTX(0)).toBe(0);
  });

  it('rounds fractional microSTX to the nearest integer', () => {
    expect(toMicroSTX(1.0000001)).toBe(1_000_000);
  });

  it('returns 0 for null input', () => {
    expect(toMicroSTX(null)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(toMicroSTX(undefined)).toBe(0);
  });

  it('returns 0 for NaN input', () => {
    expect(toMicroSTX(NaN)).toBe(0);
  });
});
