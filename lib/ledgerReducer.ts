// Every change to the ledger goes through this one function.
// It takes the current data and an "action" describing the change,
// and returns NEW data. It never edits the old data in place.

import type { Category, SaveFile, Transaction } from "./types";

export type LedgerAction =
  | { type: "addTransaction"; transaction: Transaction; today: string }
  | { type: "updateTransaction"; transaction: Transaction }
  | { type: "deleteTransaction"; id: string }
  | { type: "addCategory"; category: Category }
  | { type: "updateCategory"; category: Category }
  | { type: "deleteCategory"; id: string }
  | { type: "setShowRewards"; value: boolean }
  | { type: "replaceAll"; data: SaveFile };

// How many entries belong to a pouch.
export function entriesInPouch(transactions: Transaction[], categoryId: string): number {
  return transactions.filter((t) => t.categoryId === categoryId).length;
}

export function ledgerReducer(state: SaveFile, action: LedgerAction): SaveFile {
  switch (action.type) {
    case "addTransaction": {
      // One logbook stamp per day you record something.
      const logbookDays = state.logbookDays.includes(action.today)
        ? state.logbookDays
        : [...state.logbookDays, action.today];
      return {
        ...state,
        transactions: [...state.transactions, action.transaction],
        logbookDays,
      };
    }

    case "updateTransaction":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.transaction.id ? action.transaction : t,
        ),
      };

    case "deleteTransaction":
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.id),
      };

    case "addCategory":
      return { ...state, categories: [...state.categories, action.category] };

    case "updateCategory":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.category.id ? action.category : c,
        ),
      };

    case "deleteCategory":
      // Safety net: a pouch with entries is never deleted, so no entry
      // is ever left pointing at a pouch that's gone.
      if (entriesInPouch(state.transactions, action.id) > 0) return state;
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
      };

    case "setShowRewards":
      return { ...state, settings: { ...state.settings, showRewards: action.value } };

    case "replaceAll":
      return action.data;
  }
}
