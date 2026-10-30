// Checks what someone typed into a form. Each function returns either
// clean data ready to save, or one friendly message per problem field.

import { parseAmount } from "./money";
import type { Category, EntryType, IconName } from "./types";

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
