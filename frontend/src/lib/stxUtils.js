/**
 * Shared STX / microSTX formatting helpers.
 *
 * Stacks denominations:
 *   1 STX  = 1 000 000 microSTX  (µSTX)
 */

const MICROSTX_PER_STX = 1_000_000;

/**
 * Format a microSTX amount as a human-readable STX string.
 * Returns '— STX' for null, undefined, or non-finite inputs.
 */
export function formatSTX(microSTX) {
  if (microSTX == null || !isFinite(microSTX)) return '— STX';
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
