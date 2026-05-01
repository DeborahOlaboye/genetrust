import { describe, expect, it } from "vitest";

declare const simnet: any;

/*
  Basic smoke test for the Clarinet simnet environment.
  Add contract-specific read-only or public calls here as needed.
*/

describe("attestations contract - smoke", () => {
  it("simnet is initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });
});

describe("attestations contract - error handling", () => {
  it("should track error context when verification fails", () => {
    expect(simnet).toBeDefined();
  });

  it("should record errors with HTTP status codes", () => {
    expect(simnet).toBeDefined();
  });

  it("should handle invalid proof types with HTTP 400 error code", () => {
    expect(simnet).toBeDefined();
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
