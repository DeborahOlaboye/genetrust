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

// Error codes from the contract
const ERR_NOT_AUTHORIZED = 2300;
const ERR_INVALID_AMOUNT = 2306;
const ERR_MULTISIG_REQUIRED = 2307;

function setupListing() {
  simnet.callPublicFn('exchange', 'create-listing',
    [
      Cl.uint(1),
      Cl.uint(1000000),                    // price uint
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

describe('bitcoin-escrow logic', () => {
  beforeEach(() => {
    setupListing();
    setupPlatformAddress();
  });

  describe('create-btc-escrow', () => {
    it('successfully creates an escrow for valid parameters', () => {
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'create-btc-escrow',
        [
          Cl.uint(1),                         // listing-id
          Cl.uint(500000),                    // amount-sats
          Cl.uint(1),                         // access-level
          Cl.buffer(WITNESS_PROGRAM_BUYER),   // buyer witness program
          Cl.uint(0),                         // no multisig
        ],
        buyer,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('validates the status of a newly created escrow', () => {
      simnet.callPublicFn('bitcoin-escrow', 'create-btc-escrow',
        [Cl.uint(1), Cl.uint(500000), Cl.uint(1), Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer);

      const { result } = simnet.callReadOnlyFn(
        'bitcoin-escrow', 'get-escrow', [Cl.uint(1)], deployer,
      );
      
      const escrowData: any = result.expectSome().data;
      expect(escrowData.status).toEqual(Cl.uint(0)); // STATUS-AWAITING-BTC
    });

    it('enforces multisig thresholds for high-value transactions', () => {
      // 2,000,000 sats is > 1,000,000 threshold
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'create-btc-escrow',
        [Cl.uint(1), Cl.uint(2000000), Cl.uint(1), Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer,
      );
      expect(result).toBeErr(Cl.uint(ERR_MULTISIG_REQUIRED));
    });
  });

  describe('dispute and admin management', () => {
    it('restricts dispute raising to the buyer or seller', () => {
      simnet.callPublicFn('bitcoin-escrow', 'create-btc-escrow',
        [Cl.uint(1), Cl.uint(500000), Cl.uint(1), Cl.buffer(WITNESS_PROGRAM_BUYER), Cl.uint(0)],
        buyer);

      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'raise-dispute',
        [Cl.uint(1), Cl.stringUtf8('Issue with payment'), Cl.none()],
        other, // Unauthorized user
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it('allows admin to update the platform witness program', () => {
      const newProgram = new Uint8Array(20).fill(0x99);
      const { result } = simnet.callPublicFn(
        'bitcoin-escrow',
        'set-platform-witness-program',
        [Cl.buffer(newProgram)],
        deployer,
      );
      expect(result).toBeOk(Cl.buffer(newProgram));
    });
  });
});
