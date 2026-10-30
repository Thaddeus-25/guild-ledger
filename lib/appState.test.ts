import { describe, expect, it } from "vitest";
import { appReducer, createInitialAppState, type AppAction, type AppState } from "./appState";
import { createStarterData } from "./starterData";

const saved = { ...createStarterData(), logbookDays: ["2026-10-01"] };

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state);
}

// Logged in, with the account's ledger (version 3) loaded.
function ready(): AppState {
  return run(createInitialAppState(true), { type: "loadStarted", userId: "u1" }, {
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
    const state = run(createInitialAppState(true), { type: "signedOut" }, { type: "loadStarted", userId: "u1" });
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
    const state = run(createInitialAppState(true), { type: "loadStarted", userId: "u1" }, { type: "loaded", result: { kind: "empty" } });
    expect(state.status).toBe("ready");
    expect(state.data).toEqual(createStarterData());
    expect(state.version).toBeNull();
  });

  it("keeps damaged data and its version", () => {
    const state = run(createInitialAppState(true), { type: "loadStarted", userId: "u1" }, {
      type: "loaded",
      result: { kind: "corrupt", raw: "garbage", version: 7 },
    });
    expect(state.status).toBe("corrupt");
    expect(state.corruptRaw).toBe("garbage");
    expect(state.version).toBe(7);
  });

  it("can't reach the archives when the first load fails", () => {
    for (const result of [{ kind: "offline" as const }, { kind: "failed" as const, message: "boom" }]) {
      const state = run(createInitialAppState(true), { type: "loadStarted", userId: "u1" }, { type: "loaded", result });
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

  it("on a clash, keeps the change and asks for the newest ledger", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const state = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "clash" } });
    expect(state.needsReload).toBe(true);
    expect(state.dirty).toBe(true);
    expect(state.data).toBe(changed.data);
  });
});

