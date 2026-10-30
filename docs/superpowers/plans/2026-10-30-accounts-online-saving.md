# Accounts and Online Saving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an email + password login and save the ledger to the owner's Supabase project, so every device shows one shared ledger.

**Architecture:** The app stays a browser-only Next.js app. A thin `LedgerTable` gateway wraps supabase-js, and pure functions (`remoteStore`, `appState`, `saveQueue`, `combineLedgers`, `authMessages`) carry all the logic, so Vitest can test them against fakes. React providers (`AuthProvider` → `LedgerProvider`) wire those functions to the browser. `LedgerGate` decides what each screen shows.

**Tech Stack:** Next.js 16.4.3 App Router, React 19.3, TypeScript, CSS Modules, Vitest 5, `@supabase/supabase-js` v2 (new).

**Spec:** `docs/superpowers/specs/2026-10-30-accounts-online-saving-design.md`

## Global Constraints

- Work on branch `accounts`. Commit after each task and `git push` to `origin accounts`. **Never add a Co-Authored-By line to commits.**
- The only new runtime dependency is `@supabase/supabase-js`. Add no other packages.
- No server code: no route handlers, server actions or `proxy.ts`. Every Supabase call happens in the browser.
- Read the env variables with literal names only, `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Next.js does not inline dynamic lookups such as `process.env[name]`.
- `npm run build` must pass **without** those env variables set.
- Use the user-facing copy exactly as the spec words it. Money and dates use the v1 helpers.
- Keep the v1 rules: the `react-hooks/set-state-in-effect` lint rule is enforced (put state changes in reducers or subscription callbacks), integer cents, `"YYYY-MM-DD"` dates, 44px tap targets, and focus rings that are visible on parchment.
- The owner is learning, so comment code plainly, in v1's style.
- Before using a Next.js API, read its doc in `node_modules/next/dist/docs/` (as AGENTS.md says).

## Review Focus

1. **Login expires mid-use** (a save gets 401/403). The owner should see the "Couldn't save" banner, never a crash, and the change stays on screen. *(Task 2 test: `saveLedger` maps 401 to `failed`.)*
2. **Returning to the app with an unsaved change.** The refresh must not overwrite the unsaved change. *(Task 4 test: `refreshRequested` is ignored while `dirty`.)*
3. **A clash, then the reload fails because the device is offline.** No save may go out with the old version; the reload is retried later. *(Task 4 test: after `clash` + `loaded offline`, `nextSave` is null and `needsReload` stays true.)*
4. **An email typed with spaces or capital letters** on a phone keyboard should still log in. *(Task 5 test: `validateLogin` returns the trimmed email.)*
5. **A preview deploy with no env variables.** The build passes and the page shows the "not set up yet" panel. *(Task 1 test for `readSupabaseConfig`; Task 10 runs a build without env.)*

## Rulings against the spec (made while planning)

- The spec says `remoteStore` takes "the Supabase client". Instead it takes a `LedgerTable` gateway (three methods) that a thin adapter builds from the client. It's the same purpose (fakes in tests) with a much smaller fake.
- The spec lists `clash` inside `saveProblem`. Instead the clash is a separate `clashNotice` flag plus `needsReload`, because saving must keep working while the clash notice is still on screen.
- The spec has `lib/saveQueue.ts` decide "when to start the next save". This is `nextSave(state)`. The in-flight flag (`saving`) lives in `AppState`.
- Added a login message for rate limiting: "Too many tries. Wait a few minutes and try again." Without it, a 429 would show the misleading "don't match" message.

---

### Task 1: Supabase schema, package and client

**Files:**
- Create: `supabase/schema.sql`, `lib/supabaseConfig.ts`, `lib/supabaseConfig.test.ts`, `lib/supabaseClient.ts`
- Modify: `package.json`, `package-lock.json` (via npm)

**Interfaces:**
- Produces: `interface SupabaseConfig { url: string; key: string }`; `readSupabaseConfig(url: string | undefined, key: string | undefined): SupabaseConfig | null`; `getSupabase(): SupabaseClient | null` (created once and memoized in a module variable; `null` when not configured); `openedFromRecoveryLink(): boolean`. The last one is true when, at the moment the client was first created, `window.location.hash` contained `type=recovery`. It's captured *before* `createClient`, because supabase-js removes the hash while signing in. Check the installed auth-js default `flowType`: if it's `pkce`, the link brings `?code=` instead of a hash. In that case, record a ruling and detect recovery by `pathname === "/reset-password"` together with a `code` search param.

- [ ] **Step 1:** Write `supabase/schema.sql` with exactly the SQL the owner already ran: the `ledgers` table, RLS enabled, three policies for `authenticated`, the grant, the `touch_updated_at` function and the `ledgers_touch_updated_at` trigger, as the spec describes. Add a top comment: "Already run in the pixel-ledger project on 2026-10-30. Don't edit; add a new file in supabase/migrations/ for changes."
- [ ] **Step 2:** `npm install @supabase/supabase-js@^2`. Expected: it installs with no ERESOLVE error.
- [ ] **Step 3: Write the failing test** `lib/supabaseConfig.test.ts`:

```ts
it("returns null when either value is missing or blank", () => {
  expect(readSupabaseConfig(undefined, "k")).toBeNull();
  expect(readSupabaseConfig("https://x.supabase.co", "")).toBeNull();
  expect(readSupabaseConfig("  ", "k")).toBeNull();
});
it("trims both values", () => {
  expect(readSupabaseConfig(" https://x.supabase.co ", " k ")).toEqual({ url: "https://x.supabase.co", key: "k" });
});
```

- [ ] **Step 4:** Run `npx vitest run lib/supabaseConfig.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 5:** Implement `readSupabaseConfig` in `lib/supabaseConfig.ts`. Then implement `getSupabase()` in `lib/supabaseClient.ts`, which calls `readSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)` and `createClient(url, key)` with the default auth options (the session is kept in localStorage and tokens refresh automatically). Add a comment explaining why the names must be written out literally.
- [ ] **Step 6:** Run `npm test`. Expected: every test passes.
- [ ] **Step 7:** Commit "Add Supabase schema, client and config check" and push.

