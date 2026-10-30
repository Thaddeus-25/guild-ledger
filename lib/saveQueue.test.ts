import { describe, expect, it } from "vitest";
import { appReducer, createInitialAppState, type AppAction, type AppState } from "./appState";
import { nextSave } from "./saveQueue";
import { createStarterData } from "./starterData";

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state);
}

// Ready at version 3, with one unsaved change.
function changed(): AppState {
  return run(
    createInitialAppState(true),
    { type: "loadStarted" },
    { type: "loaded", result: { kind: "ok", data: createStarterData(), version: 3 } },
    { type: "setShowRewards", value: false },
  );
}

describe("nextSave", () => {
  it("sends the current data and version when there's an unsaved change", () => {
    const state = changed();
    expect(nextSave(state)).toEqual({ data: state.data, version: 3 });
  });

  it("waits when nothing is unsaved", () => {
    expect(nextSave({ ...changed(), dirty: false })).toBeNull();
  });

  it("waits while another save is travelling", () => {
    expect(nextSave({ ...changed(), saving: true })).toBeNull();
  });

  it("waits after an offline or failed save until a retry", () => {
    expect(nextSave({ ...changed(), saveProblem: "offline" })).toBeNull();
    expect(nextSave({ ...changed(), saveProblem: "failed" })).toBeNull();
  });

  it("waits while a reload is due", () => {
    expect(nextSave({ ...changed(), needsReload: true })).toBeNull();
  });

  it("waits unless the ledger is ready", () => {
    expect(nextSave({ ...changed(), status: "corrupt" })).toBeNull();
  });

  it("never saves with an old version after a clash whose reload went offline", () => {
    const state = changed();
    const afterClash = run(
      state,
      { type: "saveStarted" },
      { type: "saveFinished", data: state.data, result: { kind: "clash" } },
      { type: "loaded", result: { kind: "offline" } },
      { type: "setShowRewards", value: true },
    );
    expect(nextSave(afterClash)).toBeNull();
    expect(afterClash.needsReload).toBe(true);
  });
});
