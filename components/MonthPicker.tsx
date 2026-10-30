"use client";

import { formatMonth, shiftMonth } from "@/lib/dates";
import { useLedger } from "@/lib/LedgerContext";
import styles from "./MonthPicker.module.css";

// ◀ October 2026 ▶ — changes the month shared by Guild Hall and Ledger.
export default function MonthPicker() {
  const { selectedMonth, setSelectedMonth } = useLedger();

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className="button button-quiet"
        onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
        aria-label="Previous month"
      >
        ◀
      </button>
      {/* aria-live: screen readers announce the new month after a click */}
      <p className={styles.month} aria-live="polite">
        {formatMonth(selectedMonth)}
      </p>
      <button
        type="button"
        className="button button-quiet"
        onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
        aria-label="Next month"
      >
        ▶
      </button>
    </div>
  );
}
