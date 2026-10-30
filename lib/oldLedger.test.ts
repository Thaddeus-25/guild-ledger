import { describe, expect, it } from "vitest";
import { oldLedgerCounts } from "./oldLedger";
import { createStarterData } from "./starterData";

const starter = createStarterData();

describe("oldLedgerCounts", () => {
  it("ignores a browser with nothing saved", () => {
    expect(oldLedgerCounts({ kind: "empty" })).toBe(false);
  });

  it("counts damaged data, so it can be downloaded", () => {
    expect(oldLedgerCounts({ kind: "corrupt", raw: "garbage" })).toBe(true);
  });

  it("ignores untouched starter pouches", () => {
    expect(oldLedgerCounts({ kind: "ok", data: starter })).toBe(false);
  });

  it("ignores a changed setting on its own", () => {
    const data = { ...starter, settings: { showRewards: false } };
    expect(oldLedgerCounts({ kind: "ok", data })).toBe(false);
  });

  it("counts a ledger with an entry", () => {
    const data = {
      ...starter,
      transactions: [{ id: "t1", type: "expense" as const, amountCents: 500, date: "2026-10-01", categoryId: "tavern" }],
    };
    expect(oldLedgerCounts({ kind: "ok", data })).toBe(true);
  });

  it("counts a renamed starter pouch", () => {
    const data = {
      ...starter,
      categories: starter.categories.map((c) => (c.id === "lodging" ? { ...c, name: "Rent" } : c)),
    };
    expect(oldLedgerCounts({ kind: "ok", data })).toBe(true);
  });

  it("counts a deleted starter pouch", () => {
    const data = { ...starter, categories: starter.categories.filter((c) => c.id !== "tavern") };
    expect(oldLedgerCounts({ kind: "ok", data })).toBe(true);
  });
});
