// Loading and saving the ledger in Supabase (the "guild archives").
//
// The functions here never talk to Supabase directly. They use a small
// LedgerTable with three methods, so tests can hand them a pretend table.
// supabaseLedgerTable() at the bottom builds the real one.

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSaveFile } from "./storage";
import type { SaveFile } from "./types";

export interface DbError {
  message: string;
  code?: string;
}

// What every database request answers with. status 0 means no answer
// came back at all: the device is offline or Supabase can't be reached.
export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  status: number;
}

export interface LedgerRow {
  data: unknown;
  version: number;
}

export interface LedgerTable {
  // Is there a usable login right now? (It can briefly be missing while
  // Supabase refreshes it on a weak signal.)
  hasSession(): Promise<boolean>;
  select(userId: string): Promise<DbResult<LedgerRow>>; // data is null when there's no row
  insert(userId: string, data: SaveFile): Promise<DbResult<null>>; // creates the row at version 1
  update(userId: string, expectedVersion: number, data: SaveFile): Promise<DbResult<{ version: number }[]>>;
}

export type RemoteLoadResult =
  | { kind: "empty" } // a brand-new account: no ledger saved yet
  | { kind: "ok"; data: SaveFile; version: number }
  | { kind: "corrupt"; raw: string; version: number } // saved, but unreadable
  | { kind: "offline" }
  | { kind: "failed"; message: string };

export type SaveResult =
  | { kind: "saved"; version: number }
  | { kind: "clash" } // another device saved first
  | { kind: "offline" }
  | { kind: "failed"; message: string };

// Postgres's error code for "a row with this key already exists".
const DUPLICATE_KEY = "23505";

// Turns a request's error into "offline" or "failed".
function problem(result: DbResult<unknown>): { kind: "offline" } | { kind: "failed"; message: string } {
  if (result.status === 0) return { kind: "offline" };
  return { kind: "failed", message: result.error?.message ?? "Unknown error" };
}

export async function loadLedger(table: LedgerTable, userId: string): Promise<RemoteLoadResult> {
  // Without a login the request would go out as a logged-out visitor, see
  // no ledger, and look like an empty account. Treat it as "try again later".
  if (!(await table.hasSession())) return { kind: "offline" };
  const result = await table.select(userId);
  if (result.error) return problem(result);
  if (!result.data) return { kind: "empty" };

  const { data, version } = result.data;
  // Saved data could be damaged or edited by hand, so check it like v1 did.
  const ledger = validateSaveFile(data);
  if (!ledger) return { kind: "corrupt", raw: JSON.stringify(data), version };
  return { kind: "ok", data: ledger, version };
}

// version is null when this account has no row yet.
export async function saveLedger(
  table: LedgerTable,
  userId: string,
  data: SaveFile,
  version: number | null,
): Promise<SaveResult> {
  // Same as loading: never save as a logged-out visitor.
  if (!(await table.hasSession())) return { kind: "offline" };

  if (version === null) {
    const result = await table.insert(userId, data);
    if (result.error?.code === DUPLICATE_KEY) return { kind: "clash" };
    if (result.error) return problem(result);
    return { kind: "saved", version: 1 };
  }

  // Only update the row if it's still at the version this device loaded.
  // If another device saved in between, no row matches and nothing changes.
  const result = await table.update(userId, version, data);
  if (result.error) return problem(result);
  const updated = result.data?.[0];
  if (!updated) return { kind: "clash" };
  return { kind: "saved", version: updated.version };
}

// ---------- The real table, using supabase-js ----------

// Runs one request, turning a thrown error (e.g. no internet) into status 0.
async function safely<T>(request: () => PromiseLike<DbResult<T>>): Promise<DbResult<T>> {
  try {
    const { data, error, status } = await request();
    return { data, error, status };
  } catch (thrown) {
    return { data: null, error: { message: String(thrown) }, status: 0 };
  }
}

export function supabaseLedgerTable(client: SupabaseClient): LedgerTable {
  return {
    hasSession: async () => {
      try {
        const { data } = await client.auth.getSession();
        return data.session !== null;
      } catch {
        return false;
      }
    },
    select: (userId) =>
      safely(() => client.from("ledgers").select("data, version").eq("user_id", userId).maybeSingle()),
    insert: (userId, data) =>
      safely(() => client.from("ledgers").insert({ user_id: userId, data, version: 1 })),
    update: (userId, expectedVersion, data) =>
      safely(() =>
        client
          .from("ledgers")
          .update({ data, version: expectedVersion + 1 })
          .eq("user_id", userId)
          .eq("version", expectedVersion)
          .select("version"),
      ),
  };
}
