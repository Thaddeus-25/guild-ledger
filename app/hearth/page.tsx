import PixelPanel from "@/components/PixelPanel";

export default function HearthPage() {
  return (
    <>
      <h1 className="page-title">Hearth</h1>
      <p className="page-subtitle">Settings and backups</p>

      <PixelPanel title="By the fire">
        <p>This is where you&apos;ll back up your data and change settings.</p>
      </PixelPanel>
    </>
  );
}
