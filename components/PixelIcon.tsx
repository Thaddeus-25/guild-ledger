import { ICON_ART, ICON_COLORS } from "@/lib/icons";
import type { IconName } from "@/lib/types";

type PixelIconProps = {
  name: IconName;
  size?: number; // in screen pixels; 32 draws each art pixel 2×2
  label?: string; // only for icons that mean something on their own
};

export default function PixelIcon({ name, size = 32, label }: PixelIconProps) {
  const rows = ICON_ART[name];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges" // sharp square edges, no blur
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true} // decorative icons are skipped by screen readers
    >
      {rows.map((row, y) =>
        [...row].map((letter, x) =>
          letter === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ICON_COLORS[letter]} />
          ),
        ),
      )}
    </svg>
  );
}
