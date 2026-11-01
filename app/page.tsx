"use client";

import Link from "next/link";
import BudgetBar from "@/components/BudgetBar";
import ClerkMessage from "@/components/ClerkMessage";
import MonthPicker from "@/components/MonthPicker";
import PixelIcon from "@/components/PixelIcon";
import PixelPanel from "@/components/PixelPanel";
import RankBadge from "@/components/RankBadge";
import SummaryCard from "@/components/SummaryCard";
import TransactionList from "@/components/TransactionList";
import TreasuryChest from "@/components/TreasuryChest";
import { monthTotals, monthTransactions, pouchUsage, unlimitedSpending } from "@/lib/budget";
import { chestState } from "@/lib/chest";
import { clerkMessage } from "@/lib/clerk";
import { todayISO } from "@/lib/dates";
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
  const inMonth = monthTransactions(transactions, selectedMonth);
  const recent = newestFirst(inMonth).slice(0, 5);

  const today = todayISO();
  const message = clerkMessage({
    monthEntryCount: inMonth.length,
    overPouchNames: limited.filter((u) => u.status === "over").map((u) => u.category.name),
    recordedToday: data.logbookDays.includes(today),
    dayOfMonth: Number(today.slice(8)), // "2026-10-29" -> 29
  });

  return (
    <>
      <h1 className="page-title">Guild Hall</h1>
      <p className="page-subtitle">Your month at a glance</p>

      {data.settings.showRewards && <RankBadge stamps={data.logbookDays.length} />}

      <MonthPicker />
      <ClerkMessage message={message} />

      <div className={styles.cards}>
        <SummaryCard title="Gold earned" plain="Income" cents={totals.incomeCents} icon="coin" />
        <SummaryCard title="Gold spent" plain="Expenses" cents={totals.expenseCents} icon="chest" />
        <SummaryCard
          title="Gold remaining"
          plain="Income minus expenses"
          cents={totals.remainingCents}
          icon={<TreasuryChest state={chestState(totals.incomeCents, totals.remainingCents)} />}
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
