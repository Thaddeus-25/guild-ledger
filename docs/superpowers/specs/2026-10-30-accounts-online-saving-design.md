# Guild Ledger — Accounts and Online Saving (design)

Adds a login and saves the ledger to Supabase, so the owner's PC and phone show the same ledger. Builds on the v1 design (`2026-10-29-guild-ledger-design.md`); everything not mentioned here stays as v1 describes it.

## Intent

- **Who it's for:** the owner only. They use the app on a Windows PC and a Samsung phone, at https://guild-ledger-pixel.vercel.app.
- **Problem:** v1 saves to each browser's localStorage, so every device and browser has its own separate ledger.
- **What "done" means:** the owner logs in on any device and sees one shared ledger. Each change is saved online. When there's no signal, the app says so kindly and saves once the signal returns. The existing browser ledger can be brought into the account.
- **Constraints:** online-only (working offline is a later upgrade). A single new runtime dependency, `@supabase/supabase-js`. No server code: the app stays a browser app that talks to Supabase directly, and privacy is enforced by Row Level Security. The learner-friendly style from v1 carries on: small files, plain comments, tests first.

## Decisions (agreed with the owner)

| Question | Decision |
|---|---|
| Who logs in | Only the owner. The account is created by hand in the Supabase dashboard; new sign-ups are switched off. No sign-up page. |
| Login style | Email + password, with a "Forgot password?" email reset. |
| Offline | Online-only. Unsaved changes stay on screen and save when the signal returns. |
| Storage shape | One row per user holding the whole ledger as JSON (the v1 `SaveFile`), plus a `version` counter for clash detection. |
| Build safety | Work happens on the `accounts` branch (Vercel preview deploys). It's merged into `main` only once it all works. |

## Scope

**In:** login, logout, password reset, loading and saving through Supabase, the "can't reach the guild archives" state, clash detection between devices, refreshing when the app returns to the front, warning before closing with unsaved changes, bringing an old browser ledger into the account, a friendly message when Supabase isn't configured, README setup guide.

**Out:** working offline or opening with no signal, a sign-up page, other login methods, sharing a ledger between people, deleting an account from the app, real-time push updates between devices.

## Supabase

