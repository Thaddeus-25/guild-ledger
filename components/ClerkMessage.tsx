import PixelIcon from "./PixelIcon";
import styles from "./ClerkMessage.module.css";

// The guild clerk (a ledger-book portrait) with a speech bubble.
export default function ClerkMessage({ message }: { message: string }) {
  return (
    <aside className={styles.clerk} aria-label="Message from the guild clerk">
      <div className={styles.portrait}>
        <PixelIcon name="book" size={48} />
        <span className={styles.name}>Clerk</span>
      </div>
      <p className={styles.bubble}>{message}</p>
    </aside>
  );
}
