# Guild Ledger v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user budgeting web app with a cozy pixel-art guild theme. The app records income and expenses, sorts them into categories ("pouches") with monthly limits, and shows how each month is going.

**Architecture:**
- Next.js App Router. Every page is a client component that reads one React Context (`LedgerContext`).
- The context holds a `SaveFile`, changes it through a pure reducer, and mirrors it to `localStorage`.
- Budget math, validation, ranks, and clerk messages are pure functions in `lib/`, covered by Vitest.

**Tech Stack:** Next.js (latest, App Router, Turbopack), React, TypeScript, CSS Modules, `next/font/google`, and Vitest (dev only).

**Spec:** `docs/superpowers/specs/2026-10-29-guild-ledger-design.md`

## Global Constraints

- **Dependencies:** only `next`, `react`, `react-dom`, TypeScript and ESLint tooling from create-next-app, and `vitest`. No other packages.
- **Styling:**
  - CSS Modules (one `Component.module.css` per component) plus `app/globals.css`. No Tailwind, no `src/` folder, import alias `@/*`.
  - Palette tokens: parchment `#f4e4c1`, ink `#2b1d14`, wood `#6b4226`, wood-dark `#3e2614`, gold `#e8b33a`, moss `#5e8c3a`, amber `#d9822b`, night `#1f2a44`.
  - Fonts: Pixelify Sans for headings, tabs, and buttons; Atkinson Hyperlegible for body text and every amount, with tabular numbers.
- **Money:**
  - Stored as integer cents. Displayed with `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`.
  - A negative remainder is shown as "Over by $X" in amber, never as "−$X" or in red.
- **Dates:** stored as `"YYYY-MM-DD"` local dates; a date's month is `date.slice(0, 7)`. Never call `new Date("YYYY-MM-DD")`.
- **Storage:** `localStorage`, key `guild-ledger:save`. Nothing is written until loading has finished.
- **Copy:** never scold, never say spending is good or bad, and never suggest spending leftover gold. Game names always appear with a plain-language label next to them.
- **Accessibility:**
  - Every input has a `<label>`, and focus outlines stay visible.
  - Text contrast is at least 4.5:1, and tap targets are at least 44px.
  - Layout works from 360px wide upward.
  - Motion is turned off under `prefers-reduced-motion`.
- **Commits:** none of them has a Co-Authored-By trailer.
- **Teaching:** this is built with a learner. Each task is presented with a plain-language explanation, the file each change goes in, and the beginner mistakes that task avoids.

## Review Focus

1. **Reloading right after the app opens must not wipe saved data.** This is the classic trap where the initial empty state gets saved before loading finishes. Covered by the manual reload check in Task 4 (Step 6).
2. **Amounts like `19.99` must store as exactly `1999`.** Multiplying the float by 100 gives 1998.9999…. Covered by a test in Task 3.
3. **Entries dated on the first or last day of a month must count toward that month.** Using `new Date(...)` in UTC shifts them into the neighboring month. Covered by tests in Tasks 3 and 8.
4. **An entry can't be saved with a pouch of the other type.** For example, the type is switched to income after an expense pouch was chosen. Covered by a test in Task 6.
5. **Restoring a broken or wrong-shaped backup file must show an error and leave current data untouched.** Covered by `validateSaveFile` tests in Task 4 and the manual check in Task 13.

---

### Task 1: Create the Next.js project

**Files:**
- Create: the whole create-next-app scaffold in `C:\Users\thadd\projects\guild-ledger` (it already contains `docs/` and `.git`, both of which create-next-app allows)

- [ ] **Step 1:** Run `npx create-next-app@latest --help` to confirm the current flags.
- [ ] **Step 2:** Scaffold into `.` with TypeScript, ESLint, App Router, no Tailwind, no `src` dir, alias `@/*`, npm, and Turbopack. Answer "No" to the React Compiler and any other optional extras. Use `--yes` or explicit flags so there are no interactive prompts.
- [ ] **Step 3:** Run `npm run dev`. Expected: the starter page loads at http://localhost:3000.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "Scaffold Next.js app"`.

### Task 2: Theme, layout, nav, placeholder pages

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Delete: `app/page.module.css`, and the starter SVGs in `public/` that are no longer used
- Create: `app/ledger/page.tsx`, `app/pouches/page.tsx`, `app/hearth/page.tsx`
- Create: `components/NavBar.tsx` + `.module.css`, `components/PixelPanel.tsx` + `.module.css`

