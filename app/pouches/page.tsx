import PixelPanel from "@/components/PixelPanel";

export default function PouchesPage() {
  return (
    <>
      <h1 className="page-title">Coin Pouches</h1>
      <p className="page-subtitle">Your categories and monthly limits</p>

      <PixelPanel title="Pouches">
        <p>This is where you&apos;ll create categories and set monthly limits.</p>
      </PixelPanel>
    </>
  );
}
