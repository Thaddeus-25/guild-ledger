"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { todayISO } from "@/lib/dates";
import { useLedger } from "@/lib/LedgerContext";
import { centsToInput } from "@/lib/money";
import type { EntryType, Transaction } from "@/lib/types";
import { validateTransactionInput, type TransactionErrors } from "@/lib/validation";
import styles from "./TransactionForm.module.css";

type TransactionFormProps = {
  initial?: Transaction; // given when editing, missing when recording a new entry
  returnTo: string; // the page to go back to afterwards
};

export default function TransactionForm({ initial, returnTo }: TransactionFormProps) {
  const { data, dispatch } = useLedger();
  const router = useRouter();
  const formId = useId();

  // Every box holds TEXT while you type; it becomes cents only on save.
  const [type, setType] = useState<EntryType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<TransactionErrors>({});

  const pouchesOfType = data.categories.filter((c) => c.type === type);

  function changeType(newType: EntryType) {
    setType(newType);
    // A pouch picked for the other type no longer fits, so clear it.
    const chosen = data.categories.find((c) => c.id === categoryId);
    if (chosen && chosen.type !== newType) setCategoryId("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateTransactionInput({ type, amount, date, categoryId, note }, data.categories);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    if (initial) {
      dispatch({ type: "updateTransaction", transaction: { id: initial.id, ...result.value } });
    } else {
      dispatch({
        type: "addTransaction",
        transaction: { id: crypto.randomUUID(), ...result.value },
        today: todayISO(),
      });
    }
    router.push(returnTo);
  }

  // Links each input to its error message, so screen readers read it out.
  function errorProps(field: keyof TransactionErrors) {
    return errors[field]
      ? { "aria-invalid": true, "aria-describedby": `${formId}-${field}-error` }
      : {};
  }

  function errorMessage(field: keyof TransactionErrors) {
    return (
      errors[field] && (
        <p id={`${formId}-${field}-error`} className="field-error">
          {errors[field]}
        </p>
      )
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset className="choice-group">
        <legend className="field-label">Type</legend>
        {(["expense", "income"] as const).map((option) => (
          <label key={option} className="choice">
            <input
              type="radio"
              name={`${formId}-type`}
              value={option}
              checked={type === option}
              onChange={() => changeType(option)}
            />
            <span>{option === "expense" ? "Expense (gold out)" : "Income (gold in)"}</span>
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label className="field-label" htmlFor={`${formId}-amount`}>
          Amount in dollars
        </label>
        <input
          id={`${formId}-amount`}
          className={`field-input ${styles.amount}`}
          inputMode="decimal"
          placeholder="e.g. 12.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          {...errorProps("amount")}
        />
        {errorMessage("amount")}
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${formId}-date`}>
          Date
        </label>
        <input
          id={`${formId}-date`}
          className="field-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          {...errorProps("date")}
        />
        {errorMessage("date")}
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${formId}-pouch`}>
          Coin Pouch
        </label>
        <select
          id={`${formId}-pouch`}
          className="field-input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          {...errorProps("categoryId")}
        >
          <option value="">Choose a pouch…</option>
          {pouchesOfType.map((pouch) => (
            <option key={pouch.id} value={pouch.id}>
              {pouch.name}
            </option>
          ))}
        </select>
        {errorMessage("categoryId")}
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${formId}-note`}>
          Note (optional)
        </label>
        <textarea
          id={`${formId}-note`}
          className="field-input"
          rows={2}
          placeholder="e.g. Bread and cheese at the market"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          {...errorProps("note")}
        />
        {errorMessage("note")}
      </div>

      <div className={styles.actions}>
        <button type="submit" className="button">
          {initial ? "Save changes" : "Record entry"}
        </button>
        <Link href={returnTo} className="button button-quiet">
          Cancel
        </Link>
      </div>
    </form>
  );
}
