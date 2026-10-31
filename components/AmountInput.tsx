"use client";

// Guild Ledger's own amount input: a box that, when tapped, slides up a
// pixel number pad with coin buttons (+1, +5, +10, +20 dollars).
//
// Underneath it's still a real text box holding text like "12.50", so the
// form checks and saves it exactly as before (see lib/money.ts). The rules
// for each key live in lib/amountPad.ts.

import { useState, useSyncExternalStore } from "react";
import BottomSheet from "./BottomSheet";
import PixelIcon from "./PixelIcon";
import { addDollars, pressKey, type PadKey } from "@/lib/amountPad";
import styles from "./AmountInput.module.css";

type AmountInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  sheetTitle: string;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const COINS = [1, 5, 10, 20];
const KEYS: { key: PadKey; label: string; name?: string }[] = [
  ..."123456789".split("").map((d) => ({ key: d as PadKey, label: d })),
  { key: ".", label: ".", name: "Decimal point" },
  { key: "0", label: "0" },
  { key: "back", label: "⌫", name: "Delete" },
];

// Is this a touch screen? Phones get a read-only box (so their own
// keyboard can't pop up over our pad); computers can still type in it.
const TOUCH_QUERY = "(pointer: coarse)";
function subscribeToPointer(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function AmountInput(props: AmountInputProps) {
  const { id, value, onChange, sheetTitle, placeholder, className } = props;
  const [open, setOpen] = useState(false);
  const isTouch = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false, // while pre-rendering on the server
  );

  function press(key: PadKey) {
    onChange(pressKey(value, key));
  }

  // Real keyboard keys work while the pad is open, too.
  function handleKeyDown(event: React.KeyboardEvent) {
    const onButton = (event.target as HTMLElement).tagName === "BUTTON";
    if (/^[0-9]$/.test(event.key)) press(event.key as PadKey);
    else if (event.key === "." || event.key === ",") press(".");
    else if (event.key === "Backspace") press("back");
    else if (event.key === "Enter" && !onButton) setOpen(false);
    else return;
    event.preventDefault();
  }

  return (
    <>
      <input
        id={id}
        className={className}
        inputMode="none" // no phone keyboard: our pad replaces it
        readOnly={isTouch}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => setOpen(true)} // a tap or click opens the pad; Tab-ing in doesn't
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        aria-haspopup="dialog"
      />

      <BottomSheet open={open} title={sheetTitle} onClose={() => setOpen(false)}>
        <div className={styles.pad} onKeyDown={handleKeyDown}>
          <p className={styles.total} aria-live="polite">
            ${value || "0"}
          </p>

          <div className={styles.coins}>
            {COINS.map((dollars) => (
              <button
                key={dollars}
                type="button"
                className={styles.coin}
                aria-label={`Add ${dollars} ${dollars === 1 ? "dollar" : "dollars"}`}
                onClick={() => onChange(addDollars(value, dollars))}
              >
                <PixelIcon name="coin" size={20} />+{dollars}
              </button>
            ))}
          </div>

          <div className={styles.keys}>
            {KEYS.map(({ key, label, name }) => (
              <button
                key={key}
                type="button"
                className={`${styles.key} ${name ? styles.keyAlt : ""}`}
                aria-label={name}
                onClick={() => press(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" className={styles.done} data-autofocus="" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
