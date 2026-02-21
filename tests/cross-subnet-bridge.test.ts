import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const admin = accounts.get('deployer')!;
const relayer = accounts.get('wallet_1')!;
const other = accounts.get('wallet_2')!;

const ZERO_HASH = new Uint8Array(32).fill(0);
const STATE_ROOT = new Uint8Array(32).fill(0xab);
const MSG_HASH = new Uint8Array(32).fill(0x01);
const PAYLOAD = new Uint8Array(64).fill(0x02);
const SIG = new Uint8Array(80).fill(0x03);

function setupSubnetAndRelayer() {
  simnet.callPublicFn(
    'subnet-registry',
    'register-subnet',
    [Cl.uint(1), Cl.principal(admin), Cl.principal(admin),
      Cl.stringUtf8('Bridge Subnet'), Cl.stringUtf8(''), Cl.stringUtf8('')],
    admin,
  );
  simnet.callPublicFn('subnet-registry', 'add-relayer',
    [Cl.uint(1), Cl.principal(relayer)], admin);
}

describe('cross-subnet-bridge', () => {
  beforeEach(setupSubnetAndRelayer);

  describe('submit-to-subnet', () => {
    it('submits an outbound message with correct nonce', () => {
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'submit-to-subnet',
        [Cl.uint(1), Cl.buffer(MSG_HASH), Cl.buffer(PAYLOAD), Cl.uint(1)],
        admin,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('rejects wrong nonce for outbound message', () => {
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'submit-to-subnet',
        [Cl.uint(1), Cl.buffer(MSG_HASH), Cl.buffer(PAYLOAD), Cl.uint(5)],
        admin,
      );
      expect(result).toBeErr(Cl.uint(306));
    });
  });

  describe('update-state-root', () => {
    it('relayer can update the state root', () => {
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'update-state-root',
        [Cl.uint(1), Cl.buffer(STATE_ROOT), Cl.uint(100)],
        relayer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('non-relayer cannot update state root', () => {
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'update-state-root',
        [Cl.uint(1), Cl.buffer(STATE_ROOT), Cl.uint(100)],
        other,
      );
      expect(result).toBeErr(Cl.uint(300));
    });
  });

  describe('receive-from-subnet', () => {
    it('authorized relayer can receive an inbound message', () => {
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'receive-from-subnet',
        [Cl.uint(1), Cl.buffer(MSG_HASH), Cl.buffer(PAYLOAD), Cl.buffer(SIG), Cl.uint(1)],
        relayer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('rejects duplicate inbound message', () => {
      simnet.callPublicFn(
        'cross-subnet-bridge',
        'receive-from-subnet',
        [Cl.uint(1), Cl.buffer(MSG_HASH), Cl.buffer(PAYLOAD), Cl.buffer(SIG), Cl.uint(1)],
        relayer,
      );
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'receive-from-subnet',
        [Cl.uint(1), Cl.buffer(MSG_HASH), Cl.buffer(PAYLOAD), Cl.buffer(SIG), Cl.uint(2)],
        relayer,
      );
      expect(result).toBeErr(Cl.uint(304));
    });

    it('rejects unauthorised relayer', () => {
      const { result } = simnet.callPublicFn(
        'cross-subnet-bridge',
        'receive-from-subnet',
        [Cl.uint(1), Cl.buffer(MSG_HASH), Cl.buffer(PAYLOAD), Cl.buffer(SIG), Cl.uint(1)],
        other,
      );
      expect(result).toBeErr(Cl.uint(300));
    });
  });

  describe('get-subnet-nonces', () => {
    it('returns zero nonces for a fresh subnet', () => {
      const { result } = simnet.callReadOnlyFn(
        'cross-subnet-bridge',
        'get-subnet-nonces',
        [Cl.uint(1)],
        admin,
      );
      // Both inbound and outbound should be 0
      expect(result).toBeTuple({ inbound: Cl.uint(0), outbound: Cl.uint(0) });
    });
  });
});
