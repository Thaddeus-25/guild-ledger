"use client";

// Decides what each page shows: the login form, a loading message, a
// problem panel, or the page itself. Once everything is fine it shows the
// page, with any saving banners above it.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LoginForm from "./LoginForm";
import PixelPanel from "./PixelPanel";
import { useAuth } from "@/lib/AuthContext";
import { downloadText } from "@/lib/download";
import { useLedger } from "@/lib/LedgerContext";
import { oldLedgerCounts } from "@/lib/oldLedger";
import { useOldLedger } from "@/lib/useOldLedger";
import styles from "./LedgerGate.module.css";

export default function LedgerGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const ledger = useLedger();
  const oldLedger = useOldLedger();
  // Which failure the save banner was dismissed at. A later failure shows it again.
  const [dismissedAt, setDismissedAt] = useState(0);

  // The password-reset page works without the ledger (see app/reset-password).
  if (pathname === "/reset-password") return <>{children}</>;

  if (auth.status === "no-config") {
    return (
      <PixelPanel title="The guild archives aren't set up yet">
        <p>
          This copy of Guild Ledger isn&apos;t connected to Supabase. See &quot;Setting up
          accounts&quot; in the README.
        </p>
      </PixelPanel>
    );
  }

  if (auth.status === "checking") {
    return <p className={styles.loading}>Opening the guild gate…</p>;
  }

  if (auth.status === "signed-out") return <LoginForm />;

  if (ledger.status === "unreachable") {
    return (
      <PixelPanel title="Can't reach the guild archives">
        <p>Your ledger couldn&apos;t be loaded. Check your signal, then try again.</p>
        <div className={styles.actions}>
          <button type="button" className="button" onClick={ledger.retry}>
            Try again
          </button>
        </div>
      </PixelPanel>
    );
  }

  if (ledger.status === "corrupt") {
    function handleStartFresh() {
      const sure = window.confirm(
        "Start a fresh ledger? Download the damaged data first if you want to keep a copy.",
      );
      if (sure) ledger.startFresh();
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
            onClick={() => downloadText("guild-ledger-damaged-data.txt", ledger.corruptRaw ?? "")}
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

  // Logged in, but the ledger hasn't arrived yet.
  if (ledger.status !== "ready") {
    return <p className={styles.loading}>Opening the ledger…</p>;
  }

  const showSaveBanner = ledger.saveProblem !== null && ledger.saveFailures > dismissedAt;
  const showOldLedgerNotice = pathname !== "/hearth" && oldLedgerCounts(oldLedger);

  return (
    <>
      {showSaveBanner && (
        <div role="alert" className={styles.banner}>
          <p>
            {ledger.saveProblem === "offline"
              ? "Can't reach the guild archives. Your last change isn't saved yet. It will save when your signal returns."
              : "Couldn't save your last change."}
          </p>
          <div className={styles.bannerButtons}>
            <button type="button" className="button" onClick={ledger.retry}>
              Try again
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => setDismissedAt(ledger.saveFailures)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {ledger.clashNotice && (
        <div role="status" className={styles.notice}>
          <p>
            Your ledger changed on another device. We loaded the newest version, so please add
            your last change again.
          </p>
          <button type="button" className="button button-quiet" onClick={ledger.dismissClash}>
            Dismiss
          </button>
        </div>
      )}

      {showOldLedgerNotice && (
        <p className={styles.notice}>
          <span>
            This device has a ledger from before accounts. Visit <Link href="/hearth">Hearth</Link>{" "}
            to bring it in.
          </span>
        </p>
      )}

      {children}
    </>
  );
}
