import { describe, expect, it } from "vitest";
import { combineLedgers } from "./combineLedgers";
import { createStarterData } from "./starterData";
import { validateSaveFile } from "./storage";
import type { Category, SaveFile, Transaction } from "./types";

const makeId = () => "new-1";

function entry(id: string, categoryId: string, type: "income" | "expense" = "expense"): Transaction {
  return { id, type, amountCents: 500, date: "2026-10-01", categoryId };
}

function ledger(extra: { categories?: Category[]; transactions?: Transaction[]; logbookDays?: string[] }): SaveFile {
  const base = createStarterData();
  return {
    ...base,
    categories: [...base.categories, ...(extra.categories ?? [])],
    transactions: extra.transactions ?? [],
    logbookDays: extra.logbookDays ?? [],
  };
}

function expectValid(result: SaveFile) {
  expect(validateSaveFile(result)).not.toBeNull();
}

describe("combineLedgers", () => {
  it("keeps the account's version of a pouch with the same id, with no duplicate", () => {
    const account = ledger({});
    const old = ledger({});
    old.categories = old.categories.map((c) => (c.id === "tavern" ? { ...c, monthlyLimitCents: 999 } : c));
    const result = combineLedgers(account, old, makeId);
    expect(result.categories.filter((c) => c.id === "tavern")).toEqual([
      account.categories.find((c) => c.id === "tavern"),
    ]);
    expect(result.categories).toHaveLength(account.categories.length);
    expectValid(result);
  });

  it("joins pouches with the same name and type, moving the old entries", () => {
    const account = ledger({ categories: [{ id: "B", name: "Pets", type: "expense", icon: "heart" }] });
    const old = ledger({
      categories: [{ id: "A", name: "pets", type: "expense", icon: "heart" }],
      transactions: [entry("t1", "A")],
    });
    const result = combineLedgers(account, old, makeId);
    expect(result.categories.filter((c) => c.name.toLowerCase() === "pets").map((c) => c.id)).toEqual(["B"]);
    expect(result.transactions).toEqual([entry("t1", "B")]);
    expectValid(result);
  });

  it("gives a new id to an old pouch whose id is taken by a pouch of the other type", () => {
    const account = ledger({ categories: [{ id: "X", name: "Gifts", type: "income", icon: "gem" }] });
    const old = ledger({
      categories: [{ id: "X", name: "Presents", type: "expense", icon: "chest" }],
      transactions: [entry("t1", "X")],
    });
    const result = combineLedgers(account, old, makeId);
    expect(result.categories).toContainEqual({ id: "new-1", name: "Presents", type: "expense", icon: "chest" });
    expect(result.categories).toContainEqual({ id: "X", name: "Gifts", type: "income", icon: "gem" });
    expect(result.transactions).toEqual([entry("t1", "new-1")]);
    expectValid(result);
  });

  it("adds an old pouch that matches nothing as it is", () => {
    const pouch: Category = { id: "A", name: "Books", type: "expense", icon: "book" };
    const result = combineLedgers(ledger({}), ledger({ categories: [pouch] }), makeId);
    expect(result.categories).toContainEqual(pouch);
    expectValid(result);
  });

  it("skips old entries already in the account and adds the rest", () => {
    const account = ledger({ transactions: [entry("t1", "tavern")] });
    const old = ledger({ transactions: [{ ...entry("t1", "tavern"), amountCents: 1 }, entry("t2", "lodging")] });
    const result = combineLedgers(account, old, makeId);
    expect(result.transactions).toEqual([entry("t1", "tavern"), entry("t2", "lodging")]);
    expectValid(result);
  });

  it("joins the logbook days without repeats and keeps the account's settings", () => {
    const account = { ...ledger({ logbookDays: ["2026-10-01", "2026-10-02"] }), settings: { showRewards: false } };
    const old = { ...ledger({ logbookDays: ["2026-10-02", "2026-09-30"] }), settings: { showRewards: true } };
    const result = combineLedgers(account, old, makeId);
    expect([...result.logbookDays].sort()).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(result.settings).toEqual({ showRewards: false });
    expectValid(result);
  });
});
