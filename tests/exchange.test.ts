import { describe, expect, it } from "vitest";

declare const simnet: any;

/*
  Basic smoke test for the Clarinet simnet environment.
  Add exchange contract checks here later (e.g., get-listing, get-access-level-price, etc.).
*/

describe("exchange contract - smoke", () => {
  it("simnet is initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });
});
