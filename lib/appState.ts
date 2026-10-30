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
}

export type AppAction =
  | LedgerAction
  | { type: "loaded"; result: LoadResult }
  | { type: "saveResult"; ok: boolean }
  | { type: "startFresh" };

export function createInitialAppState(): AppState {
  return { status: "loading", data: createStarterData(), corruptRaw: null, saveFailed: false };
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
      // Returning the same object tells React nothing changed.
      if (state.saveFailed === !action.ok) return state;
      return { ...state, saveFailed: !action.ok };

    case "startFresh":
      return { ...state, status: "ready", data: createStarterData(), corruptRaw: null };

    default:
      // Any other action is a change to the ledger itself. Ignore it
      // until loading has finished, so nothing can edit placeholder data.
      if (state.status !== "ready") return state;
      return { ...state, data: ledgerReducer(state.data, action) };
  }
}
