// Saving and loading the ledger in the browser's localStorage.
// To move to a real database later, this is the file to replace.

import { ICON_NAMES } from "./types";
import type { Category, EntryType, SaveFile, Transaction } from "./types";

export const STORAGE_KEY = "guild-ledger:save";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Checking that saved data has the right shape ----------
// Saved data can be damaged or edited by hand, so we never just trust it.

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntryType(value: unknown): value is EntryType {
  return value === "income" || value === "expense";
}

function isPositiveWholeNumber(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function isCategory(value: unknown): value is Category {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isEntryType(value.type) &&
    (ICON_NAMES as readonly unknown[]).includes(value.icon) &&
    (value.monthlyLimitCents === undefined || isPositiveWholeNumber(value.monthlyLimitCents))
  );
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    isEntryType(value.type) &&
    isPositiveWholeNumber(value.amountCents) &&
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

  // Every entry must point at a pouch that exists and has the same type.
  const pouchTypes = new Map(categories.map((c) => [c.id, c.type]));
  if (!transactions.every((t) => pouchTypes.get(t.categoryId) === t.type)) return null;

  return {
    version: 1,
    categories,
    transactions,
    logbookDays,
    settings: { showRewards: settings.showRewards },
  };
}

// ---------- Reading and writing localStorage ----------

export type LoadResult =
  | { kind: "empty" } // nothing saved yet: a first visit
  | { kind: "ok"; data: SaveFile }
  | { kind: "corrupt"; raw: string }; // something's saved, but it's unreadable

export function loadSave(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Some browsers block storage entirely. Start empty; saving will
    // fail too, and the app shows a warning about that.
    return { kind: "empty" };
  }
  if (raw === null) return { kind: "empty" };

  try {
    const data = validateSaveFile(JSON.parse(raw));
    if (data) return { kind: "ok", data };
  } catch {
    // JSON.parse throws on text that isn't JSON at all.
  }
  return { kind: "corrupt", raw };
}

// Returns false if the browser refused to save (full or blocked storage).
export function writeSave(data: SaveFile): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
