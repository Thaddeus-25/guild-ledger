import PixelPanel from "@/components/PixelPanel";

export default function LedgerPage() {
  return (
    <>
      <h1 className="page-title">The Ledger</h1>
      <p className="page-subtitle">Your income and expense entries</p>

      <PixelPanel title="No entries yet">
        <p>This is where you&apos;ll record, edit and delete entries.</p>
      </PixelPanel>
    </>
  );
}
