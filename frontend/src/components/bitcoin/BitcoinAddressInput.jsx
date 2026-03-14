import { useState, useCallback } from 'react';
import {
  isValidSegwitAddress,
  getAddressType,
  decodeSegwitAddress,
  bytesToHex,
} from '../../services/bitcoinService';

/**
 * BitcoinAddressInput
 * A validated input for native Segwit Bitcoin addresses (P2WPKH / P2WSH).
 * Shows address type, witness program, and validation status inline.
 *
 * Props:
 *   value           {string}   - controlled input value
 *   onChange        {function} - (address, meta) => void
 *                                meta = { valid, type, witnessProgram }
 *   label           {string}
 *   placeholder     {string}
 *   disabled        {boolean}
 *   required        {boolean}
 */
export default function BitcoinAddressInput({
  value = '',
  onChange,
  label = 'Bitcoin Address',
  placeholder = 'bc1q… or tb1q…',
  disabled = false,
  required = false,
}) {
  const [touched, setTouched] = useState(false);

  const validate = useCallback((addr) => {
    if (!addr) return { valid: false, type: null, witnessProgram: null };
    const lower = addr.toLowerCase();
    const valid = isValidSegwitAddress(lower);
    const type = valid ? getAddressType(lower) : null;
    const witnessProgram = valid ? decodeSegwitAddress(lower)?.program ?? null : null;
    return { valid, type, witnessProgram };
  }, []);

  function handleChange(e) {
    const addr = e.target.value;
    const meta = validate(addr);
    onChange?.(addr, meta);
  }

  function handleBlur() {
    setTouched(true);
  }

  const meta = validate(value);
  const showError = touched && value && !meta.valid;
  const showSuccess = value && meta.valid;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor="bitcoin-address-input" className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          id="bitcoin-address-input"
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={showError ? true : undefined}
          spellCheck={false}
          autoComplete="off"
          className={`w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 transition-colors
            ${showError ? 'border-red-400 focus:ring-red-300 bg-red-50' : ''}
            ${showSuccess ? 'border-green-400 focus:ring-green-300 bg-green-50' : ''}
            ${!showError && !showSuccess ? 'border-gray-300 focus:ring-blue-300' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* Validation icon */}
        {value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg select-none">
            {meta.valid ? '✓' : '✗'}
          </span>
        )}
      </div>

      {/* Address type badge */}
      {showSuccess && meta.type && (
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
            {meta.type}
          </span>
          <span className="text-gray-500">
            Witness v0 · {meta.type === 'P2WPKH' ? '20' : '32'}-byte program
          </span>
        </div>
      )}

      {/* Witness program (collapsed by default) */}
      {showSuccess && meta.witnessProgram && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer select-none hover:text-gray-700">
            Show witness program
          </summary>
          <p className="mt-1 break-all font-mono bg-gray-50 rounded px-2 py-1">
            0x{bytesToHex(meta.witnessProgram)}
          </p>
        </details>
      )}

      {/* Error message */}
      {showError && (
        <p className="text-xs text-red-600">
          Invalid segwit address. Only native SegWit addresses (bc1q… / tb1q…) are accepted.
        </p>
      )}
    </div>
  );
}
