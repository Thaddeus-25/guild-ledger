// Checks what someone typed into a form. Each function returns either
// clean data ready to save, or one friendly message per problem field.

import { isValidDate } from "./dates";
import { parseAmount } from "./money";
import type { Category, EntryType, IconName, Transaction } from "./types";

// ---------- Coin Pouch form ----------

// Form inputs are always text, so the limit is a string here.
export interface CategoryInput {
  name: string;
  type: EntryType;
  icon: IconName;
  limit: string;
}

export type CategoryErrors = { name?: string; limit?: string };

export type CategoryResult =
  | { ok: true; value: Omit<Category, "id"> }
  | { ok: false; errors: CategoryErrors };

export function validateCategoryInput(
  input: CategoryInput,
  categories: Category[],
  editingId?: string, // the pouch being edited, so it doesn't clash with itself
): CategoryResult {
  const errors: CategoryErrors = {};
  const name = input.name.trim();

  if (name === "") {
    errors.name = "Give the pouch a name.";
  } else if (name.length > 30) {
    errors.name = "Keep the name to 30 characters or fewer.";
  } else {
    const clash = categories.find(
      (c) =>
        c.id !== editingId &&
        c.type === input.type &&
        c.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) errors.name = `You already have a pouch called ${clash.name}.`;
  }

  // Only expense pouches have limits, and a blank limit means "no limit".
  let monthlyLimitCents: number | undefined;
  if (input.type === "expense" && input.limit.trim() !== "") {
    const parsed = parseAmount(input.limit);
    if (parsed.ok) monthlyLimitCents = parsed.cents;
    else errors.limit = parsed.error;
  }

  if (errors.name || errors.limit) return { ok: false, errors };
  return { ok: true, value: { name, type: input.type, icon: input.icon, monthlyLimitCents } };
}

// ---------- Ledger entry form ----------

export interface TransactionInput {
  type: EntryType;
  amount: string;
  date: string;
  categoryId: string;
  note: string;
}

export type TransactionErrors = {
  amount?: string;
  date?: string;
  categoryId?: string;
  note?: string;
};

export type TransactionResult =
  | { ok: true; value: Omit<Transaction, "id"> }
  | { ok: false; errors: TransactionErrors };

export function validateTransactionInput(
  input: TransactionInput,
  categories: Category[],
): TransactionResult {
  const errors: TransactionErrors = {};

  const amount = parseAmount(input.amount);
  if (!amount.ok) errors.amount = amount.error;

  if (!isValidDate(input.date)) errors.date = "Pick a date.";

  // The pouch must exist AND match the entry's type (no income in Provisions).
  const pouch = categories.find((c) => c.id === input.categoryId);
  if (!pouch || pouch.type !== input.type) errors.categoryId = "Choose a pouch.";

  const note = input.note.trim();
  if (note.length > 200) errors.note = "Keep the note to 200 characters or fewer.";

  if (!amount.ok || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      type: input.type,
      amountCents: amount.cents,
      date: input.date,
      categoryId: input.categoryId,
      note: note === "" ? undefined : note,
    },
  };
}
