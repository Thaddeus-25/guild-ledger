# Guild Ledger — Design (v1)

A personal budgeting web app with a cozy fantasy pixel-art theme, set in an adventurer's guild.

## Intent

- **Who it's for:** the owner, for their own money. They're also learning to program, so the code should be easy to read and is built in small steps that each get explained.
- **What "done" means for v1:** you can record income and expenses, sort them into categories with monthly limits, and see any month at a glance, in a theme that feels like a game but never shames spending or pushes you to spend.
- **Constraints:** TypeScript, React, Next.js (App Router). No bank connections, payments, accounts, or server. The only extra dependency is Vitest, used just for development. Nothing else gets added without asking.

## Scope

**In v1:**
- Add, edit, and delete income and expense transactions (amount, date, category, optional note)
- Create, rename, and delete categories, and set a monthly spending limit on expense categories
- For any month: total income, total expenses, and money remaining
- For each expense category: how much of its budget has been used
- Progress bars, pixel icons, encouraging clerk messages
- Optional rewards (Logbook stamps and Guild rank) that can be turned off
- Backup export/import as a JSON file, and resetting all data

**Not in v1:** savings Quests (planned for v2), bank connections, payments, user accounts and sync, recurring transactions, multiple currencies, limits that differ by month, charts, dark theme.

## Vocabulary

Game names show up in titles and headings. Plain wording sits right next to them wherever money is involved.

| In the app | Means |
|---|---|
| Gold | Money (always displayed as US dollars, e.g. `$12.50`) |
| Guild Hall | Dashboard |
| Ledger / entry | Transaction list / a transaction |
| Coin Pouch | Category |
| Pouch limit | Monthly spending limit for a category |
| Hearth | Settings |
| Logbook stamp / Guild rank | Optional reward for recording entries |

## Navigation

A top nav bar (on narrow screens, a bottom bar) with four tabs:

1. **Guild Hall** (`/`): month picker; three summary cards (Gold earned, Gold spent, Gold remaining); a budget bar for each expense pouch that has a limit; a clerk message; the 5 most recent entries of the month; a "Record entry" button.
2. **Ledger** (`/ledger`): month picker; the month's entries, newest date first; filter by All / Income / Expense; Edit and Delete on each row; a "Record entry" button.
   - `/ledger/new`: new entry form
   - `/ledger/[id]`: edit entry form (same form, pre-filled). If the id doesn't exist, it shows "This entry couldn't be found" and a link back.
3. **Coin Pouches** (`/pouches`): income pouches and expense pouches in two lists; add, rename, change icon, set or clear limit, delete.
4. **Hearth** (`/hearth`): rewards on/off; download backup; restore from backup; reset all data.

The selected month is shared between Guild Hall and Ledger. It lives in app state and isn't saved, so it starts at the current month on every visit.

## Data model

```ts
type EntryType = "income" | "expense";

interface Category {
  id: string;                 // crypto.randomUUID()
  name: string;               // 1–30 chars, unique (ignoring case) among pouches of the same type
  type: EntryType;            // fixed once created
  icon: IconName;
  monthlyLimitCents?: number; // expense pouches only; undefined = no limit; must be > 0 if set
}

interface Transaction {
  id: string;
  type: EntryType;
  amountCents: number;        // positive integer, max 100,000,000 ($1,000,000.00)
  date: string;               // "YYYY-MM-DD", local calendar date
  categoryId: string;         // must point to a Category with the same type
  note?: string;              // up to 200 chars; empty string is stored as undefined
}

interface SaveFile {
  version: 1;
  categories: Category[];
  transactions: Transaction[];
  logbookDays: string[];      // unique "YYYY-MM-DD" dates when an entry was recorded
  settings: { showRewards: boolean };
}
```

**Relationships:** one Category has many Transactions, linked by `categoryId`. Totals, budget usage, and rank are always calculated from this data and never stored.

**Rules:**
- Money is always stored as whole cents. Converting to and from text like "12.50" only happens in `lib/money.ts`.
- Dates are stored as text and compared as text. A transaction's month is `date.slice(0, 7)`. Never call `new Date("YYYY-MM-DD")`: it reads the date as UTC and can land on the wrong day.
- A pouch's type can't change after it's created.
- A pouch that has transactions can't be deleted. The app shows "N entries use this pouch. Move or delete them first, or rename the pouch instead."
- If an entry's type is changed in the form, the category choice is cleared when it no longer matches.