`supabase/schema.sql` (already run in the owner's `pixel-ledger` project on 2026-10-30; the file must match what was run):

- Table `public.ledgers`: `user_id uuid` primary key, default `auth.uid()`, references `auth.users(id) on delete cascade`; `data jsonb not null`; `version integer not null default 1 check (version >= 1)`; `updated_at timestamptz not null default now()`.
- RLS enabled. Policies for role `authenticated` only: select, insert and update, each limited to `(select auth.uid()) = user_id`. No delete policy.
- `grant select, insert, update on public.ledgers to authenticated`.
- A `before update` trigger, `ledgers_touch_updated_at`, sets `updated_at := now()` using the function `public.touch_updated_at()` (`set search_path = ''`).

Any later schema change goes in a new numbered file (`supabase/migrations/…`), never by editing `schema.sql`.

**Environment variables** (in `.env.local` and Vercel, for Production and Preview):
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both are safe for the browser.
- `DB_PASSWORD` is the owner's and is not used by the app.
- Optional, local only: `TEST_LOGIN_EMAIL` and `TEST_LOGIN_PASSWORD` for a separate test account. They're only used by Claude's end-to-end check, never by app code.

If either `NEXT_PUBLIC_` variable is missing, the app doesn't crash. Every page shows a "The guild archives aren't set up yet" panel that points to the README.

## Saving and loading (`lib/remoteStore.ts`)

Each function takes the Supabase client as a parameter, so tests can pass in a fake one.

- `loadLedger(client, userId)` → `{ kind: "empty" }` (no row yet) | `{ kind: "ok", data, version }` | `{ kind: "corrupt", raw, version }` (the row's `data` fails `validateSaveFile`; `raw` is the JSON text) | `{ kind: "offline" }` | `{ kind: "failed", message }`.
- `saveLedger(client, userId, data, version)`, where `version` is `null` when no row exists yet. It returns `{ kind: "saved", version }` | `{ kind: "clash" }` | `{ kind: "offline" }` | `{ kind: "failed", message }`.
  - With `version === null`, it inserts `{ user_id, data, version: 1 }`. A duplicate-key error means another device created the row first, so it returns `clash`.
  - Otherwise it runs `update { data, version: version + 1 } where user_id = userId and version = version` and asks for the updated rows back. Zero rows means someone else saved first, so it returns `clash`.
- **Telling offline apart from failed:** a request that never got an HTTP response (a network or fetch error) is `offline`. A response with an error is `failed`. A `failed` result whose message mentions an expired or invalid login also triggers a session refresh check (see Auth).

## App state (`lib/appState.ts`)

`LedgerStatus` becomes `"no-config" | "signed-out" | "loading" | "unreachable" | "corrupt" | "ready"`.

- `unreachable` means the first load failed (offline or failed). The gate shows "Can't reach the guild archives" with a Try again button.

New fields in `AppState`:
- `version: number | null`
- `dirty: boolean`, true when there are changes not yet saved
- `saveProblem: null | "offline" | "failed" | "clash"`
- `saveFailures`, kept from v1 so the banner returns after it's dismissed

Rules:
- Ledger actions (v1's `LedgerAction`) set `dirty = true` and are still ignored unless the status is `ready`.
- A `loaded` result never sets `dirty`. Loading never triggers a save. This fixes the v1 pattern of saving straight after loading, which would bump `version` on every visit.
- `saved` sets the new `version` and clears `saveProblem`. It clears `dirty` only if the data saved is still the current data. If more changes came in while the save was travelling, `dirty` stays true and another save follows.
- `clash` reloads the newest ledger, sets `dirty = false`, and shows the clash notice.
- `startFresh` (from the corrupt panel) replaces the data with the starter data and sets `dirty = true`. The next save overwrites the damaged row using its `version`.

The reducer stays pure. Every rule above is tested in `lib/appState.test.ts`.

## Save queue (`lib/LedgerContext.tsx`)

- **One save at a time.** When `dirty`, the status is `ready`, and no save is in flight, it starts `saveLedger` with the current data and `version`. When the save finishes, if more changes arrived meanwhile, it starts another save with the newest data. Saves never overlap, so an older ledger can never arrive last.
- **Retry** when the browser fires `online`, when the app returns to the front (`visibilitychange` → visible), and from a "Try again" button.
- **Refresh** when the app returns to the front, if nothing is unsaved and no save is in flight: it reloads the ledger. If there are unsaved changes, it saves them first, and the version check catches a clash.
- **Before closing:** while `dirty`, a `beforeunload` handler makes the browser ask "Leave site?".
- The v1 `storage` event listener is removed. Other tabs pick up changes through the refresh on returning to the front.
- The timing logic lives in a small pure helper (`lib/saveQueue.ts`, which decides when to start the next save and with which data). That way it can be unit-tested without React.

## Auth (`lib/supabaseClient.ts`, `lib/AuthContext.tsx`)

- `getSupabase()` creates one client lazily from the two env variables, or returns `null` if they're missing. The session is kept in the browser by supabase-js (its default localStorage persistence), and tokens refresh automatically.
- `AuthProvider` exposes `{ status: "no-config" | "checking" | "signed-out" | "signed-in", user, signIn(email, password), signOut(), sendPasswordReset(email) }`. It follows `onAuthStateChange`.
- `LedgerProvider` loads the ledger whenever the signed-in user changes. On sign-out it clears the data from memory.
- **Log out** (on Hearth): if `dirty`, it asks first ("You have a change that isn't saved yet. Log out anyway?").

## Pages and components

- **Signed out:** every page except `/reset-password` shows the **Guild Gate** login form in place of the page (`components/LoginForm.tsx`). The nav bar is hidden. After logging in, you stay on the page you asked for.
  - Errors: "Enter your email.", "Enter your password.", "That email and password don't match." (for any credentials error, so it doesn't reveal which part was wrong), and "Can't reach the guild archives. Check your signal and try again."
  - A "Forgot password?" button sends the reset email to the typed address. It shows "If that email has an account, a reset link is on its way." whether or not the account exists.
- **`/reset-password`:** opened from the email link. Supabase signs the user in with a recovery session (the `PASSWORD_RECOVERY` event). The page asks for the new password twice: at least 8 characters, both must match. It calls `updateUser({ password })`, then links to the Guild Hall. Without a recovery session it says "This link has expired. Ask for a new one from the login page."
- **Banners (in `LedgerGate`):**
  - offline: "Can't reach the guild archives. Your last change isn't saved yet. It will save when your signal returns." with a Try again button.
  - failed: "Couldn't save your last change." with Try again.
  - clash: "Your ledger changed on another device. We loaded the newest version, so please add your last change again." with a Dismiss button.
  - The v1 dismiss behavior (a new failure shows the banner again) carries over.
- **Hearth:** adds "Logged in as <email>" and a **Log out** button. Backup download and restore stay. A restore replaces the account's ledger after the same confirmation v1 uses, then saves.

## Bringing in the old browser ledger (`lib/combineLedgers.ts`)

- On each device, after login, `loadSave()` (v1, unchanged) reads the old `guild-ledger:save` key.
- An old ledger **counts** if it's corrupt, or if it has at least one transaction, or if its pouches differ from `createStarterData()`.
- If one counts, the gate shows a one-line notice on every page, "This device has a ledger from before accounts. Visit Hearth to bring it in.", and Hearth shows a panel:
  - **Add it to my account:** combines the old ledger into the account ledger, then saves. It's not offered for a corrupt one.
  - **Download it:** v1's backup download (or the damaged-data download).
  - **Discard it:** asks for confirmation first.
  - Add and Discard remove the `guild-ledger:save` key afterwards. Download keeps it.
- `combineLedgers(account, old): SaveFile` is pure:
  - **Pouches** match by id first, then by name (case-insensitive) and type. A matched pouch keeps the account's version. An unmatched old pouch is added. If an old pouch has the same id as an account pouch but a different type, it gets a new id (`newId()`), and its entries move with it.
  - **Entries:** old entries whose id already exists in the account are skipped. The rest are added, with their pouch id remapped to the matched pouch.
  - **Logbook days** are combined as a union. **Settings:** the account's win.
  - The result must pass `validateSaveFile`, and a test checks that.
- If the account had no row yet, the starter data is the account ledger that the old one is combined into.

## Error handling summary

| Situation | What the owner sees |
|---|---|
| Env variables missing | "The guild archives aren't set up yet", pointing to the README |
| Signed out | Guild Gate login form |
| First load fails | "Can't reach the guild archives" + Try again |
| Saved row is damaged | v1's damaged-data panel (Download / Start fresh) |
| A save goes offline or fails | Banner + Try again; retries automatically when the signal returns or the app returns to the front |
| Clash | Clash notice; newest ledger shown |
| Closing with unsaved changes | Browser's "Leave site?" prompt |

## Testing

- **TDD for all logic,** with the Supabase client faked: `remoteStore` (each result kind, including insert duplicate → clash and update with 0 rows → clash), `appState` (every new transition, and loading never sets `dirty`), `saveQueue` (never overlaps, always sends the newest data, re-saves after changes made mid-save), `combineLedgers` (matching by id and by name+type, the type-clash remap, skipped duplicate entries, logbook union, result passes `validateSaveFile`), and the "old ledger counts" rule.
- All existing tests stay green. `npm run lint` and `npm run build` stay clean, and the build must pass without the env variables set.
- **Browser checks (Playwright):** the login form and its errors, the no-config panel, and the offline banner (browser set to offline). Checked at 360px and 1280px.
- **End to end:** if `TEST_LOGIN_EMAIL`/`TEST_LOGIN_PASSWORD` are in `.env.local`, Claude logs in with that test account against the real project and checks load, save, reload, and a clash between two browser contexts. Otherwise the owner does the final check: log in on PC and phone, add an entry on one, and see it on the other.

## Rollout

1. Build on `accounts`, committing and pushing each step (Vercel preview deploys; previews show the no-config panel until the env vars are added for Preview).
2. The owner finishes the Supabase dashboard setup (create user, turn off sign-ups, URL configuration) and adds the env vars locally and in Vercel. The README walks through each click.
3. Check on the preview URL, then merge `accounts` into `main`, and the live site switches over.
4. On each device, log in and bring in the old browser ledger from Hearth.
