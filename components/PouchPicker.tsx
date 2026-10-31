"use client";

// Guild Ledger's own Coin Pouch picker: a box showing the chosen pouch,
// and a sheet listing every pouch with its icon and what's left this month.
//
// The rows are real radio buttons (hidden behind the pixel drawing), so
// screen readers announce "Tavern, 4 of 6, selected" as they would for any
// list of choices. It hands the form a pouch id, exactly as the old dropdown did.

import Link from "next/link";
import { useState } from "react";
import BottomSheet from "./BottomSheet";
import PixelIcon from "./PixelIcon";
import { pouchLeftText } from "@/lib/budget";
import type { Category, EntryType, Transaction } from "@/lib/types";
import styles from "./PouchPicker.module.css";

type PouchPickerProps = {
  id: string;
  type: EntryType;
  pouches: Category[]; // only the pouches of this type
  transactions: Transaction[];
  month: string; // "YYYY-MM", the month of the entry's date
  value: string; // the chosen pouch's id, or "" for none
  onChange: (id: string) => void;
  errorId?: string;
};

export default function PouchPicker(props: PouchPickerProps) {
  const { id, type, pouches, transactions, month, value, onChange, errorId } = props;
  const [open, setOpen] = useState(false);
  const chosen = pouches.find((p) => p.id === value);
  const chosenLeft = chosen ? pouchLeftText(chosen, transactions, month) : null;

  function pick(pouchId: string) {
    onChange(pouchId);
    setOpen(false);
  }

  return (
    <>
      <span className="field-label" id={`${id}-label`}>
        Coin Pouch
      </span>
      <button
        type="button"
        id={id}
        className={`field-input ${styles.box}`}
        aria-labelledby={`${id}-label ${id}`}
        aria-describedby={errorId}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {chosen ? (
          <>
            <PixelIcon name={chosen.icon} size={24} />
            <span className={styles.boxName}>
              {chosen.name}
              {chosenLeft && <small className={styles[chosenLeft.tone]}> · {chosenLeft.text}</small>}
            </span>
          </>
        ) : (
          <span className={styles.boxName}>Choose a pouch…</span>
        )}
        <span aria-hidden="true">▲</span>
      </button>

      <BottomSheet open={open} title="Choose a Coin Pouch" onClose={() => setOpen(false)}>
        {pouches.length === 0 ? (
          <p className={styles.empty}>
            No {type} pouches yet. <Link href="/pouches">Make one in Coin Pouches</Link>.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Coin Pouch" className={styles.list}>
            {pouches.map((pouch, index) => {
              const left = pouchLeftText(pouch, transactions, month);
              // The chosen pouch (or the first) is where focus starts.
              const startHere = value ? pouch.id === value : index === 0;
              return (
                <label key={pouch.id} className={styles.row}>
                  <input
                    type="radio"
                    name={`${id}-pouch`}
                    value={pouch.id}
                    checked={pouch.id === value}
                    data-autofocus={startHere ? "" : undefined}
                    onChange={() => pick(pouch.id)}
                    // Tapping the pouch that's already chosen just closes the sheet.
                    onClick={() => pouch.id === value && setOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        pick(pouch.id);
                      }
                    }}
                  />
                  <span className={styles.rowLook}>
                    <PixelIcon name={pouch.icon} size={28} />
                    <span className={styles.rowName}>{pouch.name}</span>
                    {left && <span className={`${styles.left} ${styles[left.tone]}`}>{left.text}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
