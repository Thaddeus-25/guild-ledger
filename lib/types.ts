// The shapes of all the data the app saves.

export type EntryType = "income" | "expense";

// Every pixel icon the app can draw. "as const" keeps the exact names,
// so IconName below only accepts these 12 words.
export const ICON_NAMES = [
  "coin",
  "gem",
  "bread",
  "house",
  "boot",
  "mug",
  "potion",
  "scroll",
  "chest",
  "heart",
  "book",
  "sword",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

// A Coin Pouch (category).
export interface Category {
  id: string;
  name: string;
  type: EntryType; // can't change after the pouch is created
  icon: IconName;
  monthlyLimitCents?: number; // expense pouches only; missing = no limit
}

// One ledger entry (transaction).
export interface Transaction {
  id: string;
  type: EntryType;
  amountCents: number; // always a positive whole number: 1250 = $12.50
  date: string; // "YYYY-MM-DD" on the user's own calendar
  categoryId: string; // the id of the Category it belongs to
  note?: string;
}

// Everything the app stores, saved as one piece.
export interface SaveFile {
  version: 1;
  categories: Category[];
  transactions: Transaction[];
  logbookDays: string[]; // "YYYY-MM-DD" days when an entry was recorded
  settings: { showRewards: boolean };
}
