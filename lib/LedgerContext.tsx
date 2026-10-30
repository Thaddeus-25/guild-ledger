"use client";

// The app's shared memory. LedgerProvider wraps every page (see
// app/layout.tsx), and any component can read or change the ledger
// with useLedger().

import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { appReducer, createInitialAppState, type LedgerStatus } from "./appState";
import { monthOf, todayISO } from "./dates";
import type { LedgerAction } from "./ledgerReducer";
import { loadSave, writeSave } from "./storage";
import type { SaveFile } from "./types";

interface LedgerContextValue {
  status: LedgerStatus;
  data: SaveFile;
  corruptRaw: string | null;
  saveFailed: boolean;
  selectedMonth: string; // "2026-10", shared by Guild Hall and Ledger
  setSelectedMonth: (month: string) => void;
  dispatch: (action: LedgerAction) => void;
  startFresh: () => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatchApp] = useReducer(appReducer, undefined, createInitialAppState);
  const [selectedMonth, setSelectedMonth] = useState(() => monthOf(todayISO()));
  const { status, data } = state;

  // 1) LOAD, once, after the page first appears in the browser.
  //    localStorage only exists in the browser, never on the server,
  //    so this has to happen inside useEffect.
  useEffect(() => {
    dispatchApp({ type: "loaded", result: loadSave() });
  }, []);

  // 2) SAVE, every time the data changes...
  useEffect(() => {
    // ...but never before loading has finished. Otherwise the starter
    // data the app begins with would be written over the real ledger.
    if (status !== "ready") return;
    dispatchApp({ type: "saveResult", ok: writeSave(data) });
  }, [data, status]);

  return (
    <LedgerContext.Provider
      value={{
        status,
        data,
        corruptRaw: state.corruptRaw,
        saveFailed: state.saveFailed,
        selectedMonth,
        setSelectedMonth,
        dispatch: dispatchApp,
        startFresh: () => dispatchApp({ type: "startFresh" }),
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