### Task 2: Loading and saving through Supabase (`lib/remoteStore.ts`)

**Files:**
- Create: `lib/remoteStore.ts`, `lib/remoteStore.test.ts`

**Interfaces:**
- Consumes: `validateSaveFile` (lib/storage.ts), `SaveFile`.
- Produces:

```ts
export interface DbError { message: string; code?: string }
export interface DbResult<T> { data: T | null; error: DbError | null; status: number } // status 0 = no response
export interface LedgerRow { data: unknown; version: number }
export interface LedgerTable {
  select(userId: string): Promise<DbResult<LedgerRow>>; // data null when there's no row
  insert(userId: string, data: SaveFile): Promise<DbResult<null>>; // inserts version 1
  update(userId: string, expectedVersion: number, data: SaveFile): Promise<DbResult<{ version: number }[]>>;
}
export type RemoteLoadResult =
  | { kind: "empty" } | { kind: "ok"; data: SaveFile; version: number }
  | { kind: "corrupt"; raw: string; version: number } | { kind: "offline" } | { kind: "failed"; message: string };
export type SaveResult =
  | { kind: "saved"; version: number } | { kind: "clash" } | { kind: "offline" } | { kind: "failed"; message: string };
export function loadLedger(table: LedgerTable, userId: string): Promise<RemoteLoadResult>;
export function saveLedger(table: LedgerTable, userId: string, data: SaveFile, version: number | null): Promise<SaveResult>;
export function supabaseLedgerTable(client: SupabaseClient): LedgerTable;
```

- [ ] **Step 1: Write the failing tests.** Use a fake `LedgerTable` built from plain objects that also records its calls. Use `createStarterData()` as valid data.
  - `loadLedger`: no row (`{data:null,error:null,status:200}`) → `{kind:"empty"}`; a valid row with version 4 → `{kind:"ok", version:4}` and data equal to the row's data; row data `{nope:1}`, version 4 → `{kind:"corrupt", raw:'{"nope":1}', version:4}`; `status:0` with an error → `{kind:"offline"}`; `status:500`, message "boom" → `{kind:"failed", message:"boom"}`.
  - `saveLedger` with `version null`: calls `insert(userId, data)` and returns `{kind:"saved", version:1}`; an insert error with `code:"23505"` → `{kind:"clash"}`.
  - `saveLedger` with `version 3`: calls `update(userId, 3, data)`; a reply of `[{version:4}]` → `{kind:"saved", version:4}`; a reply of `[]` → `{kind:"clash"}`.
  - Either path: `status:0` → `offline`; `status:401`, message "JWT expired" → `{kind:"failed", message:"JWT expired"}`. *(Review Focus 1.)*
