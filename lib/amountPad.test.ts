import { describe, expect, it } from "vitest";
import { addDollars, finishAmount, pressKey, pressKeyFresh, type PadKey } from "./amountPad";

// Presses several keys one after another, starting from an empty amount.
function type(...keys: PadKey[]): string {
  return keys.reduce((amount, key) => pressKey(amount, key), "");
}

describe("pressKey", () => {
  it("builds an amount from digits and a dot", () => {
    expect(type("1", "2", ".", "5", "0")).toBe("12.50");
  });

  it("turns a dot pressed first into 0.", () => {
    expect(type(".", "5")).toBe("0.5");
  });

  it("ignores a second dot", () => {
    expect(type("1", ".", "2", ".")).toBe("1.2");
  });

  it("ignores a third decimal digit", () => {
    expect(type("1", ".", "2", "5", "9")).toBe("1.25");
  });

  it("replaces a lone 0 with the next digit", () => {
    expect(type("0", "5")).toBe("5");
    expect(type("0", "0")).toBe("0");
  });

  it("deletes the last character, down to empty", () => {
    expect(pressKey("12.5", "back")).toBe("12.");
    expect(pressKey("1", "back")).toBe("");
    expect(pressKey("", "back")).toBe("");
  });

  it("never goes over $1,000,000.00", () => {
    expect(type("1", "0", "0", "0", "0", "0", "0")).toBe("1000000");
    expect(pressKey("1000000", "0")).toBe("1000000");
    expect(pressKey("1000000.", "1")).toBe("1000000.");
    expect(pressKey("1000000.", "0")).toBe("1000000.0");
  });

  it("allows at most 7 digits before the dot", () => {
    expect(pressKey("9999999", "9")).toBe("9999999");
  });

  it("never goes over a smaller limit, like what's left to split", () => {
    expect(pressKey("3", "5", 3050)).toBe("3"); // $35 is more than $30.50
    expect(pressKey("30.", "5", 3050)).toBe("30.5");
    expect(pressKey("30.5", "1", 3050)).toBe("30.5");
    expect(pressKey("", "1", 0)).toBe(""); // nothing left
  });

  it("only deletes when the box holds something the pad can't continue", () => {
    expect(pressKey("$12", "5")).toBe("$12");
    expect(pressKey("$12", "back")).toBe("$1");
  });
});

describe("addDollars", () => {
  it("starts from nothing", () => {
    expect(addDollars("", 20)).toBe("20.00");
  });

  it("adds whole dollars and keeps 2 decimals", () => {
    expect(addDollars("12.5", 5)).toBe("17.50");
    expect(addDollars("0", 1)).toBe("1.00");
    expect(addDollars("3.99", 10)).toBe("13.99");
  });

  it("stops at $1,000,000.00", () => {
    expect(addDollars("999990", 20)).toBe("1000000.00");
  });

  it("stops at a smaller limit, like what's left to split", () => {
    expect(addDollars("20.00", 20, 3050)).toBe("30.50");
    expect(addDollars("", 1, 0)).toBe("");
  });

  it("leaves a half-typed or unusual amount alone", () => {
    expect(addDollars("12.", 5)).toBe("12.");
    expect(addDollars("$12", 5)).toBe("$12");
  });
});

describe("pressKeyFresh", () => {
  it("starts a new amount when the pad opens on a finished one", () => {
    expect(pressKeyFresh("12.50", "5", true)).toBe("5");
    expect(pressKeyFresh("12.50", ".", true)).toBe("0.");
  });

  it("deletes normally, even on a fresh pad", () => {
    expect(pressKeyFresh("12.50", "back", true)).toBe("12.5");
  });

  it("types normally once you've started", () => {
    expect(pressKeyFresh("5", "2", false)).toBe("52");
  });

  it("keeps to the limit", () => {
    expect(pressKeyFresh("5", "2", false, 3050)).toBe("5");
  });
});

describe("finishAmount", () => {
  it("shows every amount with its cents, so typed and coin amounts match", () => {
    expect(finishAmount("5")).toBe("5.00");
    expect(finishAmount("12.5")).toBe("12.50");
    expect(finishAmount("12.34")).toBe("12.34");
    expect(finishAmount("0.5")).toBe("0.50");
  });

  it("drops a dot left at the end", () => {
    expect(finishAmount("12.")).toBe("12.00");
    expect(finishAmount("0.")).toBe("0"); // $0 can't be saved; the form says so
  });

  it("leaves an empty or unreadable amount for the form's check", () => {
    expect(finishAmount("")).toBe("");
    expect(finishAmount("abc")).toBe("abc");
    expect(finishAmount("1.234")).toBe("1.234");
  });

  it("brings an amount typed on a computer down to the limit", () => {
    expect(finishAmount("45", 3050)).toBe("30.50");
    expect(finishAmount("45", 0)).toBe("");
    expect(finishAmount("12.5", 3050)).toBe("12.50");
    expect(finishAmount("abc", 3050)).toBe("abc");
  });
});
