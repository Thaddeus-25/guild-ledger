import type { ReactNode } from "react";
import PixelIcon from "./PixelIcon";
import { formatCents } from "@/lib/money";
import type { IconName } from "@/lib/types";
import styles from "./SummaryCard.module.css";

type SummaryCardProps = {
  title: string; // game name, e.g. "Gold spent"
  plain: string; // plain meaning, e.g. "Expenses"
  cents: number;
  icon: IconName | ReactNode; // a pouch icon name, or your own art (like the treasure chest)
  overByWhenNegative?: boolean; // show "Over by $X" instead of a minus sign
};

export default function SummaryCard({ title, plain, cents, icon, overByWhenNegative }: SummaryCardProps) {
  const isOver = overByWhenNegative && cents < 0;

  return (
    <div className={styles.card}>
      {typeof icon === "string" ? <PixelIcon name={icon as IconName} size={40} /> : icon}
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
