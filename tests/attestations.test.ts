import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;

// Constants mirroring the Clarity contract
const ERR_NOT_AUTHORIZED = 401;
const ERR_INVALID_DATA = 400;
const PROOF_TYPE_GENOMIC = Cl.uint(1);

// ─── Smoke Tests ──────────────────────────────────────────────────────────────

describe('attestations contract - smoke', () => {
  it('simnet is initialised', () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it('contract is deployed and reachable', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-error-counter',
      [],
      deployer,
    );
    expect(result).toBeDefined();
  });
});

// ─── Error Handling & Context ─────────────────────────────────────────────────

describe('attestations contract - error handling', () => {
  it('should handle invalid proof types with HTTP 400 error code', () => {
    const { result } = simnet.callPublicFn(
      'attestations',
      'verify-proof',
      [
        Cl.uint(999), // Invalid proof type
        Cl.bufferFromHex('00'), 
        Cl.uint(1)
      ],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(ERR_INVALID_DATA));
  });

  it('should track error context when a verification fails', () => {
    // Trigger an error by calling a restricted function
    simnet.callPublicFn(
      'attestations',
      'set-admin',
      [Cl.principal(wallet1)],
      wallet1, // Unauthorized
    );

    // Check if error-counter increased and context was stored
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-error-context',
      [Cl.uint(0)],
      deployer,
    );
    
    expect(result).toBeSome(expect.anything());
    const context: any = result.expectSome().data;
    expect(context['error-code']).toEqual(Cl.uint(ERR_NOT_AUTHORIZED));
  });
});

// ─── Proof Verification ───────────────────────────────────────────────────────

describe('attestations contract - verification', () => {
  it('should allow authorized users to submit genomic proofs', () => {
    const proofData = Cl.bufferFromHex('abcdef0123456789');
    const dataId = Cl.uint(101);

    const { result } = simnet.callPublicFn(
      'attestations',
      'verify-proof',
      [PROOF_TYPE_GENOMIC, proofData, dataId],
      wallet1,
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it('check-verified-proof returns the correct status for a data-id', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'check-verified-proof',
      [Cl.uint(101), PROOF_TYPE_GENOMIC],
      deployer,
    );
    
    expect(result).toBeOk(Cl.bool(true));
  });
});

describe('attestations - new validation rules (simnet)', () => {
  it('register-proof rejects zero data-id (ERR-INVALID-INPUT u400)', () => {
    const { result } = simnet.callPublicFn(
      'attestations',
      'register-proof',
      [
        Cl.uint(0),  // zero data-id — should fail
        Cl.uint(1),
        Cl.buffer(Buffer.from('c'.repeat(32))),
        Cl.buffer(Buffer.from('params')),
        Cl.stringUtf8('test metadata'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it('register-proof rejects invalid proof type 5 (ERR-INVALID-PROOF-TYPE u405)', () => {
    const { result } = simnet.callPublicFn(
      'attestations',
      'register-proof',
      [
        Cl.uint(1),
        Cl.uint(5),  // invalid proof type
        Cl.buffer(Buffer.from('c'.repeat(32))),
        Cl.buffer(Buffer.from('params')),
        Cl.stringUtf8('test metadata'),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(405));
  });

  it('deactivate-verifier rejects non-contract-owner (ERR-NOT-CONTRACT-OWNER u413)', () => {
    // wallet1 is not contract owner
    const { result } = simnet.callPublicFn(
      'attestations',
      'deactivate-verifier',
      [Cl.uint(1)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(413));
  });

  it('verify-proof rejects invalid proof-id 0 (ERR-INVALID-INPUT u400)', () => {
    const { result } = simnet.callPublicFn(
      'attestations',
      'verify-proof',
      [Cl.uint(0), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(400));
  });
});

describe('attestations - snapshot and counter helpers (simnet)', () => {
  it('get-total-proofs starts at zero', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-total-proofs',
      [],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it('get-total-verifiers starts at zero', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-total-verifiers',
      [],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it('get-total-verified-proofs starts at zero', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-total-verified-proofs',
      [],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it('get-proof-summary returns none for non-existent proof', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-proof-summary',
      [Cl.uint(99999)],
      deployer,
    );
    expect(result).toBeNone();
  });

  it('is-active-verifier returns false for non-existent verifier', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'is-active-verifier',
      [Cl.uint(99999)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(false));
  });

  it('get-next-proof-id starts at 1', () => {
    const { result } = simnet.callReadOnlyFn(
      'attestations',
      'get-next-proof-id',
      [],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(1));
  });
});
