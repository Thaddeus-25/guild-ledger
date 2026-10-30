// The budget math behind the Guild Hall. Every number here is worked
// out from the saved entries; none of it is ever stored.

import { monthOf } from "./dates";
import { formatCents } from "./money";
import type { Category, Transaction } from "./types";

// The entries dated in one month, e.g. "2026-10".
export function monthTransactions(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((t) => monthOf(t.date) === month);
}

function sumCents(transactions: Transaction[]): number {
  return transactions.reduce((total, t) => total + t.amountCents, 0);
}

export function monthTotals(
  transactions: Transaction[],
  month: string,
): { incomeCents: number; expenseCents: number; remainingCents: number } {
  const inMonth = monthTransactions(transactions, month);
  const incomeCents = sumCents(inMonth.filter((t) => t.type === "income"));
  const expenseCents = sumCents(inMonth.filter((t) => t.type === "expense"));
  // Can be negative: that means more went out than came in.
  return { incomeCents, expenseCents, remainingCents: incomeCents - expenseCents };
}

export type BudgetStatus = "under" | "near" | "at" | "over";

export function budgetStatus(spentCents: number, limitCents: number): BudgetStatus {
  if (spentCents > limitCents) return "over";
  if (spentCents === limitCents) return "at";
  // "spent is at least 80% of limit", written with whole numbers only
  // (spent / limit >= 0.8 is the same as spent * 5 >= limit * 4).
  if (spentCents * 5 >= limitCents * 4) return "near";
  return "under";
}

export interface PouchUsage {
  category: Category;
  spentCents: number;
  limitCents: number;
  leftCents: number; // negative when over the limit
  percent: number; // 0.45 = 45% used; can go above 1
  status: BudgetStatus;
}

function spentInPouch(transactions: Transaction[], categoryId: string, month: string): number {
  return sumCents(
    monthTransactions(transactions, month).filter(
      (t) => t.type === "expense" && t.categoryId === categoryId,
    ),
  );
}

// Every expense pouch that has a monthly limit, in the user's pouch order.
export function pouchUsage(
  categories: Category[],
  transactions: Transaction[],
  month: string,
): PouchUsage[] {
  return categories
    .filter((c) => c.type === "expense" && c.monthlyLimitCents !== undefined)
    .map((category) => {
      const limitCents = category.monthlyLimitCents as number;
      const spentCents = spentInPouch(transactions, category.id, month);
      return {
        category,
        spentCents,
        limitCents,
        leftCents: limitCents - spentCents,
        percent: spentCents / limitCents,
        status: budgetStatus(spentCents, limitCents),
      };
    });
}

// Expense pouches without a limit: just how much went into each.
export function unlimitedSpending(
  categories: Category[],
  transactions: Transaction[],
  month: string,
): { category: Category; spentCents: number }[] {
  return categories
    .filter((c) => c.type === "expense" && c.monthlyLimitCents === undefined)
    .map((category) => ({
      category,
      spentCents: spentInPouch(transactions, category.id, month),
    }));
}

// ---------- Budget bar helpers ----------

export const BAR_SEGMENTS = 10;

// How many of the bar's 10 segments to fill. Capped at 10 when over.
export function filledSegments(spentCents: number, limitCents: number): number {
  return Math.min(BAR_SEGMENTS, Math.round((spentCents * BAR_SEGMENTS) / limitCents));
}

// The words under a budget bar, so the meaning never depends on color.
export function budgetBarText(usage: PouchUsage): string {
  if (usage.status === "over") return `Over by ${formatCents(-usage.leftCents)}`;
  return `${formatCents(usage.spentCents)} of ${formatCents(usage.limitCents)} used · ${formatCents(usage.leftCents)} left`;
}
