// The app's overall state: the ledger data, plus where loading and
// saving to the guild archives (Supabase) have got to.
//
// This is a pure reducer: it never talks to Supabase itself. LedgerContext
// does the talking and reports back here with actions like "loaded" and
// "saveFinished". That keeps every rule below easy to test.

import { ledgerReducer, type LedgerAction } from "./ledgerReducer";
import type { RemoteLoadResult, SaveResult } from "./remoteStore";
import { createStarterData } from "./starterData";
import type { SaveFile } from "./types";

export type LedgerStatus =
  | "no-config" // Supabase settings are missing
  | "signed-out"
  | "loading"
  | "unreachable" // the first load failed
  | "corrupt" // the saved ledger can't be read
  | "ready";

export interface AppState {
  status: LedgerStatus;
  data: SaveFile;
  corruptRaw: string | null; // unreadable saved text, kept so it can be downloaded
  version: number | null; // the saved row's version; null = no row yet
  dirty: boolean; // there's a change not saved yet
  saving: boolean; // a save is on its way to the archives
  saveProblem: null | "offline" | "failed"; // why the last save didn't work
  saveFailures: number; // how many saves have failed, so each new one can warn again
  clashNotice: boolean; // show "your ledger changed on another device"
  needsReload: boolean; // fetch the newest ledger from the archives
}

export type AppAction =
  | LedgerAction
  | { type: "signedOut" }
  | { type: "loadStarted" }
  | { type: "loaded"; result: RemoteLoadResult }
  | { type: "saveStarted" }
  | { type: "saveFinished"; data: SaveFile; result: SaveResult }
  | { type: "retry" }
  | { type: "refreshRequested" }
  | { type: "dismissClash" }
  | { type: "startFresh" };

export function createInitialAppState(configured: boolean): AppState {
  return {
    status: configured ? "loading" : "no-config",
    data: createStarterData(),
    corruptRaw: null,
    version: null,
    dirty: false,
    saving: false,
    saveProblem: null,
    saveFailures: 0,
    clashNotice: false,
    needsReload: false,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "signedOut":
      // Forget the ledger, so the next person on this device can't see it.
      return { ...createInitialAppState(true), status: "signed-out" };

    case "loadStarted":
      return { ...state, status: "loading", needsReload: true };

    case "loaded":
      return applyLoad(state, action.result);

    case "saveStarted":
      return { ...state, saving: true };

    case "saveFinished": {
      const { result } = action;
      const done = { ...state, saving: false };
      if (result.kind === "saved") {
        return {
          ...done,
          version: result.version,
          saveProblem: null,
          // Only "all saved" if nothing changed while the save was
          // travelling. If it did, data is newer, so another save follows.
          dirty: state.data !== action.data,
        };
      }
      if (result.kind === "clash") {
        // Another device saved first. Stop saving our out-of-date copy,
        // fetch the newest ledger, and tell the person.
        return { ...done, dirty: false, clashNotice: true, needsReload: true };
      }
      return { ...done, saveProblem: result.kind, saveFailures: state.saveFailures + 1 };
    }

    case "retry":
      if (state.status === "unreachable") {
        return { ...state, status: "loading", needsReload: true };
      }
      return state.saveProblem ? { ...state, saveProblem: null } : state;

    case "refreshRequested":
      // Never fetch over a change that isn't saved yet: it would vanish.
      if (state.status !== "ready" || state.dirty || state.saving) return state;
      return { ...state, needsReload: true };

    case "dismissClash":
      return { ...state, clashNotice: false };

    case "startFresh":
      // Keep the version, so the next save replaces the damaged row.
      return { ...state, status: "ready", data: createStarterData(), corruptRaw: null, dirty: true };

    default: {
      // Any other action is a change to the ledger itself. Ignore it
      // until loading has finished, so nothing can edit placeholder data.
      if (state.status !== "ready") return state;
      const data = ledgerReducer(state.data, action);
      if (data === state.data) return state; // refused, so nothing to save
      return { ...state, data, dirty: true };
    }
  }
}

function applyLoad(state: AppState, result: RemoteLoadResult): AppState {
  // Loading never sets dirty: the archives already have this data.
  const fresh = { ...state, dirty: false, needsReload: false, corruptRaw: null };
  switch (result.kind) {
    case "ok":
      return { ...fresh, status: "ready", data: result.data, version: result.version };
    case "empty":
      return { ...fresh, status: "ready", data: createStarterData(), version: null };
    case "corrupt":
      return { ...fresh, status: "corrupt", corruptRaw: result.raw, version: result.version };
    case "offline":
    case "failed":
      // The first load failed: there's nothing to show yet.
      if (state.status === "loading") return { ...state, status: "unreachable" };
      // A later reload failed: keep showing the ledger and try again later
      // (needsReload stays true).
      return state;
  }
}
