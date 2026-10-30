import { describe, expect, it } from "vitest";
import { ledgerReducer } from "./ledgerReducer";
import { createStarterData } from "./starterData";
import type { SaveFile, Transaction } from "./types";

const entry: Transaction = {
  id: "t1",
  type: "expense",
  amountCents: 500,
  date: "2026-10-20",
  categoryId: "provisions",
};

// Makes an object (and everything inside it) read-only, so any
// attempt to change it in place throws an error.
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function withEntry(): SaveFile {
  return ledgerReducer(createStarterData(), {
    type: "addTransaction",
    transaction: entry,
    today: "2026-10-29",
  });
}

describe("ledgerReducer", () => {
  it("adds an entry and stamps today's logbook day", () => {
    const state = withEntry();
    expect(state.transactions).toEqual([entry]);
    expect(state.logbookDays).toEqual(["2026-10-29"]);
  });

  it("stamps each day only once", () => {
    const state = ledgerReducer(withEntry(), {
      type: "addTransaction",
      transaction: { ...entry, id: "t2" },
      today: "2026-10-29",
    });
    expect(state.transactions).toHaveLength(2);
    expect(state.logbookDays).toEqual(["2026-10-29"]);
  });

  it("keeps logbook stamps when an entry is deleted", () => {
    const state = ledgerReducer(withEntry(), { type: "deleteTransaction", id: "t1" });
    expect(state.transactions).toEqual([]);
    expect(state.logbookDays).toEqual(["2026-10-29"]);
  });

  it("updates an entry by id", () => {
    const state = ledgerReducer(withEntry(), {
      type: "updateTransaction",
      transaction: { ...entry, amountCents: 900 },
    });
    expect(state.transactions[0].amountCents).toBe(900);
  });

  it("refuses to delete a pouch that still has entries", () => {
    const state = withEntry();
    expect(ledgerReducer(state, { type: "deleteCategory", id: "provisions" })).toBe(state);
  });

  it("deletes an empty pouch", () => {
    const state = ledgerReducer(createStarterData(), { type: "deleteCategory", id: "tavern" });
    expect(state.categories.some((c) => c.id === "tavern")).toBe(false);
  });

  it("adds and updates pouches", () => {
    const added = ledgerReducer(createStarterData(), {
      type: "addCategory",
      category: { id: "pets", name: "Pets", type: "expense", icon: "heart" },
    });
    const updated = ledgerReducer(added, {
      type: "updateCategory",
      category: { id: "pets", name: "Pets", type: "expense", icon: "heart", monthlyLimitCents: 5000 },
    });
    expect(updated.categories.find((c) => c.id === "pets")?.monthlyLimitCents).toBe(5000);
  });

  it("turns rewards on and off", () => {
    const state = ledgerReducer(createStarterData(), { type: "setShowRewards", value: false });
    expect(state.settings.showRewards).toBe(false);
  });

  it("never changes the old state in place", () => {
    const frozen = deepFreeze(withEntry());
    expect(() => {
      ledgerReducer(frozen, { type: "addTransaction", transaction: { ...entry, id: "t2" }, today: "2026-10-30" });
      ledgerReducer(frozen, { type: "updateTransaction", transaction: { ...entry, amountCents: 1 } });
      ledgerReducer(frozen, { type: "deleteTransaction", id: "t1" });
      ledgerReducer(frozen, { type: "addCategory", category: { id: "x", name: "X", type: "expense", icon: "gem" } });
      ledgerReducer(frozen, { type: "updateCategory", category: { ...frozen.categories[0], name: "Pay" } });
      ledgerReducer(frozen, { type: "deleteCategory", id: "tavern" });
      ledgerReducer(frozen, { type: "setShowRewards", value: false });
      ledgerReducer(frozen, { type: "replaceAll", data: createStarterData() });
    }).not.toThrow();
  });
});
