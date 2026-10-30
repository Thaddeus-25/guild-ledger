import PixelIcon from "./PixelIcon";
import { BAR_SEGMENTS, budgetBarText, filledSegments, type PouchUsage } from "@/lib/budget";
import styles from "./BudgetBar.module.css";

// A segmented bar, like a game's stamina bar, showing how much of a
// pouch's monthly limit is used.
export default function BudgetBar({ usage }: { usage: PouchUsage }) {
  const { category, spentCents, limitCents, status } = usage;
  const filled = filledSegments(spentCents, limitCents);
  const text = budgetBarText(usage);

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <PixelIcon name={category.icon} />
        <span className={styles.name}>{category.name}</span>
      </div>
      <div
        className={`${styles.bar} ${styles[status]}`}
        role="progressbar"
        aria-label={`${category.name} monthly limit`}
        aria-valuemin={0}
        aria-valuemax={limitCents}
        aria-valuenow={Math.min(spentCents, limitCents)}
        aria-valuetext={text}
      >
        {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={i < filled ? styles.filled : styles.segment}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <p className={status === "over" ? `${styles.text} ${styles.overText}` : styles.text}>{text}</p>
    </div>
  );
}
