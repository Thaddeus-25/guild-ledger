# Guild Ledger

A cozy pixel-art budgeting app. You run an adventurer's ledger: record the gold that comes in and goes out, sort it into Coin Pouches, set monthly limits, and see each month at a glance.

| In the app | Means |
|---|---|
| Gold | Money (shown in US dollars) |
| Guild Hall | Dashboard: the month's income, expenses, what's left, and pouch limits |
| Ledger | Your list of income and expense entries |
| Coin Pouches | Categories, with optional monthly spending limits |
| Hearth | Settings, backups, reset |
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

Everything is saved in your web browser's **localStorage**, under the key `guild-ledger:save`. To see it, open the browser's developer tools (F12) and go to **Application → Local Storage**.

That keeps the first version simple: no server, no account, nothing to pay for. It also has limits:

- **One browser on one device.** Your phone won't see what you entered on your laptop.
- **Clearing browsing data, or using a private window, removes it or hides it.**
- **It isn't encrypted.** Anyone using your computer account could read it.
- **There's room for about 5 MB**, which is years of entries.

So use **Hearth → Download backup** now and then. **Restore from backup** brings a backup file back.

### Upgrading the storage later

Only `lib/storage.ts` knows that localStorage exists. Every other file works with the `SaveFile` shape from `lib/types.ts`. To upgrade, you replace that one file:

1. **IndexedDB**, the browser's built-in database: more room, but still one device. A small library like Dexie makes it friendlier.
2. **A hosted database with sign-in**, such as Supabase (the Pocket Mochi project already uses it). Your ledger syncs across devices. This needs accounts, security rules so each person sees only their own data, and a way to move existing localStorage data across. The backup file is already in the right shape for that.

The saved data carries `version: 1`. If the shape ever changes, bump the version and add code that upgrades older saves, so nobody's ledger gets thrown away.

## How the code is organized

```
app/            pages: one folder per web address
  page.tsx        Guild Hall (/)
  ledger/         Ledger (/ledger), new entry (/ledger/new), edit entry (/ledger/[id])
  pouches/        Coin Pouches (/pouches)
  hearth/         Hearth (/hearth)
  layout.tsx      the frame around every page: fonts, nav bar, saved data
  globals.css     colors, buttons, form fields shared by every page
components/     reusable pieces: NavBar, PixelPanel, PixelIcon, BudgetBar, forms…
lib/            logic with no screen code, each file with its own .test.ts
  types.ts        the shape of the saved data
  money.ts        cents <-> "$12.50" (money is always stored as whole cents)
  dates.ts        "YYYY-MM-DD" date helpers (no time-zone surprises)
  budget.ts       monthly totals and pouch limits
  validation.ts   checks for the entry and pouch forms
  storage.ts      saving, loading, and checking saved data
  ledgerReducer.ts / appState.ts   every change to the data goes through these
  LedgerContext.tsx               shares the data with every page
docs/superpowers/ the design spec and the step-by-step build plan
```

## Planned for later

- **Quests:** savings goals with progress, for example "Save $500 for a new cloak".
- Different limits for different months, recurring entries, charts, and a night theme.
