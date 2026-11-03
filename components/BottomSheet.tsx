"use client";

// A panel that slides up from the bottom of the screen, used by the date,
// Coin Pouch and amount pickers and the split sheet.
//
// It's built on the browser's <dialog> element. We draw every pixel of it
// ourselves, but the browser still does the invisible, important work:
// keeping keyboard focus inside, closing on Esc or the Android back
// gesture, telling screen readers "a dialog opened", and putting focus
// back on the button you tapped once it closes.

import { useEffect, useId, useRef } from "react";
import styles from "./BottomSheet.module.css";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Open and close the real dialog to match the "open" prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", ""); // very old browsers: show it in place
      }
      // Start on the most useful button (the chosen day, the chosen pouch…).
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Stop the page behind the sheet from scrolling while it's open (iPhones
  // otherwise scroll the form when you swipe inside the sheet).
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby={titleId}
      // Esc, the back gesture or dialog.close() all end up here. A sheet can
      // open another on top (the split sheet opens the amount pad), and React
      // passes the inner sheet's close up to this one, so only react to our own.
      onClose={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      // A tap on the dimmed area lands on the dialog itself, not the panel.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.grab} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {/* Only build the contents while open, so they start fresh each time. */}
        {open && children}
      </div>
    </dialog>
  );
}
