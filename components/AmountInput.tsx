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
import { addDollars, finishAmount, pressKeyFresh, type PadKey } from "@/lib/amountPad";
import { formatCents } from "@/lib/money";
import styles from "./AmountInput.module.css";

type AmountInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  sheetTitle: string;
  placeholder?: string;
  className?: string;
  maxCents?: number; // a lower limit than $1,000,000, e.g. what's left to split
  maxLabel?: string; // shown in the pad when there's a limit, e.g. "left to split"
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
  const { id, value, onChange, sheetTitle, placeholder, className, maxCents, maxLabel } = props;
  const [open, setOpen] = useState(false);
  const isTouch = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false, // while pre-rendering on the server
  );

  // However the pad closes (Done, ✕, Esc, a tap outside), tidy the amount:
  // "5" becomes "5.00" and "12." becomes "12.00".
  function close() {
    onChange(finishAmount(value, maxCents));
    setOpen(false);
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
        // Typed on a computer without the pad: tidy it the same way.
        onBlur={() => onChange(finishAmount(value, maxCents))}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        aria-haspopup="dialog"
      />

      <BottomSheet open={open} title={sheetTitle} onClose={close}>
        <Pad value={value} onChange={onChange} onDone={close} maxCents={maxCents} maxLabel={maxLabel} />
      </BottomSheet>
    </>
  );
}

type PadProps = {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  maxCents?: number;
  maxLabel?: string;
};

// The pad itself. It's built fresh each time the sheet opens, so "fresh"
// starts true: the first digit replaces an amount that was already there.
function Pad({ value, onChange, onDone, maxCents, maxLabel }: PadProps) {
  const [fresh, setFresh] = useState(value !== "");

  function press(key: PadKey) {
    onChange(pressKeyFresh(value, key, fresh, maxCents));
    setFresh(false);
  }

  function addCoin(dollars: number) {
    onChange(addDollars(value, dollars, maxCents));
    setFresh(false);
  }

  // Real keyboard keys work while the pad is open, too. Enter always means
  // Done, even after clicking a key (otherwise Enter would press it again).
  function handleKeyDown(event: React.KeyboardEvent) {
    if (/^[0-9]$/.test(event.key)) press(event.key as PadKey);
    else if (event.key === "." || event.key === ",") press(".");
    else if (event.key === "Backspace") press("back");
    else if (event.key === "Enter") onDone();
    else return;
    event.preventDefault();
  }

  return (
    <div className={styles.pad} onKeyDown={handleKeyDown}>
      <p className={styles.total} aria-live="polite">
        ${value || "0"}
      </p>
      {maxCents !== undefined && (
        <p className={styles.limit}>
          Up to {formatCents(maxCents)} {maxLabel ?? ""}
        </p>
      )}

      <div className={styles.coins}>
        {COINS.map((dollars) => (
          <button
            key={dollars}
            type="button"
            className={styles.coin}
            aria-label={`Add ${dollars} ${dollars === 1 ? "dollar" : "dollars"}`}
            onClick={() => addCoin(dollars)}
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

      <button type="button" className={styles.done} data-autofocus="" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
