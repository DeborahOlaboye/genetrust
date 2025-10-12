import { describe, expect, it } from "vitest";

declare const simnet: any;

/*
  Basic smoke test. Trait has no callable functions directly; leave as environment check for now.
*/

describe("dataset-registry-trait - smoke", () => {
  it("simnet is initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });
});