**Interfaces:**
- Produces:
  - `PixelPanel({ title?: string; children: React.ReactNode; className?: string })`: a parchment panel with a stepped pixel border; when given, the title is an `<h2>`.
  - `NavBar()`: four links with labels "Guild Hall", "Ledger", "Coin Pouches", "Hearth". The active tab comes from `usePathname()` and gets `aria-current="page"`.
  - CSS variables `--parchment --ink --wood --wood-dark --gold --moss --amber --night` and font variables `--font-pixel` and `--font-body`.

- [ ] **Step 1:** Load the two fonts in `layout.tsx` with `next/font/google`, exposed as CSS variables. Set `<html lang="en">`, and set the metadata title to "Guild Ledger".
- [ ] **Step 2:** In `globals.css`, write the tokens and base styles:
  - the night background with a faint tiled pattern
  - body font
  - headings in the pixel font
  - a visible `:focus-visible` outline
  - a `prefers-reduced-motion` block
- [ ] **Step 3:** Build `NavBar`.
  - At 640px and wider it's a wooden top bar.
  - Narrower, it's fixed to the bottom, and `main` gets bottom padding so content isn't hidden behind it.
- [ ] **Step 4:** Build `PixelPanel`. The stepped border uses layered `box-shadow` and no `border-radius`.
- [ ] **Step 5:** Give each page a `PixelPanel` with its game title and plain subtitle:
  - "Guild Hall": "Your month at a glance"
  - "The Ledger": "Your income and expense entries"
  - "Coin Pouches": "Your categories and monthly limits"
  - "Hearth": "Settings and backups"
- [ ] **Step 6:** Check with `npm run dev`:
  - All four tabs navigate, and the active one is highlighted.
  - At 360px wide the nav sits at the bottom with no horizontal scroll.
  - `npm run lint` passes.
- [ ] **Step 7:** Commit: "Add theme, nav and placeholder pages".

### Task 3: Types, money and date helpers

**Files:**
- Modify: `package.json` (add the dev dependency `vitest` and the script `"test": "vitest run"`)
- Create: `lib/types.ts`, `lib/money.ts`, `lib/dates.ts`
- Test: `lib/money.test.ts`, `lib/dates.test.ts`. Tests use relative imports, so Vitest needs no config.

**Interfaces:**
- Produces, in `lib/types.ts`:
  - `EntryType = "income" | "expense"`
  - `ICON_NAMES = ["coin","gem","bread","house","boot","mug","potion","scroll","chest","heart","book","sword"] as const`, and `IconName = (typeof ICON_NAMES)[number]`
  - the `Category`, `Transaction`, and `SaveFile` interfaces exactly as in the spec's Data model
- Produces, in `lib/money.ts`:
  - `MAX_AMOUNT_CENTS = 100_000_000`
  - `parseAmount(input: string): { ok: true; cents: number } | { ok: false; error: string }`
  - `formatCents(cents: number): string`
  - `centsToInput(cents: number): string` (1250 → `"12.50"`)
- Produces, in `lib/dates.ts`:
  - `todayISO(now?: Date): string`
  - `monthOf(date: string): string`
  - `shiftMonth(month: string, delta: number): string`
  - `formatMonth(month: string): string` (`"2026-10"` → `"October 2026"`)
  - `formatDay(date: string): string` (`"2026-10-05"` → `"Oct 5"`)

- [ ] **Step 1:** Write the failing tests.

