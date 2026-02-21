import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const admin = accounts.get('deployer')!;
const relayer = accounts.get('wallet_1')!;
const challenger = accounts.get('wallet_2')!;
const other = accounts.get('wallet_3')!;

const RESULT_HASH = new Uint8Array(32).fill(0xcc);
const RESULT_SUMMARY = new Uint8Array(64).fill(0x0a);
const EVIDENCE_HASH = new Uint8Array(32).fill(0xdd);
const PROOF_HASH = new Uint8Array(32).fill(0x05);
const PROOF_DATA = new Uint8Array(100).fill(0x06);
const PUBLIC_INPUTS = new Uint8Array(64).fill(0x07);
const STATE_ROOT = new Uint8Array(32).fill(0x08);

function setupSubnetRelayerAndProof() {
  // Register subnet
  simnet.callPublicFn('subnet-registry', 'register-subnet',
    [Cl.uint(1), Cl.principal(admin), Cl.principal(admin),
      Cl.stringUtf8('Settlement Test Subnet'), Cl.stringUtf8(''), Cl.stringUtf8('')],
    admin);

  // Add relayer
  simnet.callPublicFn('subnet-registry', 'add-relayer',
    [Cl.uint(1), Cl.principal(relayer)], admin);

  // Set state root so proof verifier can validate
  simnet.callPublicFn('cross-subnet-bridge', 'update-state-root',
    [Cl.uint(1), Cl.buffer(STATE_ROOT), Cl.uint(50)], relayer);

  // Submit and verify a proof
  simnet.callPublicFn('cross-chain-proof-verifier', 'submit-proof',
    [Cl.uint(1), Cl.uint(1), Cl.uint(42),
      Cl.buffer(PROOF_HASH), Cl.buffer(PROOF_DATA),
      Cl.buffer(PUBLIC_INPUTS), Cl.buffer(STATE_ROOT)],
    relayer);

  simnet.callPublicFn('cross-chain-proof-verifier', 'verify-proof',
    [Cl.uint(1)], relayer);
}

describe('subnet-settlement', () => {
  beforeEach(setupSubnetRelayerAndProof);

  describe('submit-settlement', () => {
    it('relayer can submit a settlement backed by a verified proof', () => {
      const { result } = simnet.callPublicFn(
        'subnet-settlement',
        'submit-settlement',
        [
          Cl.uint(1),                        // subnet-id
          Cl.uint(1),                        // settlement-type: PROCESSING
          Cl.uint(42),                       // data-id
          Cl.uint(1),                        // proof-id
          Cl.buffer(RESULT_HASH),
          Cl.buffer(RESULT_SUMMARY),
        ],
        relayer,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('rejects submission without a verified proof', () => {
      // proof-id 99 does not exist / is not verified
      const { result } = simnet.callPublicFn(
        'subnet-settlement',
        'submit-settlement',
        [Cl.uint(1), Cl.uint(1), Cl.uint(42), Cl.uint(99),
          Cl.buffer(RESULT_HASH), Cl.buffer(RESULT_SUMMARY)],
        relayer,
      );
      expect(result).toBeErr(Cl.uint(503));
    });

    it('rejects submission from non-relayer', () => {
      const { result } = simnet.callPublicFn(
        'subnet-settlement',
        'submit-settlement',
        [Cl.uint(1), Cl.uint(1), Cl.uint(42), Cl.uint(1),
          Cl.buffer(RESULT_HASH), Cl.buffer(RESULT_SUMMARY)],
        other,
      );
      expect(result).toBeErr(Cl.uint(500));
    });
  });

  describe('challenge-settlement', () => {
    beforeEach(() => {
      simnet.callPublicFn('subnet-settlement', 'submit-settlement',
        [Cl.uint(1), Cl.uint(1), Cl.uint(42), Cl.uint(1),
          Cl.buffer(RESULT_HASH), Cl.buffer(RESULT_SUMMARY)],
        relayer);
    });

    it('anyone can challenge a settlement during challenge period', () => {
      const { result } = simnet.callPublicFn(
        'subnet-settlement',
        'challenge-settlement',
        [Cl.uint(1), Cl.stringUtf8('Invalid result hash'), Cl.buffer(EVIDENCE_HASH)],
        challenger,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe('finalize-settlement', () => {
    beforeEach(() => {
      simnet.callPublicFn('subnet-settlement', 'submit-settlement',
        [Cl.uint(1), Cl.uint(1), Cl.uint(42), Cl.uint(1),
          Cl.buffer(RESULT_HASH), Cl.buffer(RESULT_SUMMARY)],
        relayer);
    });

    it('cannot finalize during challenge period', () => {
      const { result } = simnet.callPublicFn(
        'subnet-settlement',
        'finalize-settlement',
        [Cl.uint(1)],
        admin,
      );
      expect(result).toBeErr(Cl.uint(506));
    });

    it('can finalize after challenge period elapses', () => {
      // Advance 145+ blocks past challenge deadline
      simnet.mineEmptyBlocks(145);
      const { result } = simnet.callPublicFn(
        'subnet-settlement',
        'finalize-settlement',
        [Cl.uint(1)],
        admin,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
