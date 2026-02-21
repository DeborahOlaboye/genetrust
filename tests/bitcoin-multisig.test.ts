import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const signer1 = accounts.get('wallet_1')!;
const signer2 = accounts.get('wallet_2')!;
const signer3 = accounts.get('wallet_3')!;
const buyer = accounts.get('wallet_4')!;

// Compressed pubkeys (33 bytes each)
const PUBKEY_1 = new Uint8Array(33).fill(0x02);
const PUBKEY_2 = new Uint8Array(33).fill(0x03);
const PUBKEY_3 = new Uint8Array(33).fill(0x04);

describe('bitcoin-multisig', () => {
  describe('create-policy', () => {
    it('creates a 2-of-3 policy successfully', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-multisig',
        'create-policy',
        [
          Cl.stringUtf8('GeneTrust Institutional 2-of-3'),
          Cl.uint(2),                         // threshold
          Cl.list([Cl.buffer(PUBKEY_1), Cl.buffer(PUBKEY_2), Cl.buffer(PUBKEY_3)]),
          Cl.uint(1000000),                   // min-amount-sats: 0.01 BTC
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('rejects threshold of 0', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-multisig',
        'create-policy',
        [
          Cl.stringUtf8('Bad Policy'),
          Cl.uint(0),
          Cl.list([Cl.buffer(PUBKEY_1)]),
          Cl.uint(100000),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(2206));
    });

    it('rejects threshold greater than number of signers', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-multisig',
        'create-policy',
        [
          Cl.stringUtf8('Over-threshold Policy'),
          Cl.uint(5),
          Cl.list([Cl.buffer(PUBKEY_1), Cl.buffer(PUBKEY_2)]),
          Cl.uint(100000),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(2206));
    });

    it('increments policy IDs', () => {
      simnet.callPublicFn('bitcoin-multisig', 'create-policy',
        [Cl.stringUtf8('P1'), Cl.uint(1), Cl.list([Cl.buffer(PUBKEY_1)]), Cl.uint(0)], deployer);
      simnet.callPublicFn('bitcoin-multisig', 'create-policy',
        [Cl.stringUtf8('P2'), Cl.uint(1), Cl.list([Cl.buffer(PUBKEY_2)]), Cl.uint(0)], deployer);

      const { result } = simnet.callReadOnlyFn(
        'bitcoin-multisig', 'get-policy', [Cl.uint(2)], deployer,
      );
      expect(result.type).not.toBe('none');
    });
  });

  describe('create-approval-request', () => {
    beforeEach(() => {
      simnet.callPublicFn('bitcoin-multisig', 'create-policy',
        [Cl.stringUtf8('2-of-3'), Cl.uint(2),
          Cl.list([Cl.buffer(PUBKEY_1), Cl.buffer(PUBKEY_2), Cl.buffer(PUBKEY_3)]),
          Cl.uint(500000)],
        deployer);
    });

    it('buyer can create an approval request', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-multisig',
        'create-approval-request',
        [Cl.uint(1), Cl.uint(10), Cl.uint(2000000)],
        buyer,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('approval starts with 0 signatures and not approved', () => {
      simnet.callPublicFn('bitcoin-multisig', 'create-approval-request',
        [Cl.uint(1), Cl.uint(10), Cl.uint(2000000)], buyer);

      const { result } = simnet.callReadOnlyFn(
        'bitcoin-multisig', 'get-approval', [Cl.uint(1)], deployer,
      );
      const json = result.value?.value;
      expect(Number(json?.['signature-count']?.value)).toBe(0);
      expect(json?.['is-approved']?.value).toBe(false);
    });
  });

  describe('deactivate-policy', () => {
    beforeEach(() => {
      simnet.callPublicFn('bitcoin-multisig', 'create-policy',
        [Cl.stringUtf8('Active Policy'), Cl.uint(1),
          Cl.list([Cl.buffer(PUBKEY_1)]), Cl.uint(0)],
        deployer);
    });

    it('owner can deactivate a policy', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-multisig', 'deactivate-policy', [Cl.uint(1)], deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('non-owner cannot deactivate a policy', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-multisig', 'deactivate-policy', [Cl.uint(1)], signer1,
      );
      expect(result).toBeErr(Cl.uint(2200));
    });
  });
});
