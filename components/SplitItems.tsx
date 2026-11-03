"use client";

// The optional split on the new-entry form. After entering the full amount,
// "Split into items…" opens a sheet where parts of it can go to other
// pouches. Whatever isn't split off stays with the form's own Coin Pouch.
//
// Each item uses the same amount pad and pouch list as the main form; they
// open on top of this sheet. The form owns the items (see lib/split.ts for
// the sums and checks), so closing the sheet never loses them.

import { useState } from "react";
import AmountInput from "./AmountInput";
import BottomSheet from "./BottomSheet";
import PixelIcon from "./PixelIcon";
import PouchPicker from "./PouchPicker";
import { newId } from "@/lib/ids";
import { formatCents, parseAmount } from "@/lib/money";
import {
  itemLimitCents,
  splitTotals,
  withoutBlankItems,
  type SplitItem,
  type SplitItemErrors,
} from "@/lib/split";
import type { Category, EntryType, Transaction } from "@/lib/types";
import styles from "./SplitItems.module.css";

type SplitItemsProps = {
  id: string;
  type: EntryType;
  total: string; // the main form's amount, as typed
  mainPouch?: Category; // the main form's pouch, which gets the rest
  pouches: Category[]; // only the pouches of this type
  transactions: Transaction[];
  month: string;
  items: SplitItem[];
  onChange: (items: SplitItem[]) => void;
  itemErrors: Record<string, SplitItemErrors>; // by item id
  error?: string; // about the split as a whole
};

function blankItem(): SplitItem {
  return { id: newId(), amount: "", categoryId: "", note: "" };
}

export default function SplitItems(props: SplitItemsProps) {
  const { id, type, total, mainPouch, pouches, transactions, month, items, onChange, itemErrors, error } =
    props;
  const [open, setOpen] = useState(false);
  const { totalCents, itemsCents, restCents } = splitTotals(total, items);
  const hasErrors = Object.values(itemErrors).some((e) => Object.keys(e).length > 0);

  function openSheet() {
    if (items.length === 0) onChange([blankItem()]);
    setOpen(true);
  }

  // Items left empty are dropped, so a stray "Add item" doesn't block saving.
  function close() {
    onChange(withoutBlankItems(items));
    setOpen(false);
  }

  function changeItem(itemId: string, change: Partial<SplitItem>) {
    onChange(items.map((item) => (item.id === itemId ? { ...item, ...change } : item)));
  }

  function pouchName(categoryId: string) {
    return pouches.find((p) => p.id === categoryId);
  }

  // "$30.50 stays in Provisions", in the summary and the sheet.
  function restText() {
    if (restCents === null) return null;
    if (restCents < 0) {
      return `The items are ${formatCents(-restCents)} more than the full amount.`;
    }
    if (restCents === 0) return "The items use up the full amount.";
    return `${formatCents(restCents)} stays in ${mainPouch ? mainPouch.name : "the Coin Pouch above"}.`;
  }

  const errorId = `${id}-error`;
  const problem = error ?? (hasErrors ? "Some split items need fixing." : undefined);

  return (
    <div className="field">
      <span className="field-label" id={`${id}-label`}>
        Split (optional)
      </span>

      {items.length === 0 ? (
        <p className="field-hint">Paid for several things at once? Put parts of the amount in other pouches.</p>
      ) : (
        <ul className={styles.summary} aria-labelledby={`${id}-label`}>
          {items.map((item) => {
            const pouch = pouchName(item.categoryId);
            const amount = parseAmount(item.amount);
            return (
              <li key={item.id} className={styles.summaryRow}>
                {pouch ? <PixelIcon name={pouch.icon} size={24} /> : <span className={styles.noIcon} />}
                <span className={styles.summaryName}>{pouch ? pouch.name : "No pouch yet"}</span>
                <span className={styles.money}>{amount.ok ? formatCents(amount.cents) : "—"}</span>
              </li>
            );
          })}
          {restText() && <li className={styles.rest}>{restText()}</li>}
        </ul>
      )}

      <button
        type="button"
        className={`button button-quiet ${styles.openButton}`}
        aria-haspopup="dialog"
        aria-describedby={problem ? errorId : undefined}
        onClick={openSheet}
      >
        {items.length === 0 ? "Split into items…" : "Change split…"}
      </button>
      {problem && (
        <p id={errorId} className="field-error">
          {problem}
        </p>
      )}

      <BottomSheet open={open} title="Split the full amount" onClose={close}>
        <p className={styles.total}>
          {totalCents === null ? (
            "Enter the full amount first, then split it here."
          ) : (
            <>
              Full amount: <span className={styles.money}>{formatCents(totalCents)}</span>
            </>
          )}
        </p>

        <ol className={styles.items}>
          {items.map((item, index) => {
            const itemId = `${id}-${item.id}`;
            const errors = itemErrors[item.id] ?? {};
            const describe = (field: keyof SplitItemErrors) =>
              errors[field] ? { "aria-invalid": true, "aria-describedby": `${itemId}-${field}-error` } : {};
            const errorText = (field: keyof SplitItemErrors) =>
              errors[field] && (
                <p id={`${itemId}-${field}-error`} className="field-error">
                  {errors[field]}
                </p>
              );

            return (
              <li key={item.id} className={styles.item} aria-label={`Item ${index + 1}`}>
                <div className={styles.itemHead}>
                  <span className={styles.itemTitle}>Item {index + 1}</span>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                  >
                    Remove
                  </button>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor={`${itemId}-amount`}>
                    Amount in dollars
                  </label>
                  <AmountInput
                    id={`${itemId}-amount`}
                    className={`field-input ${styles.amount}`}
                    sheetTitle={`Item ${index + 1} amount`}
                    placeholder="e.g. 5.00"
                    value={item.amount}
                    onChange={(amount) => changeItem(item.id, { amount })}
                    // Never more than what's left after the other items.
                    maxCents={itemLimitCents(total, items, item.id)}
                    maxLabel="left to split"
                    {...describe("amount")}
                  />
                  {errorText("amount")}
                </div>

                <div className="field">
                  <PouchPicker
                    id={`${itemId}-pouch`}
                    type={type}
                    pouches={pouches}
                    transactions={transactions}
                    month={month}
                    value={item.categoryId}
                    onChange={(categoryId) => changeItem(item.id, { categoryId })}
                    errorId={errors.categoryId ? `${itemId}-categoryId-error` : undefined}
                  />
                  {errorText("categoryId")}
                </div>

                <div className={`field ${styles.lastField}`}>
                  <label className="field-label" htmlFor={`${itemId}-note`}>
                    Note (optional)
                  </label>
                  <input
                    id={`${itemId}-note`}
                    className="field-input"
                    autoComplete="off"
                    placeholder="Same as the main note"
                    value={item.note}
                    onChange={(e) => changeItem(item.id, { note: e.target.value })}
                    {...describe("note")}
                  />
                  {errorText("note")}
                </div>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          className={`button button-quiet ${styles.add}`}
          onClick={() => onChange([...items, blankItem()])}
        >
          + Add item
        </button>

        <div className={styles.totals} aria-live="polite">
          <p>
            Split off: <span className={styles.money}>{formatCents(itemsCents)}</span>
          </p>
          {restText() && <p className={restCents !== null && restCents < 0 ? "field-error" : undefined}>{restText()}</p>}
        </div>

        <button type="button" className={`button ${styles.done}`} onClick={close}>
          Done
        </button>
      </BottomSheet>
    </div>
  );
}
