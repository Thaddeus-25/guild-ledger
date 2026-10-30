"use client";

import Link from "next/link";
import PixelIcon from "./PixelIcon";
import { formatDay } from "@/lib/dates";
import { useLedger } from "@/lib/LedgerContext";
import { formatCents } from "@/lib/money";
import type { Transaction } from "@/lib/types";
import styles from "./TransactionList.module.css";

type TransactionListProps = {
  transactions: Transaction[]; // already filtered and sorted
  showActions: boolean; // Edit / Delete buttons
  emptyMessage?: string;
};

export default function TransactionList({
  transactions,
  showActions,
  emptyMessage = "No entries this month yet.",
}: TransactionListProps) {
  const { data, dispatch } = useLedger();

  if (transactions.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  function handleDelete(entry: Transaction, pouchName: string) {
    const sure = window.confirm(
      `Delete this entry? ${formatCents(entry.amountCents)} in ${pouchName} on ${formatDay(entry.date)}.`,
    );
    if (sure) dispatch({ type: "deleteTransaction", id: entry.id });
  }

  return (
    <ul className={styles.list}>
      {transactions.map((entry) => {
        const pouch = data.categories.find((c) => c.id === entry.categoryId);
        const pouchName = pouch?.name ?? "Unknown pouch";
        const isIncome = entry.type === "income";

        return (
          <li key={entry.id} className={styles.row}>
            <PixelIcon name={pouch?.icon ?? "scroll"} />
            <div className={styles.details}>
              <span className={styles.pouch}>{pouchName}</span>
              <span className={styles.meta}>
                {formatDay(entry.date)}
                {entry.note && ` · ${entry.note}`}
              </span>
            </div>
            <div className={isIncome ? styles.income : styles.expense}>
              <span className={styles.amount}>
                {isIncome ? "+" : "−"}
                {formatCents(entry.amountCents)}
              </span>
              {/* Written out too, so the meaning never depends on color or a sign. */}
              <span className={styles.kind}>{isIncome ? "Income" : "Expense"}</span>
            </div>
            {showActions && (
              <div className={styles.actions}>
                <Link
                  href={`/ledger/${entry.id}?from=/ledger`}
                  className="button button-quiet"
                  aria-label={`Edit ${pouchName} entry from ${formatDay(entry.date)}`}
                >
                  Edit
                </Link>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => handleDelete(entry, pouchName)}
                  aria-label={`Delete ${pouchName} entry from ${formatDay(entry.date)}`}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
