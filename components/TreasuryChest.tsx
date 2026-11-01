import { CHEST_STATE_NAMES } from "@/lib/chest";
import { CHEST_ART, CHEST_COLORS, MIMIC_BLINK, type ChestState } from "@/lib/chestArt";
import styles from "./TreasuryChest.module.css";

type TreasuryChestProps = {
  state: ChestState;
  size?: number; // in screen pixels; keep it a multiple of 32 so pixels stay square
};

type Pixel = { x: number; y: number; letter: string };

// Every coloured pixel in a grid, skipping see-through "." pixels.
function pixels(rows: string[]): Pixel[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((letter, x) => (letter === "." ? [] : [{ x, y, letter }])),
  );
}

// Only the pixels where the blink frame differs from the open-eyed mimic (its eyes).
const BLINK_PIXELS = pixels(MIMIC_BLINK).filter(({ x, y, letter }) => CHEST_ART.overspent[y][x] !== letter);

function drawPixels(list: Pixel[]) {
  return list.map(({ x, y, letter }) => (
    <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={CHEST_COLORS[letter]} />
  ));
}

export default function TreasuryChest({ state, size = 64 }: TreasuryChestProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges" // sharp square edges, no blur
      role="img"
      aria-label={`Treasure chest: ${CHEST_STATE_NAMES[state]}`}
    >
      {drawPixels(pixels(CHEST_ART[state]))}
      {/* The blink is pure CSS: this layer is hidden except for a quick flash. */}
      {state === "overspent" && <g className={styles.blink}>{drawPixels(BLINK_PIXELS)}</g>}
    </svg>
  );
}
