"use client";

import { useId, useState } from "react";
import PixelIcon from "./PixelIcon";
import { useLedger } from "@/lib/LedgerContext";
import { centsToInput } from "@/lib/money";
import { ICON_NAMES, type Category, type EntryType, type IconName } from "@/lib/types";
import { validateCategoryInput, type CategoryErrors } from "@/lib/validation";
import styles from "./CategoryForm.module.css";

type CategoryFormProps = {
  type: EntryType;
  initial?: Category; // given when editing, missing when adding
  onDone: () => void; // called after saving or cancelling
};

export default function CategoryForm({ type, initial, onDone }: CategoryFormProps) {
  const { data, dispatch } = useLedger();
  const formId = useId(); // unique ids, so each label points at the right input

  // "Controlled inputs": React state holds what's in each box.
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState<IconName>(
    initial?.icon ?? (type === "income" ? "coin" : "chest"),
  );
  const [limit, setLimit] = useState(
    initial?.monthlyLimitCents ? centsToInput(initial.monthlyLimitCents) : "",
  );
  const [errors, setErrors] = useState<CategoryErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page

    const result = validateCategoryInput({ name, type, icon, limit }, data.categories, initial?.id);
    if (!result.ok) {
      setErrors(result.errors); // keep what they typed; just show the problems
      return;
    }

    if (initial) {
      dispatch({ type: "updateCategory", category: { id: initial.id, ...result.value } });
    } else {
      dispatch({ type: "addCategory", category: { id: crypto.randomUUID(), ...result.value } });
    }
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field-label" htmlFor={`${formId}-name`}>
          Pouch name
        </label>
        <input
          id={`${formId}-name`}
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${formId}-name-error`} className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      {type === "expense" && (
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-limit`}>
            Monthly limit (optional)
          </label>
          <span className="field-hint" id={`${formId}-limit-hint`}>
            Leave empty for no limit.
          </span>
          <input
            id={`${formId}-limit`}
            className="field-input"
            inputMode="decimal"
            placeholder="e.g. 200"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            aria-invalid={errors.limit ? true : undefined}
            aria-describedby={`${formId}-limit-hint${errors.limit ? ` ${formId}-limit-error` : ""}`}
          />
          {errors.limit && (
            <p id={`${formId}-limit-error`} className="field-error">
              {errors.limit}
            </p>
          )}
        </div>
      )}

      <fieldset className={styles.icons}>
        <legend className="field-label">Icon</legend>
        {ICON_NAMES.map((iconName) => (
          <label key={iconName} className={styles.iconOption}>
            <input
              type="radio"
              name={`${formId}-icon`}
              value={iconName}
              checked={icon === iconName}
              onChange={() => setIcon(iconName)}
              aria-label={iconName}
            />
            <span className={styles.iconTile}>
              <PixelIcon name={iconName} />
            </span>
          </label>
        ))}
      </fieldset>

      <div className={styles.actions}>
        <button type="submit" className="button">
          {initial ? "Save pouch" : "Add pouch"}
        </button>
        <button type="button" className="button button-quiet" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
