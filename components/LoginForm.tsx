"use client";

// The Guild Gate: the login form shown on every page while logged out.

import { useState } from "react";
import PixelPanel from "./PixelPanel";
import { RESET_SENT_MESSAGE, validateLogin } from "@/lib/authMessages";
import { useAuth } from "@/lib/AuthContext";
import styles from "./LoginForm.module.css";

type Message = { kind: "error" | "info"; text: string } | null;

export default function LoginForm() {
  const { signIn, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false); // stops double clicks while waiting

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser reloading the page
    setMessage(null);
    const check = validateLogin(email, password);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    const problem = await signIn(check.email, password);
    setBusy(false);
    // On success there's nothing to do: the gate opens by itself.
    if (problem) setMessage({ kind: "error", text: problem });
  }

  async function handleForgot() {
    setMessage(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrors({ email: "Enter your email first, then choose Forgot password." });
      return;
    }
    setErrors({});
    setBusy(true);
    const problem = await sendPasswordReset(cleanEmail);
    setBusy(false);
    setMessage(problem ? { kind: "error", text: problem } : { kind: "info", text: RESET_SENT_MESSAGE });
  }

  return (
    <>
      <h1 className="page-title">Guild Ledger</h1>
      <p className="page-subtitle">A cozy budgeting ledger for adventurers</p>
      <PixelPanel title="Guild Gate">
        <p className={styles.intro}>Welcome back, adventurer. Log in to open your ledger.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="field-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "login-email-error" : undefined}
            />
            {errors.email && (
              <p id="login-email-error" className="field-error">
                {errors.email}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "login-password-error" : undefined}
            />
            {errors.password && (
              <p id="login-password-error" className="field-error">
                {errors.password}
              </p>
            )}
          </div>

          {message && (
            <p role={message.kind === "error" ? "alert" : "status"} className={styles[message.kind]}>
              {message.text}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Opening the gate…" : "Log in"}
            </button>
            <button type="button" className="button button-quiet" onClick={handleForgot} disabled={busy}>
              Forgot password?
            </button>
          </div>
        </form>
      </PixelPanel>
    </>
  );
}