```ts
// money.test.ts
expect(parseAmount("12")).toEqual({ ok: true, cents: 1200 });
expect(parseAmount("12.5")).toEqual({ ok: true, cents: 1250 });
expect(parseAmount("$1,234.50")).toEqual({ ok: true, cents: 123450 });
expect(parseAmount(" 7 ")).toEqual({ ok: true, cents: 700 });
expect(parseAmount("19.99")).toEqual({ ok: true, cents: 1999 });   // float trap
expect(parseAmount("")).toEqual({ ok: false, error: "Enter an amount." });
expect(parseAmount("abc")).toEqual({ ok: false, error: "Use numbers only, like 12.50." });
expect(parseAmount("-5")).toEqual({ ok: false, error: "Use numbers only, like 12.50." });
expect(parseAmount("0")).toEqual({ ok: false, error: "Amount must be more than $0." });
expect(parseAmount("12.345")).toEqual({ ok: false, error: "Use at most 2 decimal places." });
expect(parseAmount("1000000.01")).toEqual({ ok: false, error: "Amount must be $1,000,000.00 or less." });
expect(formatCents(123450)).toBe("$1,234.50");
expect(formatCents(5)).toBe("$0.05");
expect(centsToInput(1250)).toBe("12.50");

// dates.test.ts
expect(todayISO(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
expect(monthOf("2026-10-31")).toBe("2026-10");
expect(shiftMonth("2026-01", -1)).toBe("2025-12");
expect(shiftMonth("2026-12", 1)).toBe("2027-01");
expect(formatMonth("2026-10")).toBe("October 2026");
expect(formatDay("2026-10-05")).toBe("Oct 5");
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL, because the modules don't exist yet.
- [ ] **Step 3:** Implement the helpers.
  - `parseAmount`: trim the input, strip `$` and `,`, and match `/^\d+(\.\d+)?$/`. Then split on `.` and build the cents from the whole part and the fraction padded to 2 digits, using integer math only.
  - Date functions: build dates with `new Date(y, m - 1, d)` (local time) and format with `toLocaleDateString("en-US", …)`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: "Add data types and money/date helpers".

### Task 4: Storage, reducer, and LedgerContext

**Files:**
- Create: `lib/starterData.ts`, `lib/storage.ts`, `lib/ledgerReducer.ts`, `lib/LedgerContext.tsx`, `components/LedgerGate.tsx` + `.module.css`
- Modify: `app/layout.tsx` (wrap `children` in `<LedgerProvider><LedgerGate>…`)
- Test: `lib/storage.test.ts`, `lib/ledgerReducer.test.ts`

**Interfaces:**
- Consumes: the types from Task 3, `todayISO`, `monthOf`
- Produces:
  - `createStarterData(): SaveFile`
    - pouches as in the spec: Wages/coin and Other Income/gem; Provisions/bread, Lodging/house, Travel/boot, Tavern/mug, Supplies/potion, Other/scroll
    - no limits, no transactions, `logbookDays: []`, `showRewards: true`
  - `STORAGE_KEY = "guild-ledger:save"`
  - `validateSaveFile(value: unknown): SaveFile | null`
  - `loadSave(): { kind: "empty" } | { kind: "ok"; data: SaveFile } | { kind: "corrupt"; raw: string }`
  - `writeSave(data: SaveFile): boolean` (returns false if `setItem` throws)
  - `LedgerAction`: a union of
    - `addTransaction{transaction, today}`
    - `updateTransaction{transaction}`
    - `deleteTransaction{id}`
    - `addCategory{category}`
    - `updateCategory{category}`
    - `deleteCategory{id}`
    - `setShowRewards{value}`
    - `replaceAll{data}`
  - `ledgerReducer(state: SaveFile, action: LedgerAction): SaveFile`
  - `entriesInPouch(transactions: Transaction[], categoryId: string): number`
  - `useLedger()` returns `{ status: "loading" | "ready" | "corrupt"; data; corruptRaw: string | null; saveFailed: boolean; selectedMonth; setSelectedMonth; dispatch; startFresh(): void }`. It throws "useLedger must be used inside LedgerProvider" when used outside the provider.

- [ ] **Step 1:** Write the failing tests.
  - `validateSaveFile` returns:
    - a non-null result for `createStarterData()`
    - null for `null`, `"x"`, `{}`, and `{...starter, version: 2}`
    - null for a transaction whose `categoryId` is unknown
    - null for `amountCents: 12.5`
    - null for a date that doesn't match `/^\d{4}-\d{2}-\d{2}$/`
    - null for a transaction whose type differs from its pouch's type
  - Reducer, `addTransaction` with `today: "2026-10-29"`:
    - adds the entry and adds `"2026-10-29"` to `logbookDays`
    - a second add on the same day doesn't duplicate the day
  - Reducer, `deleteTransaction`: doesn't change `logbookDays`.
  - Reducer, `deleteCategory` on a pouch with entries: returns state unchanged (`toBe(state)`).
  - The reducer never mutates the previous state: a deep-frozen state passes all actions without throwing.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `starterData`, `storage`, and `ledgerReducer`. `loadSave` treats anything `JSON.parse` rejects, or `validateSaveFile` rejects, as `corrupt`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Implement `LedgerContext` and `LedgerGate`.
  - **Context:**
    - Uses `useReducer(ledgerReducer, createStarterData())` and `status` in `useState("loading")`.
    - A load `useEffect` with `[]` dependencies calls `loadSave()`:
      - `empty`: dispatch `replaceAll` with the starter data and set status to ready
      - `ok`: dispatch `replaceAll` with the saved data and set status to ready
      - `corrupt`: keep `corruptRaw` and set status to `corrupt`
    - A save `useEffect` on `[data, status]` calls `writeSave` **only when status is `ready`**, and sets `saveFailed` from the result.
    - `selectedMonth` starts at `monthOf(todayISO())`.
  - **Gate:**
    - `loading`: shows "Opening the ledger…"
    - `corrupt`: shows a recovery panel with "Download the damaged data" (a Blob download of `corruptRaw`) and "Start fresh" (confirm, then `startFresh`)
    - `ready`: renders the children, plus a dismissible banner when `saveFailed`: "Couldn't save to this browser. Download a backup from Hearth to keep your data safe."
- [ ] **Step 6:** Check by hand in the browser:
  - In DevTools → Application → Local Storage, the key holds the starter JSON after the first load.
  - Reloading keeps it.
  - Setting the value to `garbage` and reloading shows the recovery panel and doesn't overwrite the value.
- [ ] **Step 7:** Commit: "Add storage, reducer and ledger context".

### Task 5: Coin Pouches page and pixel icons

**Files:**
- Create: `lib/validation.ts`, `components/PixelIcon.tsx`, `components/CategoryForm.tsx` + `.module.css`
- Modify: `app/pouches/page.tsx`
- Test: `lib/validation.test.ts`

**Interfaces:**
- Consumes: `useLedger`, `entriesInPouch`, `parseAmount`, `formatCents`, `centsToInput`, `ICON_NAMES`
- Produces:
  - `CategoryInput = { name: string; type: EntryType; icon: IconName; limit: string }`
  - `validateCategoryInput(input: CategoryInput, categories: Category[], editingId?: string): { ok: true; value: Omit<Category, "id"> } | { ok: false; errors: { name?: string; limit?: string } }`
  - `PixelIcon({ name: IconName; size?: number /* px, default 32 */; label?: string })`: `aria-hidden` unless `label` is given
  - `CategoryForm({ type: EntryType; initial?: Category; onDone: () => void })`

- [ ] **Step 1:** Write the failing tests for `validateCategoryInput`.
  - Name errors:
    - `""` → `name: "Give the pouch a name."`
    - 31 characters → `"Keep the name to 30 characters or fewer."`
    - `"provisions"` (expense) → `"You already have a pouch called Provisions."`
  - Duplicates:
    - the same name passes when `editingId` is that pouch's own id
    - the same name is allowed for the other type
  - Limits:
    - `"abc"` gives the `parseAmount` error under `limit`
    - `""` gives `monthlyLimitCents: undefined`
    - for an income pouch, the limit is always `undefined`
  - The name is trimmed.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `validateCategoryInput`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Implement `PixelIcon`.
  - Each icon is a 16-row array of 16-character strings. Each character maps to a palette color, and `.` means transparent.
  - Each colored pixel renders as a `<rect>`, in an SVG with `viewBox="0 0 16 16"` and `shape-rendering="crispEdges"`.
  - Draw all 12 icons.
- [ ] **Step 6:** Implement `CategoryForm` and the pouches page.
  - The page has two `PixelPanel`s: "Income pouches" and "Expense pouches".
  - Each pouch row shows its icon, its name, and its limit, or "No limit". It has Edit and Delete buttons.
  - "Add pouch" opens the form inside the panel.
  - The form uses controlled inputs, and the icon picker is a radio group of icons.
  - On a validation error, the form keeps its input and shows the error under the field.
  - Delete:
    - if `entriesInPouch > 0`, shows "N entries use this pouch. Move or delete them first, or rename the pouch instead."
    - otherwise, `confirm` and then dispatch
- [ ] **Step 7:** Check in the browser: add, rename, set a limit, clear a limit, try a duplicate name, delete, then reload. Everything should persist.
- [ ] **Step 8:** Commit: "Add Coin Pouches page and pixel icons".

### Task 6: New entry form

**Files:**
- Modify: `lib/validation.ts`, `lib/validation.test.ts`
- Create: `components/TransactionForm.tsx` + `.module.css`, `app/ledger/new/page.tsx`

**Interfaces:**
- Produces:
  - `TransactionInput = { type: EntryType; amount: string; date: string; categoryId: string; note: string }`
  - `validateTransactionInput(input: TransactionInput, categories: Category[]): { ok: true; value: Omit<Transaction, "id"> } | { ok: false; errors: { amount?: string; date?: string; categoryId?: string; note?: string } }`
  - `TransactionForm({ initial?: Transaction; onSaved: () => void })`
    - new entries get `id = crypto.randomUUID()` and dispatch `addTransaction` with `today: todayISO()`
    - edits dispatch `updateTransaction` and keep the id

- [ ] **Step 1:** Write the failing tests.
  - A valid input gives `{ ok: true }`, with `amountCents` set and an empty note becoming `undefined`.
  - Errors:
    - a bad amount gives the `parseAmount` error
    - `date: ""` gives `"Pick a date."`
    - a missing `categoryId` gives `"Choose a pouch."`
    - **an expense pouch with `type: "income"` gives `"Choose a pouch."`**
    - a 201-character note gives `"Keep the note to 200 characters or fewer."`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `validateTransactionInput`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Implement `TransactionForm`.
  - All fields are controlled.
  - The type is an Income/Expense toggle. Switching it clears `categoryId` if the chosen pouch no longer matches.
  - Amount uses `inputMode="decimal"`. Date uses `type="date"` and defaults to `todayISO()`.
  - Submit calls `event.preventDefault()`.
  - Errors appear under each field, linked with `aria-describedby`.
  - `app/ledger/new/page.tsx` renders the form, with `onSaved = router.back()`.
- [ ] **Step 6:** Check in the browser:
  - Submitting empty shows errors and keeps your input.
  - A valid entry saves and returns to the previous page.
  - DevTools shows the entry, with `amountCents` as an integer.
- [ ] **Step 7:** Commit: "Add new entry form".

### Task 7: Ledger list, edit and delete

**Files:**
- Create: `components/MonthPicker.tsx` + `.module.css`, `components/TransactionList.tsx` + `.module.css`, `app/ledger/[id]/page.tsx`
- Modify: `app/ledger/page.tsx`

**Interfaces:**
- Produces:
  - `MonthPicker()`: "◀ October 2026 ▶". Prev/next buttons call `setSelectedMonth(shiftMonth(m, ±1))`, and the buttons have the aria-labels "Previous month" and "Next month".
  - `TransactionList({ transactions: Transaction[]; showActions: boolean })`
    - Each row shows the pouch icon, the pouch name, `formatDay(date)`, the note, and the amount.
    - Amounts are prefixed "+" for income and "−" for expense, and the type is also written as text.
    - With `showActions`, rows get Edit (a link to `/ledger/[id]`) and Delete (confirm, then dispatch).
    - An empty list shows "No entries this month yet."
- [ ] **Step 1:** Ledger page.
  - It shows `MonthPicker`, a filter (All / Income / Expense radio buttons), "Record entry" (a link to `/ledger/new`), and a `TransactionList`.
  - The list holds the selected month's entries, sorted by date descending. Entries with the same date stay in insertion order, newest first.
- [ ] **Step 2:** The edit page reads the id with `useParams<{ id: string }>()`.
  - If the entry is found, it renders `TransactionForm` with `initial`.
  - If not, it shows "This entry couldn't be found." with a link back to the Ledger.
- [ ] **Step 3:** Check in the browser:
  - Add entries in two different months, and switch months.
  - Filter the list.
  - Edit an amount, and delete with a confirmation.
  - Visit `/ledger/nope`.
  - Reload, and everything persists.
- [ ] **Step 4:** Commit: "Add ledger list with edit and delete".

### Task 8: Budget calculations

**Files:**
- Create: `lib/budget.ts`
- Test: `lib/budget.test.ts`

**Interfaces:**
- Produces:
  - `monthTransactions(txs: Transaction[], month: string): Transaction[]`
  - `monthTotals(txs: Transaction[], month: string): { incomeCents: number; expenseCents: number; remainingCents: number }`
  - `BudgetStatus = "under" | "near" | "at" | "over"`
  - `budgetStatus(spentCents: number, limitCents: number): BudgetStatus`
  - `PouchUsage = { category: Category; spentCents: number; limitCents: number; leftCents: number; percent: number; status: BudgetStatus }`
  - `pouchUsage(categories: Category[], txs: Transaction[], month: string): PouchUsage[]`: expense pouches that have a limit, in category order
  - `unlimitedSpending(categories: Category[], txs: Transaction[], month: string): { category: Category; spentCents: number }[]`: expense pouches with no limit
- [ ] **Step 1:** Write the failing tests.
  - `budgetStatus` gives:
    - `under` for 0/100 and 79/100
    - `near` for 80/100 and 99/100
    - `at` for 100/100
    - `over` for 101/100
  - `monthTotals` for `"2026-10"`:
    - includes entries dated `2026-10-01` and `2026-10-31`
    - excludes `2026-09-30` and `2026-11-01`
    - gives a negative `remainingCents` when expenses exceed income
  - `pouchUsage`:
    - ignores income entries and other months
    - sums two entries in one pouch
    - gives `leftCents` −1240 when spending is 1240 over the limit
  - `unlimitedSpending` lists a no-limit pouch with 0 spent.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Compare months with `monthOf(t.date) === month`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Refactor the Ledger page to use `monthTransactions`, and re-run its browser check.
- [ ] **Step 6:** Commit: "Add budget calculations".

### Task 9: Guild Hall dashboard

**Files:**
- Create: `components/SummaryCard.tsx` + `.module.css`, `components/BudgetBar.tsx` + `.module.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces:
  - `SummaryCard({ title: string; plain: string; cents: number; icon: IconName; overByWhenNegative?: boolean })`: when `overByWhenNegative` is set and `cents < 0`, the card shows "Over by {formatCents(-cents)}" in amber
  - `BudgetBar({ usage: PouchUsage })`
    - 10 segments, with `Math.round(min(percent, 1) * 10)` filled
    - fill color: moss for under and near, gold for at, amber for over
    - label: "{spent} of {limit} used · {left} left", or "Over by {x}" when over
    - `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax={limitCents}`, `aria-valuenow={min(spent, limit)}`, and `aria-valuetext` set to the label
