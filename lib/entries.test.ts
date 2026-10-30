import { describe, expect, it } from "vitest";
import { newestFirst } from "./entries";
import type { Transaction } from "./types";

function entry(id: string, date: string): Transaction {
  return { id, type: "expense", amountCents: 100, date, categoryId: "provisions" };
}

describe("newestFirst", () => {
  it("puts later dates first, and the most recently added first on the same day", () => {
    const early = entry("early", "2026-10-05");
    const late = entry("late", "2026-10-20");
    const earlyAddedLater = entry("early-2", "2026-10-05");

    expect(newestFirst([early, late, earlyAddedLater]).map((t) => t.id)).toEqual([
      "late",
      "early-2",
      "early",
    ]);
  });

  it("leaves the original list alone", () => {
    const list = [entry("a", "2026-10-01"), entry("b", "2026-10-02")];
    newestFirst(list);
    expect(list.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