- [ ] **Step 2:** Run `npx vitest run lib/remoteStore.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `loadLedger` and `saveLedger`. The rule: `status === 0` → offline; any other error → failed. `corrupt.raw` is `JSON.stringify(row.data)`.
- [ ] **Step 4:** Implement `supabaseLedgerTable(client)` (not unit-tested; it's a thin adapter):
  - `select` is `from("ledgers").select("data, version").eq("user_id", id).maybeSingle()`.
  - `insert` is `.insert({ user_id, data, version: 1 })`.
  - `update` is `.update({ data, version: expected + 1 }).eq("user_id", id).eq("version", expected).select("version")`.
  - Each method passes on `{data, error, status}`. A thrown exception becomes `{data:null, error:{message}, status:0}`.
- [ ] **Step 5:** Run `npm test`. Expected: every test passes.
- [ ] **Step 6:** Commit "Load and save the ledger through Supabase" and push.

### Task 3: Bringing in the old browser ledger (logic)

**Files:**
- Create: `lib/combineLedgers.ts`, `lib/combineLedgers.test.ts`, `lib/oldLedger.ts`, `lib/oldLedger.test.ts`
- Modify: `lib/storage.ts` (export `resultFromRaw`, remove `writeSave`), `lib/storage.test.ts` (drop the `writeSave` tests)

**Interfaces:**
- Consumes: `newId`, `createStarterData`, `validateSaveFile`, `LoadResult`, `STORAGE_KEY`.
- Produces:
  - `combineLedgers(account: SaveFile, old: SaveFile, makeId: () => string = newId): SaveFile`
  - `resultFromRaw(raw: string | null): LoadResult` (`loadSave()` becomes a safe read of the key plus `resultFromRaw`)
  - `oldLedgerCounts(result: LoadResult): boolean`
  - `OLD_LEDGER_EVENT = "guild-ledger:old-ledger-changed"`
  - `forgetOldLedger(): void`, which removes `STORAGE_KEY` (in try/catch) and dispatches `OLD_LEDGER_EVENT` on `window`

- [ ] **Step 1: Write the failing tests** for `combineLedgers` (account = starter data, plus extras per test):
  - an old pouch with the same id as an account pouch → the account version is kept, with no duplicate;
  - old "pets" (expense, id A) and account "Pets" (expense, id B) → one pouch B, and old entries in A move to B;
  - an old pouch with the same id but a different type → added under the id from `makeId` (use a fake that returns `"new-1"`), and its entries point to `"new-1"`;
  - an old pouch with no match → added as is;
  - an old entry whose id already exists in the account → skipped; other entries are added;
  - logbook days are a union with no repeats; settings come from the account;
  - for every case above, `validateSaveFile(result)` is not null.
- [ ] **Step 2: Write the failing tests** for `oldLedgerCounts`:
  - `{kind:"empty"}` → false;
  - `corrupt` → true;
  - ok starter data → false;
  - ok starter data with `showRewards:false` → false;
  - ok starter data plus one transaction → true;
  - ok with "Lodging" renamed → true;
  - ok with one starter pouch deleted → true.
- [ ] **Step 3:** Run `npx vitest run lib/combineLedgers.test.ts lib/oldLedger.test.ts`. Expected: FAIL (modules not found).
- [ ] **Step 4:** Implement them. `oldLedgerCounts` compares pouches with `createStarterData().categories` using `JSON.stringify` of the arrays. Refactor `storage.ts` as described in Interfaces, and delete `writeSave` and its tests (nothing writes the old key any more).
- [ ] **Step 5:** Run `npm test`. Expected: every test passes. `npx tsc --noEmit` reports errors only in `lib/LedgerContext.tsx` (where `writeSave` was imported). Task 6 fixes those, so note them and continue.
- [ ] **Step 6:** Commit "Combine an old browser ledger into the account ledger" and push.

### Task 4: App state and the save queue

**Files:**
- Modify: `lib/appState.ts`, `lib/appState.test.ts` (rewrite for the new shape)
- Create: `lib/saveQueue.ts`, `lib/saveQueue.test.ts`

**Interfaces:**
- Consumes: `RemoteLoadResult`, `SaveResult` (Task 2), `ledgerReducer`, `LedgerAction`, `createStarterData`.
- Produces:

```ts
export type LedgerStatus = "no-config" | "signed-out" | "loading" | "unreachable" | "corrupt" | "ready";
export interface AppState {
  status: LedgerStatus; data: SaveFile; corruptRaw: string | null; version: number | null;
  dirty: boolean; saving: boolean; saveProblem: null | "offline" | "failed"; saveFailures: number;
  clashNotice: boolean; needsReload: boolean;
}
export type AppAction = LedgerAction
  | { type: "signedOut" } | { type: "loadStarted" } | { type: "loaded"; result: RemoteLoadResult }
  | { type: "saveStarted" } | { type: "saveFinished"; data: SaveFile; result: SaveResult }
  | { type: "retry" } | { type: "refreshRequested" } | { type: "dismissClash" } | { type: "startFresh" };
