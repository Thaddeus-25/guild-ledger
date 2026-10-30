import { describe, expect, it } from "vitest";
import {
  budgetBarText,
  budgetStatus,
  filledSegments,
  monthTotals,
  monthTransactions,
  pouchUsage,
  unlimitedSpending,
} from "./budget";
import { createStarterData } from "./starterData";
import type { Category, EntryType, Transaction } from "./types";

let nextId = 0;
function entry(type: EntryType, cents: number, date: string, categoryId: string): Transaction {
  nextId += 1;
  return { id: `t${nextId}`, type, amountCents: cents, date, categoryId };
}

// Starter pouches, with a $100 limit on Provisions.
const pouches: Category[] = createStarterData().categories.map((c) =>
  c.id === "provisions" ? { ...c, monthlyLimitCents: 10000 } : c,
);

describe("budgetStatus", () => {
  it("is 'under' below 80% of the limit", () => {
    expect(budgetStatus(0, 100)).toBe("under");
    expect(budgetStatus(79, 100)).toBe("under");
  });

  it("is 'near' from 80% up to just under the limit", () => {
    expect(budgetStatus(80, 100)).toBe("near");
    expect(budgetStatus(99, 100)).toBe("near");
  });

  it("is 'at' exactly on the limit and 'over' past it", () => {
    expect(budgetStatus(100, 100)).toBe("at");
    expect(budgetStatus(101, 100)).toBe("over");
  });
});

describe("monthTotals", () => {
  const transactions = [
    entry("expense", 4200, "2026-09-30", "tavern"), // September
    entry("income", 250000, "2026-10-01", "wages"), // first day of October
    entry("expense", 1999, "2026-10-31", "provisions"), // last day of October
    entry("expense", 500, "2026-11-01", "travel"), // November
  ];

  it("counts only the chosen month, including its first and last days", () => {
    expect(monthTotals(transactions, "2026-10")).toEqual({
      incomeCents: 250000,
      expenseCents: 1999,
      remainingCents: 248001,
    });
    expect(monthTransactions(transactions, "2026-10")).toHaveLength(2);
  });

  it("goes negative when more is spent than earned", () => {
    const tight = [
      entry("income", 1000, "2026-10-01", "wages"),
      entry("expense", 1500, "2026-10-02", "lodging"),
    ];
    expect(monthTotals(tight, "2026-10").remainingCents).toBe(-500);
  });
});

describe("pouchUsage", () => {
  it("adds up a pouch's expenses for the month, ignoring income and other months", () => {
    const transactions = [
      entry("expense", 3000, "2026-10-03", "provisions"),
      entry("expense", 1500, "2026-10-20", "provisions"),
      entry("expense", 9999, "2026-09-15", "provisions"), // other month
      entry("income", 50000, "2026-10-01", "wages"), // income
    ];
    expect(pouchUsage(pouches, transactions, "2026-10")).toEqual([
      {
        category: pouches.find((c) => c.id === "provisions"),
        spentCents: 4500,
        limitCents: 10000,
        leftCents: 5500,
        percent: 0.45,
        status: "under",
      },
    ]);
  });

  it("shows how far over the limit a pouch is", () => {
    const transactions = [entry("expense", 11240, "2026-10-03", "provisions")];
    const [provisions] = pouchUsage(pouches, transactions, "2026-10");
    expect(provisions.leftCents).toBe(-1240);
    expect(provisions.status).toBe("over");
  });
});

describe("unlimitedSpending", () => {
  it("lists expense pouches without a limit, even with nothing spent", () => {
    const transactions = [entry("expense", 875, "2026-10-29", "tavern")];
    const result = unlimitedSpending(pouches, transactions, "2026-10");

    expect(result.map((r) => r.category.id)).toEqual([
      "lodging",
      "travel",
      "tavern",
      "supplies",
      "other",
    ]);
    expect(result.find((r) => r.category.id === "tavern")?.spentCents).toBe(875);
    expect(result.find((r) => r.category.id === "travel")?.spentCents).toBe(0);
  });
});

describe("filledSegments", () => {
  it("fills 10 segments in proportion, rounding to the nearest one", () => {
    expect(filledSegments(0, 10000)).toBe(0);
    expect(filledSegments(4500, 10000)).toBe(5); // 4.5 rounds up
    expect(filledSegments(8000, 10000)).toBe(8);
    expect(filledSegments(10000, 10000)).toBe(10);
  });

  it("never fills more than 10, even when over the limit", () => {
    expect(filledSegments(11240, 10000)).toBe(10);
  });
});

describe("budgetBarText", () => {
  function usageFor(spentCents: number) {
    const transactions = spentCents > 0 ? [entry("expense", spentCents, "2026-10-03", "provisions")] : [];
    return pouchUsage(pouches, transactions, "2026-10")[0];
  }

  it("spells out spent, limit and what's left", () => {
    expect(budgetBarText(usageFor(4500))).toBe("$45.00 of $100.00 used · $55.00 left");
    expect(budgetBarText(usageFor(10000))).toBe("$100.00 of $100.00 used · $0.00 left");
  });

  it("says how far over, without a minus sign", () => {
    expect(budgetBarText(usageFor(11240))).toBe("Over by $12.40");
  });
});
