import type { Transaction } from "./types";

// Newest date first. Entries on the same day show the most recently
// added first (new entries are added to the end of the list).
export function newestFirst(transactions: Transaction[]): Transaction[] {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => {
      if (a.transaction.date !== b.transaction.date) {
        // "YYYY-MM-DD" text sorts in date order, so we can compare it directly.
        return a.transaction.date < b.transaction.date ? 1 : -1;
      }
      return b.index - a.index;
    })
    .map(({ transaction }) => transaction);
}
