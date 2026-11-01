import { CHEST_STATE_NAMES } from "@/lib/chest";
import { CHEST_ART, CHEST_COLORS, type ChestState } from "@/lib/chestArt";

type TreasuryChestProps = {
  state: ChestState;
  size?: number; // in screen pixels; keep it a multiple of 32 so pixels stay square
};

export default function TreasuryChest({ state, size = 64 }: TreasuryChestProps) {
  const rows = CHEST_ART[state];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges" // sharp square edges, no blur
      role="img"
      aria-label={`Treasure chest: ${CHEST_STATE_NAMES[state]}`}
    >
      {rows.map((row, y) =>
        [...row].map((letter, x) =>
          letter === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={CHEST_COLORS[letter]} />
          ),
        ),
      )}
    </svg>
  );
}
