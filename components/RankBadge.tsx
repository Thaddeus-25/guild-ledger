import PixelIcon from "./PixelIcon";
import { rankBadgeText } from "@/lib/ranks";
import styles from "./RankBadge.module.css";

// Your Guild rank and Logbook stamps. Hidden when rewards are turned off.
export default function RankBadge({ stamps }: { stamps: number }) {
  return (
    <p className={styles.badge}>
      <PixelIcon name="sword" size={24} />
      <span>{rankBadgeText(stamps)}</span>
    </p>
  );
}
