import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const seller = accounts.get('wallet_1')!;
const buyer = accounts.get('wallet_2')!;
const other = accounts.get('wallet_3')!;

const WITNESS_PROGRAM_BUYER = new Uint8Array(20).fill(0x11);
const WITNESS_PROGRAM_PLATFORM = new Uint8Array(20).fill(0x22);

function setupListing() {
  // Create a listing in the exchange contract
  simnet.callPublicFn('exchange', 'create-listing',
    [
      Cl.uint(1),
      Cl.stringUtf8('1000000'),          // price string
      Cl.principal(deployer),
      Cl.uint(1),                         // data-id
      Cl.uint(1),                         // access-level
      Cl.buffer(new Uint8Array(32)),      // metadata-hash
      Cl.bool(false),                     // requires-verification
      Cl.stringUtf8('Test dataset'),
    ],
    seller);
}

function setupPlatformAddress() {
  simnet.callPublicFn('bitcoin-escrow', 'set-platform-witness-program',
    [Cl.buffer(WITNESS_PROGRAM_PLATFORM)], deployer);
}

describe('bitcoin-escrow', () => {
  beforeEach(() => {
    setupListing();
    setupPlatformAddress();
  });

  describe('create-btc-escrow', () => {
    it('buyer can create a BTC escrow for a listing', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'create-btc-escrow',
        [
          Cl.uint(1),                           // listing-id
          Cl.uint(500000),                      // amount-sats (0.005 BTC, below multisig threshold)
          Cl.uint(1),                           // access-level
          Cl.buffer(WITNESS_PROGRAM_BUYER),     // buyer witness program
          Cl.uint(0),                           // no multisig
        ],
        buyer,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('escrow starts in AWAITING-BTC status', () => {
      simnet.callPublicFn('bitcoin-escrow', 'create-btc-escrow',
        [Cl.uint(1), Cl.uint(500000), Cl.uint(1),
          Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer);

      const { result } = simnet.callReadOnlyFn(
        'bitcoin-escrow', 'get-escrow', [Cl.uint(1)], deployer,
      );
      const status = Number(result.value?.value?.status?.value ?? -1);
      expect(status).toBe(0); // STATUS-AWAITING-BTC
    });

    it('rejects zero amount', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'create-btc-escrow',
        [Cl.uint(1), Cl.uint(0), Cl.uint(1), Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer,
      );
      expect(result).toBeErr(Cl.uint(2306));
    });

    it('rejects high-value purchase without multisig policy', () => {
      // 2 BTC = 200,000,000 sats — above MULTISIG-THRESHOLD-SATS (1,000,000)
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'create-btc-escrow',
        [Cl.uint(1), Cl.uint(200000000), Cl.uint(1),
          Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer,
      );
      expect(result).toBeErr(Cl.uint(2307));
    });
  });

  describe('raise-dispute', () => {
    beforeEach(() => {
      simnet.callPublicFn('bitcoin-escrow', 'create-btc-escrow',
        [Cl.uint(1), Cl.uint(500000), Cl.uint(1),
          Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer);
    });

    it('buyer can raise a dispute on an awaiting escrow', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'raise-dispute',
        [Cl.uint(1), Cl.stringUtf8('Payment not received'), Cl.none()],
        buyer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('third party cannot raise a dispute', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'raise-dispute',
        [Cl.uint(1), Cl.stringUtf8('Fake dispute'), Cl.none()],
        other,
      );
      expect(result).toBeErr(Cl.uint(2300));
    });
  });

  describe('set-platform-witness-program', () => {
    it('admin can update the platform witness program', () => {
      const newProgram = new Uint8Array(20).fill(0x33);
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'set-platform-witness-program',
        [Cl.buffer(newProgram)],
        deployer,
      );
      expect(result).toBeOk(Cl.buffer(newProgram));
    });

    it('non-admin cannot update the platform witness program', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'set-platform-witness-program',
        [Cl.buffer(new Uint8Array(20))],
        other,
      );
      expect(result).toBeErr(Cl.uint(2300));
    });
  });
});
