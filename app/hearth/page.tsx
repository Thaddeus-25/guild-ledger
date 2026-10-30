"use client";

import PixelPanel from "@/components/PixelPanel";
import { useLedger } from "@/lib/LedgerContext";
import styles from "./hearth.module.css";

export default function HearthPage() {
  const { data, dispatch } = useLedger();

  return (
    <>
      <h1 className="page-title">Hearth</h1>
      <p className="page-subtitle">Settings and backups</p>

      <PixelPanel title="Rewards">
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={data.settings.showRewards}
            onChange={(e) => dispatch({ type: "setShowRewards", value: e.target.checked })}
            aria-describedby="rewards-help"
          />
          <span>Show rewards (Logbook stamps and Guild rank)</span>
        </label>
        <p id="rewards-help" className="field-hint">
          Earn one stamp for each day you record an entry. Stamps never go away.
        </p>
      </PixelPanel>
    </>
  );
}
