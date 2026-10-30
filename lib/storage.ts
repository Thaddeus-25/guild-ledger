// Checking saved ledger data, and reading the OLD browser-only ledger.
//
// Before accounts, the ledger was saved in this browser's localStorage.
// The app no longer writes there (it saves to Supabase, see remoteStore.ts),
// but still reads it once so you can bring that ledger into your account.

import { isValidDate } from "./dates";
import { MAX_AMOUNT_CENTS } from "./money";
import { ICON_NAMES } from "./types";
import type { Category, EntryType, SaveFile, Transaction } from "./types";

export const STORAGE_KEY = "guild-ledger:save";

// ---------- Checking that saved data has the right shape ----------
// Saved data can be damaged or edited by hand, so we never just trust it.

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntryType(value: unknown): value is EntryType {
  return value === "income" || value === "expense";
}

// A money amount the app itself could have saved: whole cents, $0.01 to $1,000,000.
function isAmount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= MAX_AMOUNT_CENTS;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && isValidDate(value);
}

function isCategory(value: unknown): value is Category {
  if (!isObject(value)) return false;
  // Only expense pouches may have a limit.
  const limitOk =
    value.monthlyLimitCents === undefined ||
    (value.type === "expense" && isAmount(value.monthlyLimitCents));
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isEntryType(value.type) &&
    (ICON_NAMES as readonly unknown[]).includes(value.icon) &&
    limitOk
  );
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    isEntryType(value.type) &&
    isAmount(value.amountCents) &&
    isDate(value.date) &&
    typeof value.categoryId === "string" &&
    (value.note === undefined || typeof value.note === "string")
  );
}

// Returns the data if it's a valid Guild Ledger save, or null if not.
export function validateSaveFile(value: unknown): SaveFile | null {
  if (!isObject(value) || value.version !== 1) return null;

  const { categories, transactions, logbookDays, settings } = value;
  if (!Array.isArray(categories) || !categories.every(isCategory)) return null;
  if (!Array.isArray(transactions) || !transactions.every(isTransaction)) return null;
  if (!Array.isArray(logbookDays) || !logbookDays.every(isDate)) return null;
  if (!isObject(settings) || typeof settings.showRewards !== "boolean") return null;

  // Ids must be unique, or editing one entry would change its twin too.
  if (hasDuplicates(categories.map((c) => c.id))) return null;
  if (hasDuplicates(transactions.map((t) => t.id))) return null;

  // Every entry must point at a pouch that exists and has the same type.
  const pouchTypes = new Map(categories.map((c) => [c.id, c.type]));
  if (!transactions.every((t) => pouchTypes.get(t.categoryId) === t.type)) return null;

  return {
    version: 1,
    categories,
    transactions,
    logbookDays: [...new Set(logbookDays)], // one stamp per day, even if repeated
    settings: { showRewards: settings.showRewards },
  };
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

// ---------- Reading the old ledger from localStorage ----------

export type LoadResult =
  | { kind: "empty" } // nothing saved yet: a first visit
  | { kind: "ok"; data: SaveFile }
  | { kind: "corrupt"; raw: string }; // something's saved, but it's unreadable

export function loadSave(): LoadResult {
  return resultFromRaw(readRaw());
}

// The saved text, or null if there's none (or the browser blocks storage).
export function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Sorts saved text into: nothing saved, a readable ledger, or damaged data.
export function resultFromRaw(raw: string | null): LoadResult {
  if (raw === null) return { kind: "empty" };
  const data = parseBackup(raw);
  return data ? { kind: "ok", data } : { kind: "corrupt", raw };
}

// Turns saved text (from localStorage or a backup file) into ledger data,
// or null if it isn't a valid Guild Ledger save.
export function parseBackup(text: string): SaveFile | null {
  try {
    return validateSaveFile(JSON.parse(text));
  } catch {
    // JSON.parse throws on text that isn't JSON at all.
    return null;
  }
}
