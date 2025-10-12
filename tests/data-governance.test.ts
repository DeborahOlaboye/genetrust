import { describe, expect, it } from "vitest";

declare const simnet: any;

/*
  Basic smoke test for the Clarinet simnet environment.
  Add data-governance read-only checks (e.g., fetch-consent-record) later.
*/

describe("data-governance contract - smoke", () => {
  it("simnet is initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });
});