export function createInitialAppState(configured: boolean): AppState;
export function appReducer(state: AppState, action: AppAction): AppState;
// lib/saveQueue.ts
export function nextSave(state: AppState): { data: SaveFile; version: number | null } | null;
```

- [ ] **Step 1: Write the failing tests** (`appState.test.ts`), one `it` per rule:
  - Initial state: `"no-config"` when `configured` is false; otherwise `"loading"`.
  - `signedOut` → status `"signed-out"`, starter data, `version` null, `dirty` false.
  - `loadStarted` → `"loading"`, `needsReload` true.
  - `loaded` with `ok` → `"ready"` with that data and version, `dirty` false, `needsReload` false; with `empty` → starter data and `version` null; with `corrupt` → `"corrupt"`, `corruptRaw` and `version` set.
  - `loaded` with `offline` or `failed` while `"loading"` → `"unreachable"`. While `"ready"` → status and data unchanged, and `needsReload` stays true.
  - **Loading never sets `dirty`.**
  - A ledger action while `"ready"` that changes the data → `dirty` true. A refused action (`deleteCategory` on a pouch that has entries) → the same state object, `dirty` still false. A ledger action while not ready → ignored.
  - `saveFinished` with `saved`, where `data` is the current data → `version` updated, `dirty` false, `saving` false, `saveProblem` null. With older data (another change arrived meanwhile) → `version` updated, `dirty` still true.
  - `saveFinished` with `offline` → `saveProblem` `"offline"`, `saveFailures` +1, `dirty` true; same for `failed`.
  - `saveFinished` with `clash` → `clashNotice` true, `needsReload` true, `dirty` false.
  - `retry` → `saveProblem` null. While `"unreachable"` → status `"loading"` and `needsReload` true.
  - `refreshRequested` while ready, not dirty and not saving → `needsReload` true. **While `dirty` → unchanged.** *(Review Focus 2.)*
  - `dismissClash` → `clashNotice` false.
  - `startFresh` from `"corrupt"` → `"ready"`, starter data, `dirty` true, `version` kept.
- [ ] **Step 2: Write the failing tests** (`saveQueue.test.ts`):
  - `nextSave` returns `{data, version}` only when ready, dirty, not saving, `saveProblem` null and not `needsReload`. Otherwise it returns null (test each blocker).
  - **After `clash` then `loaded offline` → `nextSave` is null and `needsReload` is true.** *(Review Focus 3.)*
- [ ] **Step 3:** Run `npx vitest run lib/appState.test.ts lib/saveQueue.test.ts`. Expected: FAIL.
- [ ] **Step 4:** Implement both. Comment `saveFinished` explaining why `dirty` only clears when the saved data is still the current data (fast edits during a save).
- [ ] **Step 5:** Run `npm test`. Expected: every test passes. (Type errors are still expected only in `LedgerContext.tsx` and `LedgerGate.tsx`.)
- [ ] **Step 6:** Commit "Track saving, clashes and reloads in app state" and push.

### Task 5: Login logic and `AuthProvider`

**Files:**
- Create: `lib/authMessages.ts`, `lib/authMessages.test.ts`, `lib/AuthContext.tsx`
- Modify: `app/layout.tsx` (wrap `LedgerProvider` in `AuthProvider`)

**Interfaces:**
- Consumes: `getSupabase()`.
- Produces:

```ts
// lib/authMessages.ts
export const UNREACHABLE_MESSAGE = "Can't reach the guild archives. Check your signal and try again.";
export const RESET_SENT_MESSAGE = "If that email has an account, a reset link is on its way.";
export function validateLogin(email: string, password: string):
  { ok: true; email: string } | { ok: false; errors: { email?: string; password?: string } };
