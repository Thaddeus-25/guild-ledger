"use client";

import Link from "next/link";
import { use } from "react";
import PixelPanel from "@/components/PixelPanel";
import TransactionForm from "@/components/TransactionForm";
import { useLedger } from "@/lib/LedgerContext";
import { safeReturnPath } from "@/lib/navigation";

// /ledger/<id> — edit one entry. The [id] folder name means "any value here".
export default function EditEntryPage({ params, searchParams }: PageProps<"/ledger/[id]">) {
  // In this version of Next.js these arrive as promises; use() unwraps them.
  const { id } = use(params);
  const { from } = use(searchParams);
  const { data } = useLedger();

  const entry = data.transactions.find((t) => t.id === id);

  return (
    <>
      <h1 className="page-title">Edit entry</h1>
      <p className="page-subtitle">Change any detail and save</p>

      <PixelPanel>
        {entry ? (
          <TransactionForm initial={entry} returnTo={safeReturnPath(from)} />
        ) : (
          <>
            <p>This entry couldn&apos;t be found.</p>
            <Link href="/ledger" className="button">
              Back to the Ledger
            </Link>
          </>
        )}
      </PixelPanel>
    </>
  );
}
