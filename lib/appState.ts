// The app's overall state: the ledger data, plus where loading and
// saving to the guild archives (Supabase) have got to.
//
// This is a pure reducer: it never talks to Supabase itself. LedgerContext
// does the talking and reports back here with actions like "loaded" and
// "saveFinished". That keeps every rule below easy to test.
//
// The most important rule: an unsaved change is never thrown away
// silently. If something newer has to replace it, the change is "set
// aside" so it can be downloaded, and a notice says what happened.

import { combineLedgers } from "./combineLedgers";
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

// Bringing in the old browser ledger: it only counts as done once a save
// that includes it has worked. Until then the old copy stays in the browser.
export type ImportState = "none" | "waiting" | "sending" | "saved";

// Unsaved changes that had to make way for something newer.
export interface SetAside {
  userId: string | null; // whose changes these are
  data: SaveFile;
  version: number | null; // the version they were based on
}

export interface AppState {
  status: LedgerStatus;
  userId: string | null; // who the ledger belongs to
  data: SaveFile;
  corruptRaw: string | null; // unreadable saved text, kept so it can be downloaded
  version: number | null; // the saved row's version; null = no row yet
  dirty: boolean; // there's a change not saved yet
  saving: boolean; // a save is on its way to the archives
  saveProblem: null | "offline" | "failed"; // why the last save (or reload) didn't work
  saveFailures: number; // how many have failed, so each new one can warn again
  clashNotice: boolean; // show "your ledger changed on another device"
  needsReload: boolean; // fetch the newest ledger from the archives
  setAside: SetAside | null;
  importState: ImportState;
}

export type AppAction =
  | LedgerAction
  | { type: "signedOut" }
  | { type: "loadStarted"; userId: string }
  | { type: "loaded"; result: RemoteLoadResult }
  | { type: "saveStarted" }
  | { type: "saveFinished"; data: SaveFile; result: SaveResult }
  | { type: "retry" }
  | { type: "refreshRequested" }
  | { type: "dismissClash" }
  | { type: "startFresh" }
  | { type: "importOldLedger"; old: SaveFile }
  | { type: "importAcknowledged" };

export function createInitialAppState(configured: boolean): AppState {
  return {
    status: configured ? "loading" : "no-config",
    userId: null,
    data: createStarterData(),
    corruptRaw: null,
    version: null,
    dirty: false,
    saving: false,
    saveProblem: null,
    saveFailures: 0,
    clashNotice: false,
    needsReload: false,
    setAside: null,
    importState: "none",
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "signedOut":
      // Forget the ledger, so the next person on this device can't see it.
      // An unsaved change is kept to one side, for when this person logs
      // back in (Supabase can log you out by itself, e.g. after a long time
      // in the background).
      return {
        ...createInitialAppState(true),
        status: "signed-out",
        setAside: state.dirty
          ? { userId: state.userId, data: state.data, version: state.version }
          : state.setAside,
      };

    case "loadStarted":
      return { ...state, status: "loading", userId: action.userId, needsReload: true };

    case "loaded":
      return applyLoad(state, action.result);

    case "saveStarted":
      return {
        ...state,
        saving: true,
        importState: state.importState === "waiting" ? "sending" : state.importState,
      };

    case "saveFinished": {
      // A late answer for a save from before logging out: ignore it.
      if (!state.saving) return state;
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
          importState: state.importState === "sending" ? "saved" : state.importState,
        };
      }
      const importState = state.importState === "sending" ? "waiting" : state.importState;
      if (result.kind === "clash") {
        // Another device saved first. Keep the change for now and fetch
        // the newest ledger; when it arrives, the change is set aside.
        return { ...done, needsReload: true, importState };
      }
      return { ...done, saveProblem: result.kind, saveFailures: state.saveFailures + 1, importState };
    }

    case "retry":
      if (state.status === "unreachable") {
        return { ...state, status: "loading", needsReload: true };
      }
      return state.saveProblem ? { ...state, saveProblem: null } : state;

    case "refreshRequested":
      // Never fetch over a change that isn't saved yet.
      if (state.status !== "ready" || state.dirty || state.saving) return state;
      return { ...state, needsReload: true };

    case "dismissClash":
      return { ...state, clashNotice: false, setAside: null };

    case "startFresh":
      // Keep the version, so the next save replaces the damaged row.
      return { ...state, status: "ready", data: createStarterData(), corruptRaw: null, dirty: true };

    case "importOldLedger":
      if (state.status !== "ready") return state;
      return { ...state, data: combineLedgers(state.data, action.old), dirty: true, importState: "waiting" };

    case "importAcknowledged":
      return { ...state, importState: "none" };

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
  if (result.kind === "offline" || result.kind === "failed") {
    // The first load failed: there's nothing to show yet.
    if (state.status === "loading") return { ...state, status: "unreachable" };
    // A later reload failed. If a change is waiting, say so (the banner);
    // otherwise keep quiet. Either way it's tried again later.
    if (state.dirty) {
      return { ...state, saveProblem: result.kind, saveFailures: state.saveFailures + 1 };
    }
    return state;
  }

  const remoteVersion = result.kind === "empty" ? null : result.version;
  let { setAside, clashNotice } = state;

  if (state.status === "ready" && state.dirty) {
    // Nothing new in the archives: keep the change on screen and save it.
    if (result.kind !== "corrupt" && remoteVersion === state.version) {
      return { ...state, needsReload: false };
    }
    // Something newer arrived. Set the change aside rather than lose it.
    setAside = { userId: state.userId, data: state.data, version: state.version };
    clashNotice = true;
  } else if (setAside) {
    if (setAside.userId !== state.userId) {
      setAside = null; // someone else's change: never show it to this person
    } else if (result.kind !== "corrupt" && remoteVersion === setAside.version) {
      // Logged back in and nothing changed meanwhile: put the change back.
      return {
        ...state,
        status: "ready",
        data: setAside.data,
        version: remoteVersion,
        dirty: true,
        needsReload: false,
        corruptRaw: null,
        setAside: null,
      };
    } else {
      clashNotice = true;
    }
  }

  // Loading never sets dirty: the archives already have this data.
  const fresh: AppState = {
    ...state,
    dirty: false,
    needsReload: false,
    corruptRaw: null,
    setAside,
    clashNotice,
    importState: "none", // an import not yet saved was replaced; it can be added again
  };
  switch (result.kind) {
    case "ok":
      return { ...fresh, status: "ready", data: result.data, version: result.version };
    case "empty":
      return { ...fresh, status: "ready", data: createStarterData(), version: null };
    case "corrupt":
      return { ...fresh, status: "corrupt", corruptRaw: result.raw, version: result.version };
  }
}
