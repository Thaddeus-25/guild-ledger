"use client";

// Reads the old browser-only ledger (from before accounts), and updates
// when it's removed. Returns { kind: "empty" } when there isn't one.

import { useMemo, useSyncExternalStore } from "react";
import { OLD_LEDGER_EVENT } from "./oldLedger";
import { readRaw, resultFromRaw, type LoadResult } from "./storage";

// Tells React when to read storage again: when another tab changes it,
// or when this tab removes the old ledger (see forgetOldLedger).
function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(OLD_LEDGER_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(OLD_LEDGER_EVENT, onChange);
  };
}

export function useOldLedger(): LoadResult {
  // While pages pre-render on the server there's no storage, so: none.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => resultFromRaw(raw), [raw]);
}
