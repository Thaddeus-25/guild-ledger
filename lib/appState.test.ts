import { describe, expect, it } from "vitest";
import { appReducer, createInitialAppState } from "./appState";
import { createStarterData } from "./starterData";

const saved = { ...createStarterData(), logbookDays: ["2026-10-01"] };

describe("appReducer", () => {
  it("starts out loading", () => {
    const state = createInitialAppState();
    expect(state.status).toBe("loading");
    expect(state.saveFailed).toBe(false);
  });

  it("becomes ready with the saved data once loaded", () => {
    const state = appReducer(createInitialAppState(), {
      type: "loaded",
      result: { kind: "ok", data: saved },
    });
    expect(state.status).toBe("ready");
    expect(state.data).toBe(saved);
  });

  it("starts a first-time visitor with the starter pouches", () => {
    const state = appReducer(createInitialAppState(), { type: "loaded", result: { kind: "empty" } });
    expect(state.status).toBe("ready");
    expect(state.data).toEqual(createStarterData());
  });

  it("keeps unreadable saved text so it can be downloaded", () => {
    const state = appReducer(createInitialAppState(), {
      type: "loaded",
      result: { kind: "corrupt", raw: "garbage" },
    });
    expect(state.status).toBe("corrupt");
    expect(state.corruptRaw).toBe("garbage");
  });

  it("ignores ledger changes until loading has finished", () => {
    const loading = createInitialAppState();
    const after = appReducer(loading, { type: "setShowRewards", value: false });
    expect(after).toBe(loading);
  });

  it("passes ledger changes to the ledger once ready", () => {
    const ready = appReducer(createInitialAppState(), { type: "loaded", result: { kind: "ok", data: saved } });
    const after = appReducer(ready, { type: "setShowRewards", value: false });
    expect(after.data.settings.showRewards).toBe(false);
  });

  it("remembers when saving failed, without re-rendering for no change", () => {
    const ready = appReducer(createInitialAppState(), { type: "loaded", result: { kind: "empty" } });
    expect(appReducer(ready, { type: "saveResult", ok: true })).toBe(ready);
    expect(appReducer(ready, { type: "saveResult", ok: false }).saveFailed).toBe(true);
  });

  it("starts fresh after a damaged save", () => {
    const corrupt = appReducer(createInitialAppState(), {
      type: "loaded",
      result: { kind: "corrupt", raw: "garbage" },
    });
    const state = appReducer(corrupt, { type: "startFresh" });
    expect(state.status).toBe("ready");
    expect(state.corruptRaw).toBeNull();
    expect(state.data).toEqual(createStarterData());
  });
});