- [ ] **Step 1:** Guild Hall layout:
  - `MonthPicker`
  - three `SummaryCard`s:
    - "Gold earned" / "Income", icon coin
    - "Gold spent" / "Expenses", icon chest
    - "Gold remaining" / "Income minus expenses", icon gem, `overByWhenNegative`
  - "Pouch limits": a `BudgetBar` for each `pouchUsage`, or, if none have limits, "Set a monthly limit on a pouch to track it here." linking to `/pouches`
  - "No limit set": name, icon, and spent amount for each `unlimitedSpending` item
  - "Recent entries": `TransactionList` with the 5 newest, without actions
  - a "Record entry" button
- [ ] **Step 2:** Check in the browser:
  - Set a $100 limit on Provisions.
  - Add $45 → "$45.00 of $100.00 used · $55.00 left", 5 segments filled, green.
  - Add $40 more → still green ("near").
  - Add $15 → gold.
  - Add $12.40 → amber, "Over by $12.40".
  - Make expenses exceed income → the remaining card reads "Over by".
  - Switch months → the totals change.
- [ ] **Step 3:** Commit: "Add Guild Hall dashboard".

### Task 10: Visual polish pass

**Files:**
- Modify: `components/BudgetBar.module.css`, `app/globals.css`, any component CSS that needs fixes

