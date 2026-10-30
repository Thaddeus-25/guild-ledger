"use client";

// Where the "Forgot password?" email link lands. Supabase logs you in
// with a short-lived recovery login, and this page sets the new password.

import Link from "next/link";
import { useState } from "react";
import PixelPanel from "@/components/PixelPanel";
import { useAuth } from "@/lib/AuthContext";
import { validateNewPassword } from "@/lib/authMessages";
import styles from "./reset.module.css";

export default function ResetPasswordPage() {
  const { status, recovery, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    const failed = await updatePassword(password);
    setBusy(false);
    if (failed) setError(failed);
    else setDone(true);
  }

  let content: React.ReactNode;
  if (status === "checking") {
    content = <p>Checking your reset link…</p>;
  } else if (done) {
    content = (
      <>
        <p role="status">Your password has been changed.</p>
        <div className={styles.actions}>
          <Link href="/" className="button">
            Go to the Guild Hall
          </Link>
        </div>
      </>
    );
  } else if (!recovery || status !== "signed-in") {
    // Opened without a reset link, or the link is too old to use.
    content = (
      <>
        <p>This link has expired. Ask for a new one from the login page.</p>
        <div className={styles.actions}>
          <Link href="/" className="button">
            Go to the login page
          </Link>
        </div>
      </>
    );
  } else {
    content = (
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            className="field-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="new-password-hint"
          />
          <p id="new-password-hint" className="field-hint">
            At least 8 characters.
          </p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="confirm-password">
            Type it again
          </label>
          <input
            id="confirm-password"
            className="field-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" className="button" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <h1 className="page-title">Guild Ledger</h1>
      <p className="page-subtitle">Password reset</p>
      <PixelPanel title="Choose a new password">{content}</PixelPanel>
    </>
  );
}
