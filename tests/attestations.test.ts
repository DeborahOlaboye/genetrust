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
