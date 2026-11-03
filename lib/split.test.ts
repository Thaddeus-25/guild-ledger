import { describe, expect, it } from "vitest";
import { createStarterData } from "./starterData";
import { itemLimitCents, splitTotals, validateSplitEntry, withoutBlankItems, type SplitItem } from "./split";
import type { TransactionInput } from "./validation";

const pouches = createStarterData().categories;

const main: TransactionInput = {
  type: "expense",
  amount: "50.00",
  date: "2026-10-30",
  categoryId: "provisions",
  note: "Market day",
};

function item(id: string, amount: string, categoryId: string, note = ""): SplitItem {
  return { id, amount, categoryId, note };
}

describe("withoutBlankItems", () => {
  it("drops items with nothing filled in", () => {
    const items = [item("a", "", ""), item("b", "5", ""), item("c", "", "", "  ")];
    expect(withoutBlankItems(items).map((i) => i.id)).toEqual(["b"]);
  });
});

describe("splitTotals", () => {
  it("adds up the items and works out the rest", () => {
    expect(splitTotals("50", [item("a", "12.50", "tavern"), item("b", "7", "")])).toEqual({
      totalCents: 5000,
      itemsCents: 1950,
      restCents: 3050,
    });
  });

  it("skips amounts that can't be read yet", () => {
    expect(splitTotals("50", [item("a", "abc", ""), item("b", "", "")]).itemsCents).toBe(0);
  });

  it("has no rest while the total is missing", () => {
    expect(splitTotals("", [item("a", "5", "")])).toEqual({
      totalCents: null,
      itemsCents: 500,
      restCents: null,
    });
  });

  it("gives a negative rest when the items are more than the total", () => {
    expect(splitTotals("10", [item("a", "12", "")]).restCents).toBe(-200);
  });
});

describe("itemLimitCents", () => {
  const items = [item("a", "12.50", "tavern"), item("b", "7", "supplies"), item("c", "", "")];

  it("is the full amount minus every other item", () => {
    expect(itemLimitCents("50", items, "a")).toBe(4300);
    expect(itemLimitCents("50", items, "c")).toBe(3050);
  });

  it("is 0 when nothing is left, never less", () => {
    expect(itemLimitCents("15", items, "c")).toBe(0);
  });

  it("is undefined while the full amount can't be read", () => {
    expect(itemLimitCents("", items, "a")).toBeUndefined();
  });
});

describe("validateSplitEntry", () => {
  it("records one entry when there are no items", () => {
    expect(validateSplitEntry(main, [item("a", "", "")], pouches)).toEqual({
      ok: true,
      entries: [
        { type: "expense", amountCents: 5000, date: "2026-10-30", categoryId: "provisions", note: "Market day" },
      ],
    });
  });

  it("gives the rest to the main pouch and records each item", () => {
    const result = validateSplitEntry(
      main,
      [item("a", "12.50", "tavern", "Ale"), item("b", "7", "supplies")],
      pouches,
    );
    expect(result).toEqual({
      ok: true,
      entries: [
        { type: "expense", amountCents: 3050, date: "2026-10-30", categoryId: "provisions", note: "Market day" },
        { type: "expense", amountCents: 1250, date: "2026-10-30", categoryId: "tavern", note: "Ale" },
        // An item without its own note borrows the main note.
        { type: "expense", amountCents: 700, date: "2026-10-30", categoryId: "supplies", note: "Market day" },
      ],
    });
  });

  it("needs no main pouch when the items use up the whole total", () => {
    const result = validateSplitEntry(
      { ...main, categoryId: "", note: "" },
      [item("a", "30", "tavern"), item("b", "20", "supplies")],
      pouches,
    );
    expect(result).toEqual({
      ok: true,
      entries: [
        { type: "expense", amountCents: 3000, date: "2026-10-30", categoryId: "tavern", note: undefined },
        { type: "expense", amountCents: 2000, date: "2026-10-30", categoryId: "supplies", note: undefined },
      ],
    });
  });

  it("still needs the main pouch when some gold is left over", () => {
    const result = validateSplitEntry({ ...main, categoryId: "" }, [item("a", "30", "tavern")], pouches);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual({ categoryId: "Choose a pouch." });
  });

  it("rejects items that add up to more than the total", () => {
    const result = validateSplitEntry(
      main,
      [item("a", "40", "tavern"), item("b", "15", "supplies")],
      pouches,
    );
    expect(result).toEqual({
      ok: false,
      errors: {},
      itemErrors: [{}, {}],
      splitError: "The items add up to $55.00, more than the $50.00 total.",
    });
  });

  it("checks each item's amount, pouch and note", () => {
    const result = validateSplitEntry(
      main,
      [
        item("a", "", "tavern"),
        item("b", "5", ""),
        item("c", "5", "wages"), // an income pouch on an expense
        item("d", "1", "tavern", "x".repeat(201)),
      ],
      pouches,
    );
    expect(!result.ok && result.itemErrors).toEqual([
      { amount: "Enter an amount." },
      { categoryId: "Choose a pouch." },
      { categoryId: "Choose a pouch." },
      { note: "Keep the note to 200 characters or fewer." },
    ]);
  });

  it("keeps the main form's own errors", () => {
    const result = validateSplitEntry({ ...main, amount: "", date: "" }, [item("a", "5", "tavern")], pouches);
    expect(!result.ok && result.errors).toEqual({ amount: "Enter an amount.", date: "Pick a date." });
  });

  it("gives blank items no errors and leaves them out", () => {
    const result = validateSplitEntry(main, [item("a", "", ""), item("b", "10", "tavern")], pouches);
    expect(result.ok && result.entries.map((e) => e.amountCents)).toEqual([4000, 1000]);
  });
});
