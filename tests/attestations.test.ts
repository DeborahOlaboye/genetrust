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