describe("retrying, refreshing and dismissing", () => {
  it("clears a save problem on retry", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const failed = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "offline" } });
    expect(appReducer(failed, { type: "retry" }).saveProblem).toBeNull();
  });

  it("loads again on retry after the first load failed", () => {
    const unreachable = run(createInitialAppState(true), { type: "loadStarted", userId: "u1" }, {
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

  it("hides the clash notice and forgets the set-aside copy when dismissed", () => {
    const changed = run(ready(), change);
    const clashed = appReducer({ ...changed, needsReload: true }, {
      type: "loaded",
      result: { kind: "ok", data: saved, version: 9 },
    });
    const state = appReducer(clashed, { type: "dismissClash" });
    expect(state.clashNotice).toBe(false);
    expect(state.setAside).toBeNull();
  });

  it("starts fresh over damaged data, keeping its version so the next save replaces it", () => {
    const corrupt = run(createInitialAppState(true), { type: "loadStarted", userId: "u1" }, {
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

// ---------- Fixes from the final review ----------

const newer = { ...createStarterData(), logbookDays: ["2026-10-05"] };

describe("a reload never silently replaces unsaved changes", () => {
  it("keeps the unsaved change when the archives haven't changed meanwhile", () => {
    const changed = { ...run(ready(), change), needsReload: true };
    const state = appReducer(changed, { type: "loaded", result: { kind: "ok", data: saved, version: 3 } });
    expect(state.data).toBe(changed.data);
    expect(state.dirty).toBe(true);
    expect(state.needsReload).toBe(false);
  });

  it("sets the unsaved change aside and says so when the archives have something newer", () => {
    const changed = { ...run(ready(), change), needsReload: true };
    const state = appReducer(changed, { type: "loaded", result: { kind: "ok", data: newer, version: 5 } });
    expect(state.data).toBe(newer);
    expect(state.version).toBe(5);
    expect(state.dirty).toBe(false);
    expect(state.clashNotice).toBe(true);
    expect(state.setAside?.data).toBe(changed.data);
  });

  it("after a clash, sets aside every unsaved change once the newest ledger arrives", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const clashed = appReducer(changed, { type: "saveFinished", data: changed.data, result: { kind: "clash" } });
    const more = appReducer(clashed, { type: "setShowRewards", value: true });
    const state = appReducer(more, { type: "loaded", result: { kind: "ok", data: newer, version: 5 } });
    expect(state.data).toBe(newer);
    expect(state.clashNotice).toBe(true);
    expect(state.setAside?.data).toBe(more.data);
  });

  it("shows the can't-reach banner when a reload fails while a change is waiting", () => {
    const changed = { ...run(ready(), change), needsReload: true };
    const state = appReducer(changed, { type: "loaded", result: { kind: "offline" } });
    expect(state.saveProblem).toBe("offline");
    expect(state.saveFailures).toBe(1);
    expect(state.data).toBe(changed.data);
    expect(state.needsReload).toBe(true);
  });

  it("stays quiet when a reload fails with nothing unsaved", () => {
    const refreshing = run(ready(), { type: "refreshRequested" });
    const state = appReducer(refreshing, { type: "loaded", result: { kind: "offline" } });
    expect(state.saveProblem).toBeNull();
  });
});

describe("being logged out with an unsaved change", () => {
  it("keeps a copy of the change", () => {
    const changed = run(ready(), change);
    const state = appReducer(changed, { type: "signedOut" });
    expect(state.status).toBe("signed-out");
    expect(state.setAside).toEqual({ userId: "u1", data: changed.data, version: 3 });
  });

  it("puts the change back after logging in again, if nothing changed meanwhile", () => {
    const changed = run(ready(), change);
    const state = run(changed, { type: "signedOut" }, { type: "loadStarted", userId: "u1" }, {
      type: "loaded",
      result: { kind: "ok", data: saved, version: 3 },
    });
    expect(state.data).toEqual(changed.data);
    expect(state.dirty).toBe(true);
    expect(state.setAside).toBeNull();
  });

  it("offers the copy as a download if the ledger changed meanwhile", () => {
    const changed = run(ready(), change);
    const state = run(changed, { type: "signedOut" }, { type: "loadStarted", userId: "u1" }, {
      type: "loaded",
      result: { kind: "ok", data: newer, version: 4 },
    });
    expect(state.data).toBe(newer);
    expect(state.dirty).toBe(false);
    expect(state.clashNotice).toBe(true);
    expect(state.setAside?.data).toEqual(changed.data);
  });

  it("never shows one person's change to someone else", () => {
    const changed = run(ready(), change);
    const state = run(changed, { type: "signedOut" }, { type: "loadStarted", userId: "someone-else" }, {
      type: "loaded",
      result: { kind: "ok", data: saved, version: 3 },
    });
    expect(state.setAside).toBeNull();
    expect(state.clashNotice).toBe(false);
  });

  it("ignores a save result that arrives after logging out", () => {
    const changed = run(ready(), change, { type: "saveStarted" });
    const out = appReducer(changed, { type: "signedOut" });
    expect(appReducer(out, { type: "saveFinished", data: changed.data, result: { kind: "offline" } })).toBe(out);
  });
});

describe("bringing in the old browser ledger", () => {
  const old = {
    ...createStarterData(),
    transactions: [
      { id: "t-old", type: "expense" as const, amountCents: 700, date: "2026-09-01", categoryId: "tavern" },
    ],
  };

  it("adds it to the ledger and waits for a save", () => {
    const state = appReducer(ready(), { type: "importOldLedger", old });
    expect(state.data.transactions.map((t) => t.id)).toEqual(["t-old"]);
    expect(state.dirty).toBe(true);
    expect(state.importState).toBe("waiting");
  });

  it("only counts as done once a save that includes it has worked", () => {
    const imported = appReducer(ready(), { type: "importOldLedger", old });
    const sending = appReducer(imported, { type: "saveStarted" });
    expect(sending.importState).toBe("sending");
    const done = appReducer(sending, {
      type: "saveFinished",
      data: sending.data,
      result: { kind: "saved", version: 4 },
    });
    expect(done.importState).toBe("saved");
    expect(appReducer(done, { type: "importAcknowledged" }).importState).toBe("none");
  });

  it("isn't done when a save that started before it finishes", () => {
    const earlier = run(ready(), change, { type: "saveStarted" });
    const imported = appReducer(earlier, { type: "importOldLedger", old });
    const state = appReducer(imported, {
      type: "saveFinished",
      data: earlier.data,
      result: { kind: "saved", version: 4 },
    });
    expect(state.importState).toBe("waiting");
  });

  it("waits again if its save went offline", () => {
    const sending = run(ready(), { type: "importOldLedger", old }, { type: "saveStarted" });
    const state = appReducer(sending, { type: "saveFinished", data: sending.data, result: { kind: "offline" } });
    expect(state.importState).toBe("waiting");
  });

  it("is cancelled when a newer ledger replaces it, so it can be added again", () => {
    const imported = { ...appReducer(ready(), { type: "importOldLedger", old }), needsReload: true };
    const state = appReducer(imported, { type: "loaded", result: { kind: "ok", data: newer, version: 5 } });
    expect(state.importState).toBe("none");
  });
});
