import { describe, expect, it } from "vitest";
import { createStarterData } from "./starterData";
import { parseBackup, validateSaveFile } from "./storage";
import type { Transaction } from "./types";

// Starter data plus one entry, with any fields we want to break.
function saveWithEntry(overrides: Record<string, unknown>): unknown {
  const entry: Transaction = {
    id: "t1",
    type: "expense",
    amountCents: 1250,
    date: "2026-10-29",
    categoryId: "provisions",
  };
  return { ...createStarterData(), transactions: [{ ...entry, ...overrides }] };
}

describe("validateSaveFile", () => {
  it("accepts the starter data and a normal entry", () => {
    expect(validateSaveFile(createStarterData())).not.toBeNull();
    expect(validateSaveFile(saveWithEntry({}))).not.toBeNull();
  });

  it("rejects things that aren't a Guild Ledger save", () => {
    expect(validateSaveFile(null)).toBeNull();
    expect(validateSaveFile("x")).toBeNull();
    expect(validateSaveFile({})).toBeNull();
    expect(validateSaveFile({ ...createStarterData(), version: 2 })).toBeNull();
  });

  it("rejects an entry whose pouch doesn't exist", () => {
    expect(validateSaveFile(saveWithEntry({ categoryId: "dragon-hoard" }))).toBeNull();
  });

  it("rejects amounts that aren't whole cents", () => {
    expect(validateSaveFile(saveWithEntry({ amountCents: 12.5 }))).toBeNull();
  });

  it("rejects dates that aren't YYYY-MM-DD", () => {
    expect(validateSaveFile(saveWithEntry({ date: "10/29/2026" }))).toBeNull();
  });

  it("rejects an income entry in an expense pouch", () => {
    expect(validateSaveFile(saveWithEntry({ type: "income" }))).toBeNull();
  });

  it("rejects a note that isn't text", () => {
    expect(validateSaveFile(saveWithEntry({ note: 5 }))).toBeNull();
  });
});

describe("parseBackup", () => {
  it("reads a backup file's text, pretty-printed or not", () => {
    const data = createStarterData();
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
    expect(parseBackup(JSON.stringify(data, null, 2))).toEqual(data);
  });

  it("returns null for text that isn't JSON at all", () => {
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup("")).toBeNull();
  });

  it("returns null for JSON that isn't a Guild Ledger save", () => {
    expect(parseBackup('{"hello": 1}')).toBeNull();
    expect(parseBackup("[]")).toBeNull();
  });
});
