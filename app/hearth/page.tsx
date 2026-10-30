"use client";

import { useState } from "react";
import PixelPanel from "@/components/PixelPanel";
import { useAuth } from "@/lib/AuthContext";
import { todayISO } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { useLedger } from "@/lib/LedgerContext";
import { forgetOldLedger, oldLedgerCounts } from "@/lib/oldLedger";
import { createStarterData } from "@/lib/starterData";
import { parseBackup } from "@/lib/storage";
import { useOldLedger } from "@/lib/useOldLedger";
import styles from "./hearth.module.css";

type Notice = { kind: "success" | "error"; text: string } | null;

export default function HearthPage() {
  const { user, signOut } = useAuth();
  const { data, dirty, saving, importState, importOldLedger, dispatch } = useLedger();
  const oldLedger = useOldLedger();
  const [notice, setNotice] = useState<Notice>(null);
  const [addPressed, setAddPressed] = useState(false);

  // How bringing in the old ledger is going, worked out from the ledger's
  // own state so it can't claim "done" before the save really worked.
  const oldLedgerFound = oldLedgerCounts(oldLedger);
  let importMessage: string | null = null;
  if (addPressed && importState !== "none") {
    importMessage = "Adding your old ledger to your account… It stays in this browser until it's saved online.";
  } else if (addPressed && !oldLedgerFound) {
    importMessage = "Your old ledger was added to your account.";
  }

  async function logOut() {
    if (dirty || saving) {
      const sure = window.confirm("You have a change that isn't saved yet. Log out anyway?");
      if (!sure) return;
    }
    const problem = await signOut();
    // On success the Guild Gate replaces this page, so only problems need showing.
    if (problem) setNotice({ kind: "error", text: `Couldn't log out: ${problem}` });
  }

  function addOldLedger() {
    if (oldLedger.kind !== "ok") return;
    // The old copy is only removed from this browser once the save works
    // (see LedgerContext). Adding it twice is harmless: nothing duplicates.
    importOldLedger(oldLedger.data);
    setAddPressed(true);
    setNotice(null);
  }

  function downloadOldLedger() {
    if (oldLedger.kind === "ok") {
      downloadText(`guild-ledger-old-browser-ledger-${todayISO()}.json`, JSON.stringify(oldLedger.data, null, 2));
    } else if (oldLedger.kind === "corrupt") {
      downloadText("guild-ledger-old-damaged-data.txt", oldLedger.raw);
    }
  }

  function discardOldLedger() {
    const sure = window.confirm(
      "Discard the old ledger in this browser? Download it first if you might want it.",
    );
    if (!sure) return;
    forgetOldLedger();
    setNotice({ kind: "success", text: "The old ledger was removed from this browser." });
  }

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
      {importMessage && (
        <p role="status" className={styles.success}>
          {importMessage}
        </p>
      )}

      <PixelPanel title="Your guild account">
        <p>
          Logged in as <strong>{user?.email}</strong>
        </p>
        <div className={styles.actions}>
          <button type="button" className="button button-quiet" onClick={logOut}>
            Log out
          </button>
        </div>
      </PixelPanel>

      {oldLedgerFound && (
        <PixelPanel title="A ledger from before accounts">
          <p>
            This browser still has a ledger saved from before you had an account. It isn&apos;t
            part of your account yet.
          </p>
          {oldLedger.kind === "corrupt" && (
            <p>It&apos;s damaged and can&apos;t be read, but you can download it to keep a copy.</p>
          )}
          <div className={styles.actions}>
            {oldLedger.kind === "ok" && (
              <button
                type="button"
                className="button"
                onClick={addOldLedger}
                disabled={importState !== "none"}
              >
                Add it to my account
              </button>
            )}
            <button type="button" className="button button-quiet" onClick={downloadOldLedger}>
              Download it
            </button>
            <button type="button" className="button button-quiet" onClick={discardOldLedger}>
              Discard it
            </button>
          </div>
        </PixelPanel>
      )}

      <PixelPanel title="Your data">
        <p>Your ledger is saved to your guild account online. That means:</p>
        <ul className={styles.limits}>
          <li>Every device you log in on shows the same ledger.</li>
          <li>You need a signal to save changes. Without one, the app tells you and saves later.</li>
          <li>Only you can read it: the guild archives check your login on every request.</li>
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
