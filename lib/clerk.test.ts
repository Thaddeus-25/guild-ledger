import { describe, expect, it } from "vitest";
import { clerkMessage, ENCOURAGEMENTS } from "./clerk";

const quietMonth = { monthEntryCount: 4, overPouchNames: [], recordedToday: false, dayOfMonth: 1 };

describe("clerkMessage", () => {
  it("welcomes an empty month first, even if a pouch is over", () => {
    expect(clerkMessage({ ...quietMonth, monthEntryCount: 0, overPouchNames: ["Tavern"] })).toBe(
      "A fresh page in the ledger. Record your first entry when you're ready.",
    );
  });

  it("gently names the first pouch that's past its limit", () => {
    expect(clerkMessage({ ...quietMonth, overPouchNames: ["Provisions", "Tavern"], recordedToday: true })).toBe(
      "Provisions is past its limit this month. Want to look over its entries or adjust the limit?",
    );
  });

  it("thanks you for recording something today", () => {
    expect(clerkMessage({ ...quietMonth, recordedToday: true })).toBe(
      "Thanks for keeping the ledger. Every entry makes the map clearer.",
    );
  });

  it("otherwise picks an encouragement by day of the month", () => {
    expect(clerkMessage({ ...quietMonth, dayOfMonth: 1 })).toBe(ENCOURAGEMENTS[0]);
    expect(clerkMessage({ ...quietMonth, dayOfMonth: 6 })).toBe(ENCOURAGEMENTS[1]);
  });

  it("has the four encouragements from the design", () => {
    expect(ENCOURAGEMENTS).toEqual([
      "A steady ledger is a trusty companion.",
      "Knowing where your gold goes is half the journey.",
      "Small entries add up to a clear map.",
      "The guild thanks you for keeping good records.",
    ]);
  });
});
