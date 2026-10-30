import { describe, expect, it } from "vitest";
import { loadLedger, saveLedger, type DbResult, type LedgerRow, type LedgerTable } from "./remoteStore";
import { createStarterData } from "./starterData";
import type { SaveFile } from "./types";

const data = createStarterData();

// A pretend database table. Each method answers with what the test
// gives it, and every call is written down so the test can check it.
function fakeTable(answers: {
  select?: DbResult<LedgerRow>;
  insert?: DbResult<null>;
  update?: DbResult<{ version: number }[]>;
}) {
  const calls: unknown[][] = [];
  const table: LedgerTable = {
    select: async (userId) => {
      calls.push(["select", userId]);
      return answers.select!;
    },
    insert: async (userId, saved: SaveFile) => {
      calls.push(["insert", userId, saved]);
      return answers.insert!;
    },
    update: async (userId, expectedVersion, saved: SaveFile) => {
      calls.push(["update", userId, expectedVersion, saved]);
      return answers.update!;
    },
  };
  return { table, calls };
}

const offline = { data: null, error: { message: "TypeError: Failed to fetch" }, status: 0 };

describe("loadLedger", () => {
  it("reports an empty account when there's no row yet", async () => {
    const { table } = fakeTable({ select: { data: null, error: null, status: 200 } });
    expect(await loadLedger(table, "u1")).toEqual({ kind: "empty" });
  });

  it("returns the ledger and its version", async () => {
    const { table, calls } = fakeTable({ select: { data: { data, version: 4 }, error: null, status: 200 } });
    expect(await loadLedger(table, "u1")).toEqual({ kind: "ok", data, version: 4 });
    expect(calls).toEqual([["select", "u1"]]);
  });

  it("keeps damaged data as text so it can be downloaded", async () => {
    const { table } = fakeTable({ select: { data: { data: { nope: 1 }, version: 4 }, error: null, status: 200 } });
    expect(await loadLedger(table, "u1")).toEqual({ kind: "corrupt", raw: '{"nope":1}', version: 4 });
  });

  it("reports offline when no response came back", async () => {
    const { table } = fakeTable({ select: offline });
    expect(await loadLedger(table, "u1")).toEqual({ kind: "offline" });
  });

  it("reports a failure with the error message", async () => {
    const { table } = fakeTable({ select: { data: null, error: { message: "boom" }, status: 500 } });
    expect(await loadLedger(table, "u1")).toEqual({ kind: "failed", message: "boom" });
  });
});

describe("saveLedger", () => {
  it("creates the row at version 1 when there isn't one yet", async () => {
    const { table, calls } = fakeTable({ insert: { data: null, error: null, status: 201 } });
    expect(await saveLedger(table, "u1", data, null)).toEqual({ kind: "saved", version: 1 });
    expect(calls).toEqual([["insert", "u1", data]]);
  });

  it("reports a clash when another device created the row first", async () => {
    const { table } = fakeTable({
      insert: { data: null, error: { message: "duplicate key", code: "23505" }, status: 409 },
    });
    expect(await saveLedger(table, "u1", data, null)).toEqual({ kind: "clash" });
  });

  it("updates the row only if it's still at the expected version", async () => {
    const { table, calls } = fakeTable({ update: { data: [{ version: 4 }], error: null, status: 200 } });
    expect(await saveLedger(table, "u1", data, 3)).toEqual({ kind: "saved", version: 4 });
    expect(calls).toEqual([["update", "u1", 3, data]]);
  });

  it("reports a clash when someone else saved first", async () => {
    const { table } = fakeTable({ update: { data: [], error: null, status: 200 } });
    expect(await saveLedger(table, "u1", data, 3)).toEqual({ kind: "clash" });
  });

  it("reports offline when no response came back", async () => {
    expect(await saveLedger(fakeTable({ insert: offline }).table, "u1", data, null)).toEqual({ kind: "offline" });
    expect(await saveLedger(fakeTable({ update: offline }).table, "u1", data, 3)).toEqual({ kind: "offline" });
  });

  it("reports an expired login as a failure, not a crash", async () => {
    const expired = { data: null, error: { message: "JWT expired" }, status: 401 };
    expect(await saveLedger(fakeTable({ insert: expired }).table, "u1", data, null)).toEqual({
      kind: "failed",
      message: "JWT expired",
    });
    expect(await saveLedger(fakeTable({ update: expired }).table, "u1", data, 3)).toEqual({
      kind: "failed",
      message: "JWT expired",
    });
  });
});