**Starter pouches** (on first run, all with no limits):
- Income: Wages (coin), Other Income (gem)
- Expense: Provisions (bread), Lodging (house), Travel (boot), Tavern (mug), Supplies (potion), Other (scroll)

**Icons:** coin, gem, bread, house, boot, mug, potion, scroll, chest, heart, book, sword. Each is a 16×16 pixel SVG defined in code.

## Calculations (`lib/budget.ts`, pure functions)

For a month `YYYY-MM`:
- `incomeCents` = sum of income amounts in that month
- `expenseCents` = sum of expense amounts in that month
- `remainingCents` = `incomeCents − expenseCents`. This can be negative; the card then reads "Over by $X" in amber, never "−$X" in red.

For each expense pouch that has a limit:
- `spentCents` = sum of that pouch's expenses in the month
- `leftCents` = `limit − spent` (negative means over)
- `percent` = `spent / limit`, kept unrounded for comparisons
- `status`:
  - `under` if percent < 0.8
  - `near` if 0.8 ≤ percent < 1
  - `at` if spent = limit
  - `over` if spent > limit

Expense pouches without a limit appear in a separate "No limit set" list showing only the amount spent.

**Budget bar:** filled to `min(percent, 1)` in 10 segments. The label always spells out the numbers: "$45.00 of $200.00 used · $155.00 left", or "Over by $12.40". Colors: moss green for under and near, gold for at, amber for over. Color is never the only signal. The bar has `role="progressbar"` with matching aria values.

## Saving data (`lib/storage.ts`)

- **Mechanism:** browser `localStorage`, under the key `guild-ledger:save`, as JSON.
- **Load:** runs once, on the client, after the page first appears (in `useEffect`).
  - Missing data → create the starter data.
  - Valid data → use it.
  - Corrupt or unrecognized data → don't overwrite it. Show a recovery panel with "Download the damaged data" and "Start fresh".
- **Save:** happens after every change, but only once loading has finished. This prevents the empty starting state from overwriting real data. If saving fails (for example, storage is full or blocked), show a non-blocking warning.
- **Validation:** `validateSaveFile(unknown)` checks the shape, version, types, and that every `categoryId` exists. Both loading and backup restore use it.
- **Backup:** "Download backup" saves `guild-ledger-backup-YYYY-MM-DD.json`. "Restore" reads a file, validates it, asks for confirmation ("This replaces all current data"), then replaces the data.
- **Reset:** asks for confirmation, then goes back to the starter data and an empty logbook.

**Limitations (explained to the user in Hearth):**
- Data lives in one browser on one device.
- Clearing site data, or using a private window, removes it or hides it.
- It isn't encrypted.
- Storage is about 5 MB.

**Upgrade path:** everything outside `lib/storage.ts` uses the `SaveFile` shape through `LedgerContext`. Moving to IndexedDB, or to Supabase with sign-in and sync, only means replacing `storage.ts` and the load/save calls.

## State (`lib/LedgerContext.tsx`)

- A client-side React Context wraps the app in `app/layout.tsx`.
- It uses `useReducer` with these actions: `loaded`, `addTransaction`, `updateTransaction`, `deleteTransaction`, `addCategory`, `updateCategory`, `deleteCategory`, `setShowRewards`, `replaceAll`.
- The reducer never mutates state in place; it always returns new arrays and objects.
- It exposes `{ status: "loading" | "ready" | "error", data, selectedMonth, setSelectedMonth, dispatch helpers }`.
- Until `status === "ready"`, pages show a small "Opening the ledger…" placeholder.

## Forms

- **TransactionForm** (used for both new and edit) has these fields:
  - Type: income/expense toggle
  - Amount: text input with `inputMode="decimal"`
  - Date: `<input type="date">`, defaulting to today's local date
  - Pouch: a select showing only pouches of the chosen type
  - Note
- **Amount parsing:**
  - Accepts `12`, `12.5`, `12.50`, `1,234.50`, `$12.50`.
  - Rejects empty, zero, negative, more than 2 decimals, and anything non-numeric.
- **Validation:** runs on submit. Each problem shows next to its field. Input is kept, never cleared, when there's an error.
- **After saving:** go back to the page that opened the form.
- **CategoryForm** has these fields:
  - Name
  - Type (only when creating a pouch)
  - Icon picker
  - Limit (optional; expense pouches only)

