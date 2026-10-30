import Link from "next/link";
import PixelPanel from "@/components/PixelPanel";

export default function LedgerPage() {
  return (
    <>
      <h1 className="page-title">The Ledger</h1>
      <p className="page-subtitle">Your income and expense entries</p>

      <PixelPanel title="Entries">
        <p>The list of entries arrives in the next step.</p>
        <Link href="/ledger/new?from=/ledger" className="button">
          + Record entry
        </Link>
      </PixelPanel>
    </>
  );
}
