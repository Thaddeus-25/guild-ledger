import styles from "./PixelPanel.module.css";

type PixelPanelProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

// A parchment box with a chunky pixel-art border.
export default function PixelPanel({ title, children, className }: PixelPanelProps) {
  return (
    <section className={className ? `${styles.panel} ${className}` : styles.panel}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  );
}
