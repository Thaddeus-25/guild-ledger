// Decides whether to send a save to the archives right now, and what.
//
// Only one save travels at a time. If two were sent close together they
// could arrive in the wrong order, and the older ledger would win.

import type { AppState } from "./appState";
import type { SaveFile } from "./types";

export function nextSave(state: AppState): { data: SaveFile; version: number | null } | null {
  if (state.status !== "ready") return null;
  if (!state.dirty) return null; // nothing to save
  if (state.saving) return null; // wait for the save already travelling
  if (state.saveProblem) return null; // wait for the signal to come back (a retry)
  if (state.needsReload) return null; // our version is out of date; fetch first
  return { data: state.data, version: state.version };
}
