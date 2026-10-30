"use client";

// The app's shared memory. LedgerProvider wraps every page (see
// app/layout.tsx), and any component can read or change the ledger
// with useLedger().
//
// It loads your ledger from the guild archives (Supabase) after you log
// in, and saves it there after every change. The rules for WHEN to load
// and save live in appState.ts and saveQueue.ts; this file only carries
// them out.

import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { appReducer, createInitialAppState, type AppState, type LedgerStatus } from "./appState";
import { useAuth } from "./AuthContext";
import { monthOf, todayISO } from "./dates";
import type { LedgerAction } from "./ledgerReducer";
import { loadLedger, saveLedger, supabaseLedgerTable, type LedgerTable } from "./remoteStore";
import { nextSave } from "./saveQueue";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import type { SaveFile } from "./types";

interface LedgerContextValue {
  status: LedgerStatus;
  data: SaveFile;
  corruptRaw: string | null;
  dirty: boolean;
  saving: boolean;
  saveProblem: AppState["saveProblem"];
  saveFailures: number;
  clashNotice: boolean;
  selectedMonth: string; // "2026-10", shared by Guild Hall and Ledger
  setSelectedMonth: (month: string) => void;
  dispatch: (action: LedgerAction) => void;
  startFresh: () => void;
  retry: () => void;
  dismissClash: () => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

// The real database table. Only called inside effects, which run in the
// browser, so no connection is ever made while pages pre-render.
function getTable(): LedgerTable | null {
  const client = getSupabase();
  return client ? supabaseLedgerTable(client) : null;
}

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, dispatchApp] = useReducer(appReducer, undefined, () =>
    createInitialAppState(isSupabaseConfigured()),
  );
  const [selectedMonth, setSelectedMonth] = useState(() => monthOf(todayISO()));
  // Goes up each time the app comes back to the front or back online,
  // so a reload that failed earlier is tried again.
  const [wakeUps, setWakeUps] = useState(0);

  const userId = auth.user?.id ?? null;
  const { status, needsReload, saving, dirty } = state;

  // 1) FOLLOW THE LOGIN. Logging in loads that person's ledger; logging
  //    out forgets it.
  useEffect(() => {
    if (auth.status === "signed-in") dispatchApp({ type: "loadStarted" });
    if (auth.status === "signed-out") dispatchApp({ type: "signedOut" });
  }, [auth.status, userId]);

  // 2) LOAD the newest ledger whenever one is needed: after logging in,
  //    after a clash, and when the app comes back to the front.
  useEffect(() => {
    const table = getTable();
    if (!needsReload || saving || !userId || !table) return;

    // If the person changes before the answer arrives, ignore the answer:
    // it's someone else's ledger.
    let cancelled = false;
    loadLedger(table, userId).then((result) => {
      if (!cancelled) dispatchApp({ type: "loaded", result });
    });
    return () => {
      cancelled = true;
    };
  }, [needsReload, saving, userId, status, wakeUps]);

  // 3) SAVE after a change, one save at a time (see saveQueue.ts).
  useEffect(() => {
    const job = nextSave(state);
    const table = getTable();
    if (!job || !userId || !table) return;

    dispatchApp({ type: "saveStarted" });
    saveLedger(table, userId, job.data, job.version).then((result) => {
      // Report which data was saved, so the reducer can tell whether
      // more changes came in while this save was travelling.
      dispatchApp({ type: "saveFinished", data: job.data, result });
    });
  }, [state, userId]);

  // 4) TRY AGAIN when the signal comes back, and fetch the newest ledger
  //    when the app comes back to the front (it may have changed on
  //    another device meanwhile).
  useEffect(() => {
    function wakeUp() {
      dispatchApp({ type: "retry" });
      dispatchApp({ type: "refreshRequested" });
      setWakeUps((count) => count + 1);
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") wakeUp();
    }
    window.addEventListener("online", wakeUp);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", wakeUp);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // 5) WARN BEFORE CLOSING while a change isn't saved yet. The browser
  //    shows its own "Leave site?" question.
  const unsaved = dirty || saving;
  useEffect(() => {
    if (!unsaved) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsaved]);

  return (
    <LedgerContext.Provider
      value={{
        status,
        data: state.data,
        corruptRaw: state.corruptRaw,
        dirty,
        saving,
        saveProblem: state.saveProblem,
        saveFailures: state.saveFailures,
        clashNotice: state.clashNotice,
        selectedMonth,
        setSelectedMonth,
        dispatch: dispatchApp,
        startFresh: () => dispatchApp({ type: "startFresh" }),
        retry: () => dispatchApp({ type: "retry" }),
        dismissClash: () => dispatchApp({ type: "dismissClash" }),
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger(): LedgerContextValue {
  const value = useContext(LedgerContext);
  if (!value) {
    throw new Error("useLedger must be used inside LedgerProvider");
  }
  return value;
}
