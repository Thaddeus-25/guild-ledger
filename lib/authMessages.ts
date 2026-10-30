// Checking login forms, and turning Supabase's login errors into
// friendly words.

export const UNREACHABLE_MESSAGE = "Can't reach the guild archives. Check your signal and try again.";
export const RESET_SENT_MESSAGE = "If that email has an account, a reset link is on its way.";

export function validateLogin(
  email: string,
  password: string,
): { ok: true; email: string } | { ok: false; errors: { email?: string; password?: string } } {
  // Phone keyboards often add a space after an email. Supabase ignores
  // capital letters in emails, so only the spaces need removing.
  const cleanEmail = email.trim();
  const errors: { email?: string; password?: string } = {};
  if (!cleanEmail) errors.email = "Enter your email.";
  if (!password) errors.password = "Enter your password.";
  if (errors.email || errors.password) return { ok: false, errors };
  return { ok: true, email: cleanEmail };
}

export function loginErrorMessage(error: { status?: number; name?: string; code?: string }): string {
  if (error.status === 0 || error.name === "AuthRetryableFetchError") return UNREACHABLE_MESSAGE;
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many tries. Wait a few minutes and try again.";
  }
  // Never say which one was wrong: that would tell a stranger whether an
  // email has an account here.
  return "That email and password don't match.";
}

// Returns an error message, or null if the new password is fine.
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}