export function loginErrorMessage(error: { status?: number; name?: string; code?: string }): string;
export function validateNewPassword(password: string, confirm: string): string | null;
// lib/AuthContext.tsx
export type AuthStatus = "no-config" | "checking" | "signed-out" | "signed-in";
export interface AuthValue {
  status: AuthStatus; user: { id: string; email: string } | null; recovery: boolean;
  signIn(email: string, password: string): Promise<string | null>;      // null = success, else message
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<string | null>;           // redirectTo `${origin}/reset-password`
  updatePassword(password: string): Promise<string | null>;
}
export function AuthProvider(props: { children: React.ReactNode }): React.ReactNode;
export function useAuth(): AuthValue;
```

- [ ] **Step 1: Write the failing tests** (`authMessages.test.ts`):
  - `validateLogin("", "")` → errors "Enter your email." and "Enter your password.";
  - `validateLogin("  Me@Mail.com ", "pw")` → `{ok:true, email:"Me@Mail.com"}` *(Review Focus 4: trimmed; Supabase compares emails without regard to case)*;
  - `loginErrorMessage({status:0})` and `({name:"AuthRetryableFetchError"})` → `UNREACHABLE_MESSAGE`;
  - `({status:429})` and `({code:"over_request_rate_limit"})` → "Too many tries. Wait a few minutes and try again.";
  - `({status:400, code:"invalid_credentials"})` → "That email and password don't match.";
  - `validateNewPassword("short","short")` → "Use at least 8 characters.";
  - `("longenough","different1")` → "The two passwords don't match.";
  - `("longenough","longenough")` → null.
- [ ] **Step 2:** Run `npx vitest run lib/authMessages.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `authMessages.ts`.
- [ ] **Step 4:** Implement `AuthProvider`.
  - The initial status is `"no-config"` when `getSupabase()` is null; otherwise `"checking"`.
  - In an effect, call `getSession()` and subscribe with `onAuthStateChange`. State is set **inside those callbacks**, never synchronously in the effect body, because of the lint rule.
  - `recovery` starts as `openedFromRecoveryLink()`, and the `PASSWORD_RECOVERY` event also sets it true. (The event can fire before the subscription exists, so the startup check is what's relied on.)
  - `signIn` uses `signInWithPassword` and maps errors with `loginErrorMessage`.
  - `sendPasswordReset` returns `UNREACHABLE_MESSAGE` only on a network error, and null otherwise (whether or not the account exists).
- [ ] **Step 5:** Wrap the providers in `app/layout.tsx` as `AuthProvider > LedgerProvider > (NavBar, main > LedgerGate)`.
- [ ] **Step 6:** Run `npm test`. Expected: every test passes.
- [ ] **Step 7:** Commit "Add login logic and AuthProvider" and push.

### Task 6: `LedgerProvider` loads and saves online

**Files:**
- Modify: `lib/LedgerContext.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `appReducer`/`createInitialAppState(getSupabase() !== null)`, `nextSave`, `loadLedger`/`saveLedger`/`supabaseLedgerTable`.
- Produces: `useLedger()` returns `{ status, data, corruptRaw, dirty, saving, saveProblem, saveFailures, clashNotice, selectedMonth, setSelectedMonth, dispatch, startFresh, retry, dismissClash }`. `saveFailed` is removed and `saveProblem` replaces it.

- [ ] **Step 1:** Replace the three v1 effects with these:
  1. **Auth follows:** when `auth.status` becomes `"signed-in"` (or `user.id` changes), dispatch `loadStarted`. When it's `"signed-out"`, dispatch `signedOut`.
  2. **Reload:** when `needsReload` is true, a user is present and nothing is `saving`, call `loadLedger` and dispatch `loaded`. Ignore a stale result if the user changed (a `cancelled` flag in the cleanup).
  3. **Save:** when `nextSave(state)` isn't null, dispatch `saveStarted`, call `saveLedger` with that `{data, version}`, then dispatch `saveFinished` with the same `data`.
  4. **Retry and refresh:** on `window` `online`, dispatch `retry`. On `visibilitychange` to visible, dispatch `retry`, then `refreshRequested`.
  5. **Before closing:** while `dirty || saving`, add a `beforeunload` handler that calls `event.preventDefault()`.
- [ ] **Step 2:** Run `npx tsc --noEmit`. Expected: errors only in `components/LedgerGate.tsx` (fixed in Task 7). Run `npm test`. Expected: every test passes.
- [ ] **Step 3:** Commit "Load and save the ledger online in LedgerProvider" and push.

### Task 7: The login form, the gate and banners

**Files:**
- Create: `components/LoginForm.tsx`, `components/LoginForm.module.css`, `lib/useOldLedger.ts`
- Modify: `components/LedgerGate.tsx`, `components/LedgerGate.module.css`, `components/NavBar.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useLedger`, `validateLogin`, `RESET_SENT_MESSAGE`, `resultFromRaw`, `oldLedgerCounts`, `OLD_LEDGER_EVENT`, `STORAGE_KEY`.
- Produces:
  - `useOldLedger(): LoadResult`. It uses `useSyncExternalStore`: subscribe to `storage` and `OLD_LEDGER_EVENT`; the snapshot is the raw localStorage string (read in try/catch); the server snapshot is `null`. The parsed result is memoized on the raw string.
  - `LoginForm` (no props).

- [ ] **Step 1:** Build `LoginForm` inside a `PixelPanel` titled "Guild Gate".
  - It has email and password fields using the v1 `.field` classes, `aria-describedby` errors and `autoComplete` `email`/`current-password`.
  - The **Log in** button is disabled while sending.
  - **Forgot password?** is a quiet button that needs a valid email. Afterwards it always shows `RESET_SENT_MESSAGE` unless the device is unreachable.
  - Errors appear in a `role="alert"` paragraph.
- [ ] **Step 2:** Rewrite `LedgerGate` in this order:
  1. `pathname === "/reset-password"` → show the children.
  2. Auth `no-config` → panel "The guild archives aren't set up yet": "This copy of Guild Ledger isn't connected to Supabase. See 'Setting up accounts' in the README."
  3. `checking` → "Opening the guild gate…"
  4. `signed-out` → `LoginForm`.
  5. Ledger `loading` → "Opening the ledger…"
  6. `unreachable` → panel "Can't reach the guild archives" + **Try again** (`retry`).
  7. `corrupt` → the v1 panel (unchanged).
  8. `ready` → banners, the old-ledger notice, then the children.
- [ ] **Step 3:** Banners use the spec's copy word for word:
  - The offline and failed banners each have **Try again**, plus **Dismiss** using the v1 `dismissedAt`/`saveFailures` logic.
  - The clash banner has **Dismiss** (`dismissClash`).
  - The old-ledger notice (when `oldLedgerCounts(useOldLedger())`, not shown on `/hearth`) reads "This device has a ledger from before accounts. Visit Hearth to bring it in.", with "Hearth" as a link.
- [ ] **Step 4:** `NavBar` returns `null` unless `useAuth().status === "signed-in"`.
- [ ] **Step 5:** Run `npm test`, `npm run lint` and `npx tsc --noEmit`. Expected: all clean.
- [ ] **Step 6: Browser check** (Playwright, `npm run dev`, at 360px and 1280px):
  - Without the env vars in `.env.local`, every page shows the not-set-up panel and no nav.
  - With them: the login form shows; empty submit shows both errors; a wrong password shows "That email and password don't match."; with the browser offline, submitting shows `UNREACHABLE_MESSAGE`.
  - Tab focus rings are visible.
  - If the owner hasn't added the env vars yet, run only the first check and note it in the ledger.
- [ ] **Step 7:** Commit "Add the Guild Gate login and online-saving banners" and push.

### Task 8: Password reset page

**Files:**
- Create: `app/reset-password/page.tsx`, `app/reset-password/reset.module.css`

**Interfaces:**
- Consumes: `useAuth()` (`status`, `recovery`, `updatePassword`), `validateNewPassword`.

- [ ] **Step 1:** Build the page with a "Choose a new password" panel.
  - **With a recovery session** (`recovery` true and `status === "signed-in"`): show two password fields (`autoComplete="new-password"`), errors from `validateNewPassword`, and a submit button that calls `updatePassword`. On success: "Your password has been changed." with a link to the Guild Hall. On an error, show the message.
  - **Otherwise,** once `status` isn't `"checking"`: "This link has expired. Ask for a new one from the login page." with a link to `/`.
- [ ] **Step 2:** Run `npm run lint`, `npx tsc --noEmit` and `npm run build`. Expected: clean, and `/reset-password` is listed as static.
- [ ] **Step 3: Browser check:** opening `/reset-password` directly shows the expired message at 360px.
- [ ] **Step 4:** Commit "Add the password reset page" and push.

### Task 9: Hearth — account, log out and the old ledger

**Files:**
- Modify: `app/hearth/page.tsx`, `app/hearth/hearth.module.css`

**Interfaces:**
- Consumes: `useAuth()` (`user`, `signOut`), `useLedger()` (`data`, `dirty`, `saving`, `dispatch`), `useOldLedger`, `oldLedgerCounts`, `combineLedgers`, `forgetOldLedger`, `downloadText`.

- [ ] **Step 1:** Add a first panel, **"Your guild account"**, with "Logged in as <email>" and a **Log out** button. When `dirty || saving`, it first confirms "You have a change that isn't saved yet. Log out anyway?"
- [ ] **Step 2:** Replace the "Your data" text. The ledger is saved to the guild account online and every device you log in on shows the same ledger. A signal is needed to save changes. Download a backup now and then. Keep the download and restore buttons; a restore now saves to the account.
- [ ] **Step 3:** When `oldLedgerCounts(old)`, add the panel **"A ledger from before accounts"**, which explains that it was found in this browser:
  - **Add it to my account** (only when `old.kind === "ok"`): `dispatch({ type: "replaceAll", data: combineLedgers(data, old.data) })`, then `forgetOldLedger()`, then the notice "Your old ledger was added to your account."
  - **Download it:** `downloadText` with the backup (ok) or the damaged text (corrupt).
  - **Discard it:** confirm "Discard the old ledger in this browser? Download it first if you might want it.", then `forgetOldLedger()`.
- [ ] **Step 4:** Run `npm test`, `npm run lint` and `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 5: Browser check** (needs the env vars and a login; skip if unavailable and note it):
  - Seed `localStorage["guild-ledger:save"]` with a ledger that has one entry. The notice appears; **Add** moves the entry into the account; the notice disappears.
  - **Log out** returns to the Guild Gate.
- [ ] **Step 6:** Commit "Add account and old-ledger panels to Hearth" and push.

### Task 10: README, final checks and end-to-end

**Files:**
- Modify: `README.md` (the "Where your data is saved" and "Upgrading the storage later" sections, plus a new "Setting up accounts" section, and "Planned for later" gains offline mode)

- [ ] **Step 1:** Write **"Setting up accounts"** as a click-by-click guide:
  1. The SQL (already done).
  2. Add user with Auto Confirm.
  3. Turn off "Allow new users to sign up".
  4. URL Configuration: the Site URL and both redirect URLs.
  5. Copy the Project URL and Publishable key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  6. Add the same two to Vercel for Production and Preview, then redeploy.

  Include a warning box: never commit secrets, never give `DB_PASSWORD` or the secret key a `NEXT_PUBLIC_` name.
- [ ] **Step 2:** Rewrite "Where your data is saved": one ledger per account in Supabase, protected by RLS; online-only; backups are still recommended.
- [ ] **Step 3:** Run `npm test`, `npm run lint`, and a build with the env vars hidden. Expected: all pass. *(Review Focus 5.)*

```bash
mv .env.local .env.local.off && npm run build; mv .env.local.off .env.local
```

- [ ] **Step 4: End-to-end** (only if `TEST_LOGIN_EMAIL`/`TEST_LOGIN_PASSWORD` exist in `.env.local`; never print their values). Use Playwright against `npm run dev`:
  - log in; add an entry; reload, and the entry is still there;
  - open a second browser context, logged in, and edit in both so the second save clashes; the clash banner shows and the newest ledger is displayed;
  - go offline, add an entry, and the offline banner shows; go online and it saves (the banner clears);
  - log out.

  If the credentials are absent, list these as the owner's final checks in the report.
- [ ] **Step 5:** Commit "Document account setup and online saving" and push.
