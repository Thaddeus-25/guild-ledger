import { describe, expect, it } from "vitest";
import { centsToInput, formatCents, parseAmount } from "./money";

describe("parseAmount", () => {
  it("turns typed amounts into whole cents", () => {
    expect(parseAmount("12")).toEqual({ ok: true, cents: 1200 });
    expect(parseAmount("12.5")).toEqual({ ok: true, cents: 1250 });
    expect(parseAmount("$1,234.50")).toEqual({ ok: true, cents: 123450 });
    expect(parseAmount(" 7 ")).toEqual({ ok: true, cents: 700 });
  });

  it("avoids the decimal trap: 19.99 is exactly 1999 cents", () => {
    // 19.99 * 100 in JavaScript is 1998.9999999999998
    expect(parseAmount("19.99")).toEqual({ ok: true, cents: 1999 });
  });

  it("explains what's wrong with amounts it can't use", () => {
    expect(parseAmount("")).toEqual({ ok: false, error: "Enter an amount." });
    expect(parseAmount("abc")).toEqual({ ok: false, error: "Use numbers only, like 12.50." });
    expect(parseAmount("-5")).toEqual({ ok: false, error: "Use numbers only, like 12.50." });
    expect(parseAmount("0")).toEqual({ ok: false, error: "Amount must be more than $0." });
    expect(parseAmount("12.345")).toEqual({ ok: false, error: "Use at most 2 decimal places." });
    expect(parseAmount("1000000.01")).toEqual({
      ok: false,
      error: "Amount must be $1,000,000.00 or less.",
    });
  });
});

describe("formatCents", () => {
  it("shows cents as dollars", () => {
    expect(formatCents(123450)).toBe("$1,234.50");
    expect(formatCents(5)).toBe("$0.05");
  });
});

describe("centsToInput", () => {
  it("turns cents back into text for an input box", () => {
    expect(centsToInput(1250)).toBe("12.50");
  });
});
