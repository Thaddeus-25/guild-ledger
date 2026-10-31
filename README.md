# Guild Ledger

A cozy pixel-art budgeting app. You run an adventurer's ledger: record the gold that comes in and goes out, sort it into Coin Pouches, set monthly limits, and see each month at a glance.

| In the app | Means |
|---|---|
| Gold | Money (shown in US dollars) |
| Guild Hall | Dashboard: the month's income, expenses, what's left, and pouch limits |
| Ledger | Your list of income and expense entries |
| Coin Pouches | Categories, with optional monthly spending limits |
| Hearth | Your account and log out, settings, backups, reset |
| Logbook stamps / Guild rank | Optional rewards: one stamp per day you record an entry |

## Running it

You need [Node.js](https://nodejs.org) 22.12 or newer; a long-term-support version like 24 is best. Run these commands inside this folder.

```bash
npm install      # first time only: downloads the libraries
npm run dev      # starts the app at http://localhost:3000
```

Other commands:

```bash
npm test         # runs the automated tests (Vitest)
npm run lint     # checks the code for common mistakes
npm run build    # builds the optimized version you'd put on a website
```

If `npm run dev` says **"Another next dev server is already running"**, an old server is still open. Close that terminal, or run the `taskkill /PID … /F` command the message suggests.

## Where your data is saved

Your ledger is saved online in **Supabase** (the "guild archives"), in one row per account in a table called `ledgers`. Log in on any device and you see the same ledger.

- **Only you can read it.** The table has Row Level Security rules: a logged-in person can only read and change their own row, and logged-out visitors get nothing. The publishable key in the app is safe to share because of these rules.
- **You need a signal to save.** Without one, the app says "Can't reach the guild archives" and saves your change once the signal returns. Closing the app before then makes the browser ask "Leave site?". Working fully offline is planned for later.
- **Two devices at once.** Each save carries a version number. If another device saved first, the app loads the newest ledger and asks you to add your last change again, instead of overwriting anything.
- **Backups still matter.** Use **Hearth → Download backup** now and then. **Restore from backup** replaces your account's ledger with the file.

Before accounts, the ledger lived in each browser's localStorage. If a browser still has one, the app offers to **add it to your account** from Hearth (or download or discard it).

## Setting up accounts

Do this once. The app shows "The guild archives aren't set up yet" until steps 5–6 are done.

In the [Supabase dashboard](https://supabase.com/dashboard), in your project:

1. **Create the table.** SQL Editor → paste `supabase/schema.sql` → Run. *(Already done for pixel-ledger.)* Then do the same with each file in `supabase/migrations/`, in number order.
2. **Create your account.** Authentication → Users → **Add user → Create new user**. Enter your email and a password, and tick **Auto Confirm User**.
3. **Lock the door.** Authentication → Sign In / Providers → turn off **Allow new users to sign up**. There's no sign-up page in the app, so this stops strangers making accounts through the API.
4. **Tell Supabase where the app lives**, so password-reset emails link back to it. Authentication → URL Configuration:
   - **Site URL:** `https://guild-ledger-pixel.vercel.app`
   - **Redirect URLs:** add `https://guild-ledger-pixel.vercel.app/reset-password` and `http://localhost:3000/reset-password`
5. **Add the keys to `.env.local`** (in this folder). The **Connect** button at the top of the project shows both values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Restart `npm run dev` afterwards: Next.js reads `.env.local` only when it starts.
6. **Add the same two to Vercel.** Project → Settings → Environment Variables, ticked for **Production** and **Preview**. Then **redeploy**, because Next.js bakes `NEXT_PUBLIC_` values into the app when it builds.

> ⚠️ **Keep secrets secret.** `.env.local` is never committed (`.gitignore` covers it). Never put your database password or the **secret** (`sb_secret_…` / service_role) key in the app, and never give a secret a name starting with `NEXT_PUBLIC_`: those names are copied into the code every visitor downloads.

**Forgot your password?** Choose **Forgot password?** on the login page. Supabase emails a link to `/reset-password`, where you pick a new one. (Supabase's free email service only sends a few emails per hour.)

### Changing the database later

`supabase/schema.sql` records what was run. Put any later change in a new numbered file in `supabase/migrations/` and run it in the SQL Editor, so the history stays clear. The ledger JSON carries `version: 1`; if its shape ever changes, bump it and add code that upgrades older saves.

## How the code is organized

```
app/            pages: one folder per web address
  page.tsx        Guild Hall (/)
  ledger/         Ledger (/ledger), new entry (/ledger/new), edit entry (/ledger/[id])
  pouches/        Coin Pouches (/pouches)
  hearth/         Hearth (/hearth)
  layout.tsx      the frame around every page: fonts, nav bar, login, saved data
  reset-password/ choose a new password (from the reset email)
  globals.css     colors, buttons, form fields shared by every page
components/     reusable pieces: NavBar, PixelPanel, PixelIcon, BudgetBar, forms…
  BottomSheet.tsx   the slide-up panel used by the pickers
  DatePicker.tsx    Today / Yesterday / Other day… and the pixel calendar
  PouchPicker.tsx   the Coin Pouch list with icons and what's left
  AmountInput.tsx   the number pad with coin buttons
  PixelCheckbox.tsx the gold pixel checkbox
lib/            logic with no screen code, each file with its own .test.ts
  types.ts        the shape of the saved data
  money.ts        cents <-> "$12.50" (money is always stored as whole cents)
  dates.ts        "YYYY-MM-DD" date helpers (no time-zone surprises)
  budget.ts       monthly totals and pouch limits
  calendar.ts     the date picker's calendar maths (weeks start on Sunday)
  amountPad.ts    the number pad's rules (2 decimals, $1,000,000 cap)
  validation.ts   checks for the entry and pouch forms
  storage.ts      checking saved data; reading the old browser ledger
  remoteStore.ts  loading and saving in Supabase (with version checks)
  saveQueue.ts    one save at a time, always the newest data
  combineLedgers.ts  brings an old browser ledger into your account
  authMessages.ts / AuthContext.tsx   logging in and out
  supabaseClient.ts               the one connection to Supabase
  ledgerReducer.ts / appState.ts   every change to the data goes through these
  LedgerContext.tsx               shares the data with every page; loads and saves it
supabase/       the database setup (schema.sql)
docs/superpowers/ the design spec and the step-by-step build plan
```

## Pixel art rules

- **Pouch icons are 16×16**, drawn as text grids in `lib/icons.ts` (one letter per pixel, `.` for see-through). They're shown small (24–48px), where 16×16 stays crisp. Add new names to `ICON_NAMES` in `lib/types.ts`; `npm test` checks every grid's size and colors.
- **Bigger artwork uses 32×32 or larger**: the favicon, a future home-screen app icon, banners, rank badges and Quest trophies.
- **Never mix grid sizes side by side.** Icons from different grids have different-sized "pixels" and look like two art styles.
- Use the shared palette in `ICON_COLORS` so everything matches.

## Planned for later

- **Quests:** savings goals with progress, for example "Save $500 for a new cloak".
- **Working offline:** install it as an app on your phone, open it with no signal, and sync changes later.
- Different limits for different months, recurring entries, charts, and a night theme.
