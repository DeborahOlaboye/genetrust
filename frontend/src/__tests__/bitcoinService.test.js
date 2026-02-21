import { describe, it, expect } from 'vitest';
import {
  encodeP2WPKHAddress,
  encodeP2WSHAddress,
  decodeSegwitAddress,
  isValidSegwitAddress,
  getAddressType,
  satsToBtc,
  btcToSats,
  hexToBytes,
  bytesToHex,
} from '../services/bitcoinService';

// Known-good testnet P2WPKH address
const KNOWN_P2WPKH = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

// Known-good testnet P2WSH address
const KNOWN_P2WSH = 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7';

describe('bitcoinService', () => {
  describe('isValidSegwitAddress', () => {
    it('accepts a valid testnet P2WPKH address', () => {
      expect(isValidSegwitAddress(KNOWN_P2WPKH)).toBe(true);
    });

    it('accepts a valid testnet P2WSH address', () => {
      expect(isValidSegwitAddress(KNOWN_P2WSH)).toBe(true);
    });

    it('rejects a legacy P2PKH address', () => {
      expect(isValidSegwitAddress('mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isValidSegwitAddress('')).toBe(false);
    });

    it('rejects a random string', () => {
      expect(isValidSegwitAddress('not-an-address')).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidSegwitAddress(null)).toBe(false);
    });
  });

  describe('getAddressType', () => {
    it('returns P2WPKH for a 20-byte witness program address', () => {
      expect(getAddressType(KNOWN_P2WPKH)).toBe('P2WPKH');
    });

    it('returns P2WSH for a 32-byte witness program address', () => {
      expect(getAddressType(KNOWN_P2WSH)).toBe('P2WSH');
    });

    it('returns null for an invalid address', () => {
      expect(getAddressType('garbage')).toBeNull();
    });
  });

  describe('decodeSegwitAddress', () => {
    it('decodes P2WPKH address to a 20-byte program', () => {
      const decoded = decodeSegwitAddress(KNOWN_P2WPKH);
      expect(decoded).not.toBeNull();
      expect(decoded.program.length).toBe(20);
      expect(decoded.version).toBe(0);
    });

    it('decodes P2WSH address to a 32-byte program', () => {
      const decoded = decodeSegwitAddress(KNOWN_P2WSH);
      expect(decoded).not.toBeNull();
      expect(decoded.program.length).toBe(32);
    });

    it('returns null for an invalid address', () => {
      expect(decodeSegwitAddress('tb1zinvalid')).toBeNull();
    });
  });

  describe('encodeP2WPKHAddress', () => {
    it('round-trips: encode then decode returns same program', () => {
      const program = new Uint8Array(20);
      for (let i = 0; i < 20; i++) program[i] = i + 1;

      const addr = encodeP2WPKHAddress(program, 'testnet');
      const decoded = decodeSegwitAddress(addr);

      expect(decoded).not.toBeNull();
      expect(decoded.program).toEqual(program);
    });

    it('throws for wrong-length program', () => {
      expect(() => encodeP2WPKHAddress(new Uint8Array(19), 'testnet')).toThrow();
    });
  });

  describe('encodeP2WSHAddress', () => {
    it('round-trips: encode then decode returns same 32-byte program', () => {
      const program = new Uint8Array(32).fill(0xaf);
      const addr = encodeP2WSHAddress(program, 'testnet');
      const decoded = decodeSegwitAddress(addr);
      expect(decoded.program).toEqual(program);
    });
  });

  describe('satsToBtc / btcToSats', () => {
    it('converts 100000000 sats to 1.00000000 BTC', () => {
      expect(satsToBtc(100000000)).toBe('1.00000000');
    });

    it('converts 1 sat to 0.00000001 BTC', () => {
      expect(satsToBtc(1)).toBe('0.00000001');
    });

    it('round-trips sats → BTC → sats', () => {
      const original = BigInt(12345678);
      const btc = satsToBtc(Number(original));
      const back = btcToSats(btc);
      expect(back).toBe(original);
    });

    it('converts 0.5 BTC to 50000000 sats', () => {
      expect(btcToSats('0.5')).toBe(BigInt(50000000));
    });
  });

  describe('hexToBytes / bytesToHex', () => {
    it('converts a hex string to bytes and back', () => {
      const hex = 'deadbeef01020304';
      const bytes = hexToBytes(hex);
      expect(bytesToHex(bytes)).toBe(hex);
    });

    it('handles 0x prefix', () => {
      const hex = '0xabcdef';
      const bytes = hexToBytes(hex);
      expect(bytesToHex(bytes)).toBe('abcdef');
    });

    it('produces correct length', () => {
      expect(hexToBytes('aabbcc').length).toBe(3);
    });
  });
});
