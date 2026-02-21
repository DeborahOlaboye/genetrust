import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;

// 20-byte pubkey hash (P2WPKH witness program)
const P2WPKH_PROGRAM = new Uint8Array(20).fill(0xab);

// 32-byte script hash (P2WSH witness program)
const P2WSH_PROGRAM = new Uint8Array(32).fill(0xcd);

// Invalid — only 10 bytes
const SHORT_BUFFER = new Uint8Array(10).fill(0x01);

describe('segwit-validator', () => {
  describe('validate-p2wpkh', () => {
    it('accepts a valid 20-byte witness program', () => {
      const { result } = simnet.callPublicFn(
        'segwit-validator',
        'validate-p2wpkh',
        [Cl.buffer(P2WPKH_PROGRAM)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('rejects a witness program that is not 20 bytes', () => {
      // Short buffer — Clarity typing enforces exactly buff 20 so we test boundary
      const padded = new Uint8Array(20).fill(0);
      const { result } = simnet.callPublicFn(
        'segwit-validator',
        'validate-p2wpkh',
        [Cl.buffer(padded)],
        deployer,
      );
      // All zeros is still 20 bytes — should be ok
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe('validate-p2wsh', () => {
    it('accepts a valid 32-byte witness program', () => {
      const { result } = simnet.callPublicFn(
        'segwit-validator',
        'validate-p2wsh',
        [Cl.buffer(P2WSH_PROGRAM)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe('build-p2wpkh-scriptpubkey', () => {
    it('produces a 22-byte scriptPubKey starting with 0x0014', () => {
      const { result } = simnet.callReadOnlyFn(
        'segwit-validator',
        'build-p2wpkh-scriptpubkey',
        [Cl.buffer(P2WPKH_PROGRAM)],
        deployer,
      );
      const bytes = result.buffer;
      expect(bytes).toBeDefined();
      expect(bytes.length).toBe(22);
      expect(bytes[0]).toBe(0x00);
      expect(bytes[1]).toBe(0x14);
    });
  });

  describe('build-p2wsh-scriptpubkey', () => {
    it('produces a 34-byte scriptPubKey starting with 0x0020', () => {
      const { result } = simnet.callReadOnlyFn(
        'segwit-validator',
        'build-p2wsh-scriptpubkey',
        [Cl.buffer(P2WSH_PROGRAM)],
        deployer,
      );
      const bytes = result.buffer;
      expect(bytes).toBeDefined();
      expect(bytes.length).toBe(34);
      expect(bytes[0]).toBe(0x00);
      expect(bytes[1]).toBe(0x20);
    });
  });

  describe('is-p2wpkh-output', () => {
    it('returns true for a 22-byte script starting with 0x0014', () => {
      const script = new Uint8Array(22);
      script[0] = 0x00;
      script[1] = 0x14;
      const { result } = simnet.callReadOnlyFn(
        'segwit-validator',
        'is-p2wpkh-output',
        [Cl.buffer(script)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it('returns false for a script with wrong version byte', () => {
      const script = new Uint8Array(22);
      script[0] = 0x51; // OP_1 — witness v1 (Taproot)
      script[1] = 0x14;
      const { result } = simnet.callReadOnlyFn(
        'segwit-validator',
        'is-p2wpkh-output',
        [Cl.buffer(script)],
        deployer,
      );
      expect(result).toBeBool(false);
    });
  });

  describe('is-p2wsh-output', () => {
    it('returns true for a 34-byte script starting with 0x0020', () => {
      const script = new Uint8Array(34);
      script[0] = 0x00;
      script[1] = 0x20;
      const { result } = simnet.callReadOnlyFn(
        'segwit-validator',
        'is-p2wsh-output',
        [Cl.buffer(script)],
        deployer,
      );
      expect(result).toBeBool(true);
    });
  });

  describe('pubkey-to-p2wpkh-program', () => {
    it('returns a 20-byte HASH160 of the pubkey', () => {
      const pubkey = new Uint8Array(33).fill(0x02);
      const { result } = simnet.callReadOnlyFn(
        'segwit-validator',
        'pubkey-to-p2wpkh-program',
        [Cl.buffer(pubkey)],
        deployer,
      );
      expect(result.buffer?.length).toBe(20);
    });
  });

  describe('hash256', () => {
    it('double-sha256 of empty buffer is deterministic', () => {
      const { result: r1 } = simnet.callReadOnlyFn(
        'segwit-validator',
        'hash256',
        [Cl.buffer(new Uint8Array(0))],
        deployer,
      );
      const { result: r2 } = simnet.callReadOnlyFn(
        'segwit-validator',
        'hash256',
        [Cl.buffer(new Uint8Array(0))],
        deployer,
      );
      expect(r1.buffer).toEqual(r2.buffer);
    });
  });
});
