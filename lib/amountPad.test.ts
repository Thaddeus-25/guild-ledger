import { describe, expect, it } from "vitest";
import { addDollars, pressKey, type PadKey } from "./amountPad";

// Presses several keys one after another, starting from an empty amount.
function type(...keys: PadKey[]): string {
  return keys.reduce(pressKey, "");
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

  it("leaves a half-typed or unusual amount alone", () => {
    expect(addDollars("12.", 5)).toBe("12.");
    expect(addDollars("$12", 5)).toBe("$12");
  });
});
