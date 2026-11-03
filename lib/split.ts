// Splitting one payment into several entries.
//
// You enter the full amount first (say $50 at the market), then optionally
// list items that belong in other pouches ($12.50 Tavern, $7 Supplies).
// Each item becomes its own entry, and whatever is left over ($30.50) goes
// to the pouch chosen on the main form. Every entry shares the main date.

import { formatCents, parseAmount } from "./money";
import {
  validateTransactionInput,
  type TransactionErrors,
  type TransactionInput,
} from "./validation";
import type { Category, Transaction } from "./types";

// One item, as typed into the split sheet. Everything is text until saved.
export interface SplitItem {
  id: string; // only for React's list keys; never saved
  amount: string;
  categoryId: string;
  note: string;
}

export type SplitItemErrors = { amount?: string; categoryId?: string; note?: string };

export type SplitResult =
  | { ok: true; entries: Omit<Transaction, "id">[] }
  | {
      ok: false;
      errors: TransactionErrors; // for the main form's fields
      itemErrors: SplitItemErrors[]; // one per item, in the same order
      splitError?: string; // about the split as a whole
    };

function isBlank(item: SplitItem): boolean {
  return item.amount.trim() === "" && item.categoryId === "" && item.note.trim() === "";
}

// Items nobody filled in (e.g. an "Add item" tapped by mistake) are ignored.
export function withoutBlankItems(items: SplitItem[]): SplitItem[] {
  return items.filter((item) => !isBlank(item));
}

function centsOrNull(text: string): number | null {
  const parsed = parseAmount(text);
  return parsed.ok ? parsed.cents : null;
}

// The running sums shown in the split sheet. Amounts that can't be read yet
// count as $0, and the rest is null until the total can be read.
export function splitTotals(total: string, items: SplitItem[]) {
  const totalCents = centsOrNull(total);
  const itemsCents = items.reduce((sum, item) => sum + (centsOrNull(item.amount) ?? 0), 0);
  return {
    totalCents,
    itemsCents,
    restCents: totalCents === null ? null : totalCents - itemsCents,
  };
}

// The most one item can be: the full amount minus every other item, so
// the items can never add up to more than the full amount. Undefined while
// the full amount can't be read (then the usual $1,000,000 limit applies).
export function itemLimitCents(total: string, items: SplitItem[], itemId: string): number | undefined {
  const others = items.filter((item) => item.id !== itemId);
  const { restCents } = splitTotals(total, others);
  return restCents === null ? undefined : Math.max(restCents, 0);
}

// Checks the main form and every item together, and turns them into the
// entries to record: the rest first (if any), then each item.
export function validateSplitEntry(
  main: TransactionInput,
  items: SplitItem[],
  categories: Category[],
): SplitResult {
  const mainResult = validateTransactionInput(main, categories);
  const errors: TransactionErrors = mainResult.ok ? {} : { ...mainResult.errors };

  const itemResults = items.map((item) =>
    isBlank(item)
      ? null
      : validateTransactionInput(
          { type: main.type, amount: item.amount, date: main.date, categoryId: item.categoryId, note: item.note },
          categories,
        ),
  );
  // The date belongs to the main form, so its error shows only there.
  const itemErrors: SplitItemErrors[] = itemResults.map((result) => {
    if (!result || result.ok) return {};
    const { amount, categoryId, note } = result.errors;
    return { ...(amount && { amount }), ...(categoryId && { categoryId }), ...(note && { note }) };
  });

  // Work out the rest only once every amount can be read.
  let splitError: string | undefined;
  let restCents: number | null = null;
  const totalCents = centsOrNull(main.amount);
  const allItemsRead = itemResults.every((result) => !result || result.ok || !result.errors.amount);
  if (totalCents !== null && allItemsRead) {
    const itemsCents = splitTotals(main.amount, withoutBlankItems(items)).itemsCents;
    restCents = totalCents - itemsCents;
    if (restCents < 0) {
      splitError = `The items add up to ${formatCents(itemsCents)}, more than the ${formatCents(totalCents)} total.`;
    } else if (restCents === 0) {
      delete errors.categoryId; // nothing is left over, so no pouch is needed for it
    }
  }

  const failed =
    Object.keys(errors).length > 0 ||
    itemErrors.some((e) => Object.keys(e).length > 0) ||
    splitError !== undefined;
  if (failed || restCents === null) return { ok: false, errors, itemErrors, splitError };

  const note = main.note.trim() === "" ? undefined : main.note.trim();
  const entries: Omit<Transaction, "id">[] = [];
  if (restCents > 0) {
    entries.push({ type: main.type, amountCents: restCents, date: main.date, categoryId: main.categoryId, note });
  }
  for (const result of itemResults) {
    // An item without its own note borrows the main one.
    if (result?.ok) entries.push({ ...result.value, note: result.value.note ?? note });
  }
  return { ok: true, entries };
}
