"use client";

import { useState } from "react";
import PixelPanel from "@/components/PixelPanel";
import { todayISO } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { useLedger } from "@/lib/LedgerContext";
import { createStarterData } from "@/lib/starterData";
import { parseBackup } from "@/lib/storage";
import styles from "./hearth.module.css";

type Notice = { kind: "success" | "error"; text: string } | null;

export default function HearthPage() {
  const { data, dispatch } = useLedger();
  const [notice, setNotice] = useState<Notice>(null);

  function downloadBackup() {
    downloadText(`guild-ledger-backup-${todayISO()}.json`, JSON.stringify(data, null, 2));
    setNotice({ kind: "success", text: "Backup downloaded. Keep it somewhere safe." });
  }

  async function restoreBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    // Clear the picker so choosing the same file again still triggers onChange.
    input.value = "";
    if (!file) return;

    const backup = parseBackup(await file.text());
    if (!backup) {
      setNotice({ kind: "error", text: "That file isn't a Guild Ledger backup. Nothing was changed." });
      return;
    }
    if (!window.confirm("This replaces all current data. Continue?")) return;

    dispatch({ type: "replaceAll", data: backup });
    setNotice({ kind: "success", text: "Backup restored." });
  }

  function resetEverything() {
    const sure = window.confirm(
      "Reset all data? Every entry, pouch and Logbook stamp will be erased. " +
        "Download a backup first if you might want them back.",
    );
    if (!sure) return;
    dispatch({ type: "replaceAll", data: createStarterData() });
    setNotice({ kind: "success", text: "The ledger has been reset to a fresh start." });
  }

  return (
    <>
      <h1 className="page-title">Hearth</h1>
      <p className="page-subtitle">Settings and backups</p>

      {notice && (
        <p role="status" className={notice.kind === "success" ? styles.success : styles.error}>
          {notice.text}
        </p>
      )}

      <PixelPanel title="Your data">
        <p>Your ledger is saved inside this web browser, on this device. That means:</p>
        <ul className={styles.limits}>
          <li>It stays in this browser only. Your phone or another browser won&apos;t see it.</li>
          <li>Clearing your browsing data, or using a private window, removes it or hides it.</li>
          <li>It isn&apos;t encrypted, so anyone using this computer account could read it.</li>
          <li>There&apos;s room for about 5 MB, which is years of entries.</li>
        </ul>
        <p>Download a backup now and then, so you can always get your ledger back.</p>

        <div className={styles.actions}>
          <button type="button" className="button" onClick={downloadBackup}>
            Download backup
          </button>
          <input
            id="restore-file"
            className={styles.fileInput}
            type="file"
            accept="application/json,.json"
            onChange={restoreBackup}
          />
          <label htmlFor="restore-file" className="button button-quiet">
            Restore from backup…
          </label>
        </div>
      </PixelPanel>

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

      <PixelPanel title="Start over">
        <p>Erase everything and go back to the starter pouches.</p>
        <div className={styles.actions}>
          <button type="button" className="button button-quiet" onClick={resetEverything}>
            Reset all data
          </button>
        </div>
      </PixelPanel>
    </>
  );
}
