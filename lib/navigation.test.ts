import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./navigation";

describe("safeReturnPath", () => {
  it("keeps addresses inside this app", () => {
    expect(safeReturnPath("/")).toBe("/");
    expect(safeReturnPath("/ledger")).toBe("/ledger");
  });

  it("falls back to the Ledger for anything else", () => {
    expect(safeReturnPath(undefined)).toBe("/ledger");
    expect(safeReturnPath(["/", "/hearth"])).toBe("/ledger");
    expect(safeReturnPath("https://example.com")).toBe("/ledger");
    expect(safeReturnPath("//example.com")).toBe("/ledger"); // "//" means another website
  });
});
