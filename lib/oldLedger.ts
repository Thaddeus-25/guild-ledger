// The ledger some browsers still have from before accounts existed.

import { createStarterData } from "./starterData";
import { STORAGE_KEY, type LoadResult } from "./storage";

// Sent on window when the old ledger is removed, so the screen updates.
// (The browser's own "storage" event only reaches OTHER tabs.)
export const OLD_LEDGER_EVENT = "guild-ledger:old-ledger-changed";

// Is the old ledger worth offering to bring in? Not if it's just the
// untouched starter pouches that every new ledger begins with.
export function oldLedgerCounts(result: LoadResult): boolean {
  if (result.kind === "empty") return false;
  if (result.kind === "corrupt") return true;
  const { data } = result;
  if (data.transactions.length > 0) return true;
  return JSON.stringify(data.categories) !== JSON.stringify(createStarterData().categories);
}

// Removes the old ledger from this browser.
export function forgetOldLedger(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is blocked, so there's nothing we can remove anyway.
  }
  window.dispatchEvent(new Event(OLD_LEDGER_EVENT));
}
