"use client";

import Link from "next/link";
import BudgetBar from "@/components/BudgetBar";
import MonthPicker from "@/components/MonthPicker";
import PixelIcon from "@/components/PixelIcon";
import PixelPanel from "@/components/PixelPanel";
import SummaryCard from "@/components/SummaryCard";
import TransactionList from "@/components/TransactionList";
import { monthTotals, monthTransactions, pouchUsage, unlimitedSpending } from "@/lib/budget";
import { newestFirst } from "@/lib/entries";
import { useLedger } from "@/lib/LedgerContext";
import { formatCents } from "@/lib/money";
import styles from "./guild-hall.module.css";

export default function GuildHallPage() {
  const { data, selectedMonth } = useLedger();
  const { categories, transactions } = data;

  // All worked out fresh from the saved entries for the chosen month.
  const totals = monthTotals(transactions, selectedMonth);
  const limited = pouchUsage(categories, transactions, selectedMonth);
  const unlimited = unlimitedSpending(categories, transactions, selectedMonth);
  const recent = newestFirst(monthTransactions(transactions, selectedMonth)).slice(0, 5);

  return (
    <>
      <h1 className="page-title">Guild Hall</h1>
      <p className="page-subtitle">Your month at a glance</p>

      <MonthPicker />

      <div className={styles.cards}>
        <SummaryCard title="Gold earned" plain="Income" cents={totals.incomeCents} icon="coin" />
        <SummaryCard title="Gold spent" plain="Expenses" cents={totals.expenseCents} icon="chest" />
        <SummaryCard
          title="Gold remaining"
          plain="Income minus expenses"
          cents={totals.remainingCents}
          icon="gem"
          overByWhenNegative
        />
      </div>

      <Link href="/ledger/new?from=/" className="button">
        + Record entry
      </Link>

      <div className={styles.columns}>
        <PixelPanel title="Pouch limits">
          {limited.length > 0 ? (
            limited.map((usage) => <BudgetBar key={usage.category.id} usage={usage} />)
          ) : (
            <p>
              Set a monthly limit on a pouch to track it here.{" "}
              <Link href="/pouches">Go to Coin Pouches</Link>
            </p>
          )}
        </PixelPanel>

        {unlimited.length > 0 && (
          <PixelPanel title="No limit set">
            <ul className={styles.unlimited}>
              {unlimited.map(({ category, spentCents }) => (
                <li key={category.id}>
                  <PixelIcon name={category.icon} size={24} />
                  <span>{category.name}</span>
                  <span className={styles.spent}>{formatCents(spentCents)}</span>
                </li>
              ))}
            </ul>
          </PixelPanel>
        )}
      </div>

      <PixelPanel title="Recent entries">
        <TransactionList transactions={recent} showActions={false} />
        {recent.length > 0 && (
          <p className={styles.more}>
            <Link href="/ledger">See all entries in the Ledger</Link>
          </p>
        )}
      </PixelPanel>
    </>
  );
}
