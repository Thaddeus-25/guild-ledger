"use client";

import { useState } from "react";
import CategoryForm from "@/components/CategoryForm";
import PixelIcon from "@/components/PixelIcon";
import PixelPanel from "@/components/PixelPanel";
import { entriesInPouch } from "@/lib/ledgerReducer";
import { useLedger } from "@/lib/LedgerContext";
import { formatCents } from "@/lib/money";
import type { Category, EntryType } from "@/lib/types";
import styles from "./pouches.module.css";

// Which form is open: adding a pouch of some type, editing one, or none.
type OpenForm = { mode: "add"; type: EntryType } | { mode: "edit"; id: string } | null;

const SECTIONS: { type: EntryType; title: string; blurb: string }[] = [
  { type: "income", title: "Income pouches", blurb: "Where your gold comes from." },
  {
    type: "expense",
    title: "Expense pouches",
    blurb: "Where your gold goes. Give a pouch a monthly limit to track it on the Guild Hall.",
  },
];

export default function PouchesPage() {
  const { data, dispatch } = useLedger();
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [blocked, setBlocked] = useState<{ id: string; count: number } | null>(null);

  function handleDelete(pouch: Category) {
    const count = entriesInPouch(data.transactions, pouch.id);
    if (count > 0) {
      setBlocked({ id: pouch.id, count });
      return;
    }
    if (window.confirm(`Delete the ${pouch.name} pouch?`)) {
      dispatch({ type: "deleteCategory", id: pouch.id });
    }
  }

  function startEditing(id: string) {
    setBlocked(null);
    setOpenForm({ mode: "edit", id });
  }

  return (
    <>
      <h1 className="page-title">Coin Pouches</h1>
      <p className="page-subtitle">Your categories and monthly limits</p>

      {SECTIONS.map((section) => {
        const pouches = data.categories.filter((c) => c.type === section.type);
        const adding = openForm?.mode === "add" && openForm.type === section.type;

        return (
          <PixelPanel key={section.type} title={section.title}>
            <p className={styles.blurb}>{section.blurb}</p>

            <ul className={styles.list}>
              {pouches.map((pouch) =>
                openForm?.mode === "edit" && openForm.id === pouch.id ? (
                  <li key={pouch.id}>
                    <CategoryForm
                      type={pouch.type}
                      initial={pouch}
                      onDone={() => setOpenForm(null)}
                    />
                  </li>
                ) : (
                  <li key={pouch.id} className={styles.row}>
                    <PixelIcon name={pouch.icon} />
                    <span className={styles.name}>{pouch.name}</span>
                    {pouch.type === "expense" && (
                      <span className={styles.limit}>
                        {pouch.monthlyLimitCents
                          ? `Limit ${formatCents(pouch.monthlyLimitCents)} / month`
                          : "No limit"}
                      </span>
                    )}
                    <span className={styles.rowActions}>
                      <button
                        type="button"
                        className="button button-quiet"
                        onClick={() => startEditing(pouch.id)}
                        aria-label={`Edit ${pouch.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button-quiet"
                        onClick={() => handleDelete(pouch)}
                        aria-label={`Delete ${pouch.name}`}
                      >
                        Delete
                      </button>
                    </span>
                    {blocked?.id === pouch.id && (
                      <p className={styles.blocked} role="status">
                        {blocked.count === 1 ? "1 entry uses" : `${blocked.count} entries use`}{" "}
                        this pouch. Move or delete them first, or rename the pouch instead.
                      </p>
                    )}
                  </li>
                ),
              )}
            </ul>

            {adding ? (
              <CategoryForm type={section.type} onDone={() => setOpenForm(null)} />
            ) : (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setBlocked(null);
                  setOpenForm({ mode: "add", type: section.type });
                }}
              >
                + Add {section.type} pouch
              </button>
            )}
          </PixelPanel>
        );
      })}
    </>
  );
}
