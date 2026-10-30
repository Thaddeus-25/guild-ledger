import PixelPanel from "@/components/PixelPanel";

export default function GuildHallPage() {
  return (
    <>
      <h1 className="page-title">Guild Hall</h1>
      <p className="page-subtitle">Your month at a glance</p>

      <PixelPanel title="Welcome, adventurer">
        <p>
          Soon you&apos;ll see this month&apos;s income, expenses and what&apos;s left,
          plus how full each Coin Pouch is.
        </p>
      </PixelPanel>
    </>
  );
}
