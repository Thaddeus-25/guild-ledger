"use client";

import Link from "next/link";
import { useState } from "react";
import MonthPicker from "@/components/MonthPicker";
import PixelPanel from "@/components/PixelPanel";
import TransactionList from "@/components/TransactionList";
import { monthTransactions } from "@/lib/budget";
import { newestFirst } from "@/lib/entries";
import { useLedger } from "@/lib/LedgerContext";
import type { EntryType } from "@/lib/types";

type Filter = "all" | EntryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export default function LedgerPage() {
  const { data, selectedMonth } = useLedger();
  const [filter, setFilter] = useState<Filter>("all");

  // Worked out fresh on every render from the saved entries,
  // so the list can never get out of step with the data.
  const entries = newestFirst(
    monthTransactions(data.transactions, selectedMonth).filter(
      (t) => filter === "all" || t.type === filter,
    ),
  );

  return (
    <>
      <h1 className="page-title">The Ledger</h1>
      <p className="page-subtitle">Your income and expense entries</p>

      <MonthPicker />

      <PixelPanel>
        <fieldset className="choice-group">
          <legend className="field-label">Show</legend>
          {FILTERS.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="ledger-filter"
                value={option.value}
                checked={filter === option.value}
                onChange={() => setFilter(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        <Link href="/ledger/new?from=/ledger" className="button">
          + Record entry
        </Link>

        <TransactionList
          transactions={entries}
          showActions
          emptyMessage={
            filter === "all"
              ? "No entries this month yet."
              : `No ${filter} entries this month.`
          }
        />
      </PixelPanel>
    </>
  );
}
