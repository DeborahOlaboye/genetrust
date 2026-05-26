/**
 * Shared STX / microSTX formatting helpers.
 *
 * Stacks denominations:
 *   1 STX  = 1 000 000 microSTX  (µSTX)
 */

export const MICROSTX_PER_STX = 1_000_000;

/** Placeholder returned when a microSTX value cannot be formatted. */
export const STX_PLACEHOLDER = '— STX';

/**
 * Format a microSTX amount as a human-readable STX string.
 * Returns STX_PLACEHOLDER for null, undefined, or non-finite inputs.
 *
 * @param {number|null|undefined} microSTX
 * @returns {string} e.g. "1.000000 STX"
 */
export function formatSTX(microSTX) {
  if (microSTX == null || !isFinite(microSTX)) return STX_PLACEHOLDER;
  return `${(microSTX / MICROSTX_PER_STX).toFixed(6)} STX`;
}

/**
 * Alias for formatSTX — some call-sites prefer the longer name.
 */
export const formatMicroSTX = formatSTX;

/**
 * Convert a whole-STX amount to microSTX.
 * Returns 0 for non-finite inputs.
 */
export function toMicroSTX(stx) {
  if (stx == null || !isFinite(stx)) return 0;
  return Math.round(stx * MICROSTX_PER_STX);
}
