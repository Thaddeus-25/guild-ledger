"use client";

// Decides what to show while the ledger loads, if it can't be read,
// or if saving stops working. Once everything is fine, shows the page.

import { useState } from "react";
import PixelPanel from "./PixelPanel";
import { downloadText } from "@/lib/download";
import { useLedger } from "@/lib/LedgerContext";
import styles from "./LedgerGate.module.css";

export default function LedgerGate({ children }: { children: React.ReactNode }) {
  const { status, corruptRaw, saveFailed, startFresh } = useLedger();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (status === "loading") {
    return <p className={styles.loading}>Opening the ledger…</p>;
  }

  if (status === "corrupt") {
    function handleStartFresh() {
      const sure = window.confirm(
        "Start a fresh ledger? Download the damaged data first if you want to keep a copy.",
      );
      if (sure) startFresh();
    }

    return (
      <PixelPanel title="The ledger pages are smudged">
        <p>
          Your saved data couldn&apos;t be read. Nothing has been changed or deleted.
          You can download it to keep a copy, then start a fresh ledger.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className="button"
            onClick={() => downloadText("guild-ledger-damaged-data.txt", corruptRaw ?? "")}
          >
            Download the damaged data
          </button>
          <button type="button" className="button button-quiet" onClick={handleStartFresh}>
            Start fresh
          </button>
        </div>
      </PixelPanel>
    );
  }

  return (
    <>
      {saveFailed && !bannerDismissed && (
        <div role="alert" className={styles.banner}>
          <p>
            Couldn&apos;t save to this browser. Download a backup from Hearth to keep
            your data safe.
          </p>
          <button
            type="button"
            className="button button-quiet"
            onClick={() => setBannerDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </>
  );
}
