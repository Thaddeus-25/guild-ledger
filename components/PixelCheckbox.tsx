// Guild Ledger's own checkbox: a pixel square that fills gold with a check
// mark. A real (invisible) checkbox sits on top, so tapping, the keyboard
// and screen readers all work the same as a normal checkbox.

import styles from "./PixelCheckbox.module.css";

type PixelCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode; // the label text
  describedBy?: string;
};

export default function PixelCheckbox({ checked, onChange, children, describedBy }: PixelCheckboxProps) {
  return (
    <label className={styles.row}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={describedBy}
      />
      <span className={styles.box} aria-hidden="true">
        {/* A chunky check mark drawn with pixels (a 7×6 grid). */}
        <svg viewBox="0 0 7 6" width="18" height="16" shapeRendering="crispEdges">
          <path d="M6 0h1v2H6zM5 1h1v2H5zM4 2h1v2H4zM3 3h1v2H3zM2 4h1v2H2zM1 3h1v2H1zM0 2h1v2H0z" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