## Rewards (optional)

- When a new transaction is added (not edited), today's local date goes into `logbookDays` if it isn't there already. That's one stamp per day of recording.
- Ranks by stamp count:

  | Stamps | Rank |
  |---|---|
  | 0 | Wanderer |
  | 3 | Apprentice Scribe |
  | 10 | Journeyman Scribe |
  | 25 | Keeper of Coin |
  | 50 | Guild Treasurer |
  | 100 | Master of the Ledger |

- Stamps never decrease when entries are deleted. There are no streaks and no penalties for missed days.
- Turning off `showRewards` hides the rank badge and stamp count. It doesn't erase anything.

## Clerk messages (`lib/clerk.ts`)

The first rule that matches picks the message:
1. No entries this month → "A fresh page in the ledger. Record your first entry when you're ready."
2. Any pouch over its limit → "{Pouch} is past its limit this month. Want to look over its entries or adjust the limit?" (names the first such pouch)
3. An entry was recorded today → "Thanks for keeping the ledger. Every entry makes the map clearer."
4. Otherwise, one line from a short list of neutral encouragements, picked by day of month. For example: "A steady ledger is a trusty companion." or "Knowing where your gold goes is half the journey."

**Tone rules:** never scold, never imply spending is good or bad, and never suggest spending leftover gold.

## Visual design

- **Palette** (CSS custom properties in `app/globals.css`):

  | Token | Hex | Used for |
  |---|---|---|
  | parchment | `#f4e4c1` | panels |
  | ink | `#2b1d14` | text |
  | wood | `#6b4226` | nav, borders |
  | wood-dark | `#3e2614` | darker wood |
  | gold | `#e8b33a` | money |
  | moss | `#5e8c3a` | progress |
  | amber | `#d9822b` | over limit |
  | night | `#1f2a44` | page background, with a faint tiled pattern from CSS gradients |

- **Panels:** "stepped" pixel borders made with layered `box-shadow`, and no rounded corners.
- **Fonts** (via `next/font/google`):
  - Pixelify Sans: headings, tab labels, and buttons
  - Atkinson Hyperlegible: body text and all amounts, with tabular numbers
- **Icons:** SVG `<rect>` grids with `shape-rendering="crispEdges"`, drawn at 2× or 3× size.
- **Motion:** buttons depress 2px when pressed, and budget bars fill segment by segment. Both are turned off under `prefers-reduced-motion`.
- **Accessibility:**
  - Every input has a label
  - Focus outlines stay visible
  - Text contrast is at least 4.5:1
  - Tap targets are at least 44px
- **Layout:** works from 360px wide upward.
- **Styling:** CSS Modules, one `.module.css` per component, plus `globals.css`. No Tailwind.

## File layout

```
app/        layout.tsx, page.tsx, globals.css, ledger/page.tsx, ledger/new/page.tsx,
            ledger/[id]/page.tsx, pouches/page.tsx, hearth/page.tsx
components/ NavBar, MonthPicker, SummaryCard, BudgetBar, TransactionForm, TransactionList,
            CategoryForm, PixelIcon, ClerkMessage, PixelPanel (each .tsx + .module.css)
lib/        types.ts, money.ts, dates.ts, budget.ts, storage.ts, clerk.ts, ranks.ts,
            LedgerContext.tsx, starterData.ts
```

## Testing

- **Vitest unit tests** cover:
  - `money.ts`: parsing and formatting
  - `dates.ts`: today's local date, month keys, previous/next month
  - `budget.ts`: totals, per-pouch usage, the status boundaries 0.8, 1, and over, and negative remaining
  - `storage.ts`'s `validateSaveFile`
  - `ranks.ts`
  - the reducer
- **By hand, after each step:** run the app with `npm run dev` and check the step's feature in the browser. This includes reloading the page to confirm data persists.

## Build order

1. Scaffold the Next.js project
2. Theme, layout, nav, and placeholder pages
3. Types and money/date helpers, with tests
4. Storage and LedgerContext, with starter data
5. Coin Pouches page
6. New-entry form
7. Ledger list, edit, and delete
8. Budget calculations, with tests
9. Guild Hall dashboard
10. Pixel icons and bar polish
11. Clerk messages
12. Logbook stamps and ranks
13. Hearth: backup, restore, reset