- [ ] **Step 1:** Add motion:
  - budget segments fill one after another (CSS `animation-delay` per segment)
  - buttons depress 2px on `:active`
  - both disabled under `prefers-reduced-motion`
- [ ] **Step 2:** Check accessibility and layout with the browser at 360px and 1280px:
  - no horizontal scroll
  - tap targets at least 44px
  - focus is visible when tabbing through each page
  - amounts use `font-variant-numeric: tabular-nums`
- [ ] **Step 3:** Commit: "Polish motion and responsive layout".

### Task 11: Clerk messages

**Files:**
- Create: `lib/clerk.ts`, `components/ClerkMessage.tsx` + `.module.css`
- Modify: `app/page.tsx`
- Test: `lib/clerk.test.ts`

**Interfaces:**
- Produces:
  - `ENCOURAGEMENTS: string[]`, with exactly these four lines, in order:
    1. "A steady ledger is a trusty companion."
    2. "Knowing where your gold goes is half the journey."
    3. "Small entries add up to a clear map."
    4. "The guild thanks you for keeping good records."
  - `clerkMessage(input: { monthEntryCount: number; overPouchNames: string[]; recordedToday: boolean; dayOfMonth: number }): string`
  - `ClerkMessage({ message: string })`: a clerk portrait (`PixelIcon` book) with a speech-bubble panel
