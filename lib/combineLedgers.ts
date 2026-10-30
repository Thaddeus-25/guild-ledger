// Combines an old browser-only ledger (from before accounts) into the
// account's ledger, without making duplicate pouches or entries.

import { newId } from "./ids";
import type { Category, SaveFile } from "./types";

export function combineLedgers(account: SaveFile, old: SaveFile, makeId: () => string = newId): SaveFile {
  const categories: Category[] = [...account.categories];
  // Where each old pouch ended up: old pouch id → pouch id in the result.
  const pouchFor = new Map<string, string>();

  for (const pouch of old.categories) {
    const sameId = account.categories.find((c) => c.id === pouch.id);
    if (sameId && sameId.type === pouch.type) {
      // The same pouch (e.g. the starter "tavern"). Keep the account's.
      pouchFor.set(pouch.id, sameId.id);
      continue;
    }

    // Made separately on two devices, e.g. "Pets" and "pets".
    const sameName = account.categories.find(
      (c) => c.type === pouch.type && c.name.toLowerCase() === pouch.name.toLowerCase(),
    );
    if (sameName) {
      pouchFor.set(pouch.id, sameName.id);
      continue;
    }

    // Its id is already used by a pouch of the other type, so it needs a
    // new one. Otherwise an expense could end up in an income pouch.
    const id = sameId ? makeId() : pouch.id;
    categories.push({ ...pouch, id });
    pouchFor.set(pouch.id, id);
  }

  const accountEntryIds = new Set(account.transactions.map((t) => t.id));
  const transactions = [
    ...account.transactions,
    ...old.transactions
      .filter((t) => !accountEntryIds.has(t.id)) // already in the account
      .map((t) => ({ ...t, categoryId: pouchFor.get(t.categoryId) ?? t.categoryId })),
  ];

  return {
    version: 1,
    categories,
    transactions,
    logbookDays: [...new Set([...account.logbookDays, ...old.logbookDays])],
    settings: account.settings,
  };
}
