import { describe, expect, it } from "vitest";
import { appReducer, createInitialAppState, type AppAction, type AppState } from "./appState";
import { createStarterData } from "./starterData";

const saved = { ...createStarterData(), logbookDays: ["2026-10-01"] };

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state);
}

// Logged in, with the account's ledger (version 3) loaded.
function ready(): AppState {
  return run(createInitialAppState(true), { type: "loadStarted" }, {
    type: "loaded",
    result: { kind: "ok", data: saved, version: 3 },
  });
}

// A change to the ledger that really changes the data.
const change: AppAction = { type: "setShowRewards", value: false };

describe("starting up", () => {
  it("says not set up when Supabase isn't configured", () => {
    expect(createInitialAppState(false).status).toBe("no-config");
  });

  it("starts out loading when Supabase is configured", () => {
    const state = createInitialAppState(true);
    expect(state.status).toBe("loading");
    expect(state.dirty).toBe(false);
  });

  it("forgets everything when signed out", () => {
    const state = run(ready(), change, { type: "signedOut" });
    expect(state.status).toBe("signed-out");
    expect(state.data).toEqual(createStarterData());
    expect(state.version).toBeNull();
    expect(state.dirty).toBe(false);
  });

  it("asks for a load when loading starts", () => {
    const state = run(createInitialAppState(true), { type: "signedOut" }, { type: "loadStarted" });
    expect(state.status).toBe("loading");
    expect(state.needsReload).toBe(true);
  });
});

describe("loaded", () => {
  it("becomes ready with the saved data and version", () => {
    const state = ready();
    expect(state.status).toBe("ready");
    expect(state.data).toBe(saved);
    expect(state.version).toBe(3);
    expect(state.dirty).toBe(false);
    expect(state.needsReload).toBe(false);
  });

  it("starts a brand-new account with the starter pouches and no version", () => {
    const state = run(createInitialAppState(true), { type: "loadStarted" }, { type: "loaded", result: { kind: "empty" } });
    expect(state.status).toBe("ready");
    expect(state.data).toEqual(createStarterData());
    expect(state.version).toBeNull();
  });

  it("keeps damaged data and its version", () => {
    const state = run(createInitialAppState(true), { type: "loadStarted" }, {
      type: "loaded",
      result: { kind: "corrupt", raw: "garbage", version: 7 },
    });
    expect(state.status).toBe("corrupt");
    expect(state.corruptRaw).toBe("garbage");
    expect(state.version).toBe(7);
  });

  it("can't reach the archives when the first load fails", () => {
    for (const result of [{ kind: "offline" as const }, { kind: "failed" as const, message: "boom" }]) {
      const state = run(createInitialAppState(true), { type: "loadStarted" }, { type: "loaded", result });
      expect(state.status).toBe("unreachable");
    }
  });

  it("keeps the ledger on screen when a later reload fails, and tries again later", () => {
    const before = run(ready(), { type: "refreshRequested" });
    const state = appReducer(before, { type: "loaded", result: { kind: "offline" } });
    expect(state.status).toBe("ready");
    expect(state.data).toBe(saved);
    expect(state.needsReload).toBe(true);
  });

  it("never counts loading as an unsaved change", () => {
    expect(ready().dirty).toBe(false);
  });
});

describe("changing the ledger", () => {
  it("marks a real change as unsaved", () => {
    const state = run(ready(), change);
    expect(state.data.settings.showRewards).toBe(false);
    expect(state.dirty).toBe(true);
  });

  it("ignores a refused change", () => {
    const withEntry = run(ready(), {
      type: "addTransaction",
      transaction: { id: "t1", type: "expense", amountCents: 500, date: "2026-10-01", categoryId: "tavern" },
      today: "2026-10-01",
    });
    const clean = { ...withEntry, dirty: false };
    expect(appReducer(clean, { type: "deleteCategory", id: "tavern" })).toBe(clean);
  });

  it("ignores changes until the ledger is ready", () => {
    const loading = createInitialAppState(true);
    expect(appReducer(loading, change)).toBe(loading);
  });
});

describe("saving", () => {
  it("marks a save as travelling", () => {
    expect(run(ready(), change, { type: "saveStarted" }).saving).toBe(true);
  });

  it("clears the unsaved mark when the newest data was saved", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const state = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "saved", version: 4 } });
    expect(state.version).toBe(4);
    expect(state.dirty).toBe(false);
    expect(state.saving).toBe(false);
    expect(state.saveProblem).toBeNull();
  });

  it("keeps the unsaved mark when more changes came in during the save", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const sentData = changed.data;
    const more = appReducer(changed, { type: "setShowRewards", value: true });
    const state = appReducer(more, { type: "saveFinished", data: sentData, result: { kind: "saved", version: 4 } });
    expect(state.version).toBe(4);
    expect(state.dirty).toBe(true);
  });

  it("remembers an offline or failed save and counts it", () => {
    for (const result of [{ kind: "offline" as const }, { kind: "failed" as const, message: "boom" }]) {
      const changed = run(ready(), change, { type: "saveStarted" });
      const state = appReducer(changed, { type: "saveFinished", data: changed.data, result });
      expect(state.saveProblem).toBe(result.kind);
      expect(state.saveFailures).toBe(1);
      expect(state.dirty).toBe(true);
      expect(state.saving).toBe(false);
    }
  });

  it("on a clash, shows the notice and asks for the newest ledger", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const state = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "clash" } });
    expect(state.clashNotice).toBe(true);
    expect(state.needsReload).toBe(true);
    expect(state.dirty).toBe(false);
  });
});

describe("retrying, refreshing and dismissing", () => {
  it("clears a save problem on retry", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const failed = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "offline" } });
    expect(appReducer(failed, { type: "retry" }).saveProblem).toBeNull();
  });

  it("loads again on retry after the first load failed", () => {
    const unreachable = run(createInitialAppState(true), { type: "loadStarted" }, {
      type: "loaded",
      result: { kind: "offline" },
    });
    const state = appReducer(unreachable, { type: "retry" });
    expect(state.status).toBe("loading");
    expect(state.needsReload).toBe(true);
  });

  it("refreshes when nothing is unsaved", () => {
    expect(run(ready(), { type: "refreshRequested" }).needsReload).toBe(true);
  });

  it("doesn't refresh over an unsaved change", () => {
    const changed = run(ready(), change);
    expect(appReducer(changed, { type: "refreshRequested" })).toBe(changed);
  });

  it("doesn't refresh while a save is travelling", () => {
    const saving = run(ready(), change, { type: "saveStarted" });
    expect(appReducer(saving, { type: "refreshRequested" })).toBe(saving);
  });

  it("hides the clash notice when dismissed", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const clashed = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "clash" } });
    expect(appReducer(clashed, { type: "dismissClash" }).clashNotice).toBe(false);
  });

  it("starts fresh over damaged data, keeping its version so the next save replaces it", () => {
    const corrupt = run(createInitialAppState(true), { type: "loadStarted" }, {
      type: "loaded",
      result: { kind: "corrupt", raw: "garbage", version: 7 },
    });
    const state = appReducer(corrupt, { type: "startFresh" });
    expect(state.status).toBe("ready");
    expect(state.data).toEqual(createStarterData());
    expect(state.dirty).toBe(true);
    expect(state.version).toBe(7);
  });
});