- [ ] **Step 1:** Write the failing tests, one per rule in the spec's priority order, using the spec's exact text:
  - count 0, even with an over pouch → the fresh-page message
  - an over pouch → names the first over pouch
  - recorded today → the thanks message
  - otherwise, `dayOfMonth` 1 → `ENCOURAGEMENTS[0]` and `dayOfMonth` 6 → `ENCOURAGEMENTS[1]` (index = `(day − 1) % 4`)
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Show the clerk on the Guild Hall, below the month picker. `recordedToday` = `logbookDays.includes(todayISO())`.
- [ ] **Step 6:** Commit: "Add clerk messages".

### Task 12: Logbook stamps and Guild rank

**Files:**
- Create: `lib/ranks.ts`, `components/RankBadge.tsx` + `.module.css`
- Modify: `app/page.tsx`, `app/hearth/page.tsx`
- Test: `lib/ranks.test.ts`

**Interfaces:**
- Produces:
  - `RANKS = [[0,"Wanderer"],[3,"Apprentice Scribe"],[10,"Journeyman Scribe"],[25,"Keeper of Coin"],[50,"Guild Treasurer"],[100,"Master of the Ledger"]]`
  - `rankFor(stamps: number): { title: string; nextTitle: string | null; stampsToNext: number | null }`
  - `RankBadge({ stamps: number })`: "Apprentice Scribe · 4 Logbook stamps · 6 more to Journeyman Scribe"
