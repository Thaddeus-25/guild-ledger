// Checks the two Supabase settings from .env.local (or Vercel).
// Kept separate from the client so it can be tested without Supabase.

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Returns the settings, or null if either one is missing or blank.
export function readSupabaseConfig(
  url: string | undefined,
  key: string | undefined,
): SupabaseConfig | null {
  const cleanUrl = url?.trim() ?? "";
  const cleanKey = key?.trim() ?? "";
  if (!cleanUrl || !cleanKey) return null;
  return { url: cleanUrl, key: cleanKey };
}
