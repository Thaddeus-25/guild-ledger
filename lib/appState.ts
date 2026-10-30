// The app's overall state: the ledger data, plus whether it has
// finished loading and whether the last save worked.

import { ledgerReducer, type LedgerAction } from "./ledgerReducer";
import { createStarterData } from "./starterData";
import type { LoadResult } from "./storage";
import type { SaveFile } from "./types";

export type LedgerStatus = "loading" | "ready" | "corrupt";

export interface AppState {
  status: LedgerStatus;
  data: SaveFile;
  corruptRaw: string | null; // unreadable saved text, kept so it can be downloaded
  saveFailed: boolean;
  saveFailures: number; // how many saves have failed, so each new one can warn again
}

export type AppAction =
  | LedgerAction
  | { type: "loaded"; result: LoadResult }
  | { type: "saveResult"; ok: boolean }
  | { type: "startFresh" };

export function createInitialAppState(): AppState {
  return {
    status: "loading",
    data: createStarterData(),
    corruptRaw: null,
    saveFailed: false,
    saveFailures: 0,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "loaded": {
      const { result } = action;
      if (result.kind === "corrupt") {
        return { ...state, status: "corrupt", corruptRaw: result.raw };
      }
      const data = result.kind === "ok" ? result.data : createStarterData();
      return { ...state, status: "ready", data };
    }

    case "saveResult":
      if (!action.ok) {
        return { ...state, saveFailed: true, saveFailures: state.saveFailures + 1 };
      }
      // Returning the same object tells React nothing changed.
      return state.saveFailed ? { ...state, saveFailed: false } : state;

    case "startFresh":
      return { ...state, status: "ready", data: createStarterData(), corruptRaw: null };

    default:
      // Any other action is a change to the ledger itself. Ignore it
      // until loading has finished, so nothing can edit placeholder data.
      if (state.status !== "ready") return state;
      return { ...state, data: ledgerReducer(state.data, action) };
  }
}