- [ ] **Step 1:** Write the failing tests:
  - 0 → Wanderer, 3 to the next rank
  - 2 → Wanderer, 1 to the next rank
  - 3 → Apprentice Scribe
  - 99 → Guild Treasurer, 1 to the next rank
  - 100 and 250 → Master of the Ledger, with `nextTitle` and `stampsToNext` both null
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Wire it up.
  - Guild Hall shows `RankBadge` only when `settings.showRewards`.
  - Hearth gets a "Show rewards (Logbook stamps and Guild rank)" checkbox, which dispatches `setShowRewards`.
  - The checkbox's help text: "Earn one stamp for each day you record an entry. Stamps never go away."
- [ ] **Step 6:** Check in the browser: add an entry and the stamp count is 1. Delete it and the count stays 1. Toggle rewards off and the badge is hidden.
- [ ] **Step 7:** Commit: "Add logbook stamps and guild rank".

### Task 13: Hearth backup, restore and reset

**Files:**
- Modify: `app/hearth/page.tsx`
- Create: `app/hearth/hearth.module.css`

**Interfaces:**
- Consumes: `validateSaveFile`, `createStarterData`, `todayISO`, and the `replaceAll` action

- [ ] **Step 1:** "Your data" panel. It explains the localStorage limitations in plain words:
  - data stays in this browser on this device
  - clearing site data or using a private window removes it or hides it
  - it isn't encrypted
  - storage is about 5 MB
  - and it recommends downloading a backup now and then
- [ ] **Step 2:** "Download backup" saves `guild-ledger-backup-{todayISO()}.json`, holding `JSON.stringify(data, null, 2)`, through a Blob and a temporary `<a download>`.
- [ ] **Step 3:** "Restore from backup":
  - an `<input type="file" accept="application/json">`
  - read it with `file.text()`, then `JSON.parse` inside try/catch, then `validateSaveFile`
  - if it's invalid, show "That file isn't a Guild Ledger backup. Nothing was changed."
  - if it's valid, `confirm("This replaces all current data. Continue?")` and then dispatch `replaceAll`
- [ ] **Step 4:** "Reset all data": confirm, then `replaceAll` with `createStarterData()`.
- [ ] **Step 5:** Check in the browser:
  - Download a backup, then reset → the ledger is empty.
  - Restore the backup → the data is back.
  - Restore a `.json` file that isn't a backup → the error shows and the data is unchanged.
- [ ] **Step 6:** Run `npm test`, `npm run lint`, and `npm run build`. All three pass.
- [ ] **Step 7:** Commit: "Add backup, restore and reset".
