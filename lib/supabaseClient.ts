// The app's one connection to Supabase.
//
// The connection is made the first time getSupabase() is called, then
// reused. If the settings are missing, getSupabase() returns null and
// the app shows a "not set up yet" panel instead of crashing.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "./supabaseConfig";

let client: SupabaseClient | null = null;
let recoveryLink = false;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  // Next.js copies NEXT_PUBLIC_ values into the browser code when it
  // builds, but only when the full name is written out like this.
  // A lookup such as process.env[name] would come out undefined.
  const config = readSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config) return null;

  // A password-reset email link opens the app with "#...type=recovery..."
  // in the address. Supabase removes that while it logs in, so look first.
  if (typeof window !== "undefined") {
    recoveryLink = window.location.hash.includes("type=recovery");
  }

  // By default supabase-js keeps the login in this browser's storage and
  // refreshes it automatically, so you stay logged in on this device.
  client = createClient(config.url, config.key);
  return client;
}

// True if the app was opened from a password-reset email link.
export function openedFromRecoveryLink(): boolean {
  return recoveryLink;
}
