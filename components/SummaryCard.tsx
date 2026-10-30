import PixelIcon from "./PixelIcon";
import { formatCents } from "@/lib/money";
import type { IconName } from "@/lib/types";
import styles from "./SummaryCard.module.css";

type SummaryCardProps = {
  title: string; // game name, e.g. "Gold spent"
  plain: string; // plain meaning, e.g. "Expenses"
  cents: number;
  icon: IconName;
  overByWhenNegative?: boolean; // show "Over by $X" instead of a minus sign
};

export default function SummaryCard({ title, plain, cents, icon, overByWhenNegative }: SummaryCardProps) {
  const isOver = overByWhenNegative && cents < 0;

  return (
    <div className={styles.card}>
      <PixelIcon name={icon} size={40} />
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.plain}>{plain}</p>
        {isOver ? (
          <p className={`${styles.amount} ${styles.over}`}>Over by {formatCents(-cents)}</p>
        ) : (
          <p className={styles.amount}>{formatCents(cents)}</p>
        )}
      </div>
    </div>
  );
}
