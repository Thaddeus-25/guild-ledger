# Guild Ledger — Our Own Inputs (design)

Replaces the browser's built-in date picker, pouch dropdown, amount keyboard and checkbox with inputs Guild Ledger draws itself, in its pixel style. Builds on the v1 and accounts designs; everything not mentioned here stays as they describe.

## Intent

- **Who it's for:** the owner, mostly on a Samsung phone, sometimes on a Windows PC.
- **Problem:** the phone draws its own calendar, dropdown list and keyboard, so they look like the phone, not the guild. The dropdown can't show pouch icons or budgets.
- **What "done" means:** adding or editing an entry uses only Guild Ledger's own pixel inputs (date, pouch, amount), the monthly limit uses the same amount pad, and Hearth's "Show rewards" is a pixel checkbox. They work by touch, mouse and keyboard, screen readers announce them properly, and saved data is exactly what it is today.
- **Constraints:** built by us, with no new packages. Each input hands the form the same value it uses today (a `"YYYY-MM-DD"` date string, a pouch id, an amount string, a boolean), so validation, saving and stored data don't change. The v1 rules still hold: 44px tap targets, visible focus rings, reduced motion respected, money in the readable body font (the pixel font makes "5" look like "S").

## Decisions (agreed with the owner, with browser mockups)

| Input | Decision |
|---|---|
| Date | Chips `Today` · `Yesterday` · `Other day…`; "Other day…" opens a **calendar bottom sheet** |
| Coin Pouch | A box showing the chosen pouch; tapping it opens a **bottom-sheet list** |
| Amount | A box showing the amount; tapping it opens a **number pad bottom sheet with `+1` `+5` `+10` `+20` coin buttons** |
| On/off setting | **Pixel checkbox**: a square that fills gold with a check mark |
| Build approach | Shared building blocks: one `BottomSheet`, pure logic files with tests, thin components |
| Week start | Sunday (US style) |

Mockups: `.superpowers/brainstorm/` (git-ignored), final screen `new-entry-final.html`.

## Scope

**In:** the date, pouch and amount inputs on New entry and Edit entry; the amount pad for the monthly limit in Coin Pouches; the pixel checkbox for "Show rewards" in Hearth.

**Out:** the Note field and the pouch name field (they keep the phone keyboard, because they hold words); the Expense/Income tabs and the icon picker (already custom); the Guild Hall/Ledger month picker (already custom); new settings; sounds; animations beyond the sheet sliding in.

## Behavior

### BottomSheet (shared)
- A panel that slides up from the bottom over a dimmed page, built on a modal `<dialog>` (`showModal()`), styled entirely by us: a parchment panel, a dark-wood top border with a gold line, and a small grab bar.
- It has a visible title (an `h2` inside the sheet, also its accessible name) and a **✕ Close** button (labelled "Close", 44px) at the top right. iPhones have no back gesture that closes things, so every sheet needs a visible way out.
- It closes on the Close button, Esc, the Android back gesture (the dialog's `cancel`/`close`), and a tap on the dimmed area outside the panel. When it closes, focus returns to the control that opened it.
- While a sheet is open, the page behind it can't scroll (`overflow: hidden` on `<html>`), so swiping inside the sheet never scrolls the form.
- The bottom padding includes the phone's safe area (`env(safe-area-inset-bottom)`), so nothing sits under the iPhone home bar. The viewport is set to `viewport-fit=cover` so that value is available.
- On phones it spans the screen width. On wider screens it's at most 480px wide and centred at the bottom.
- With `prefers-reduced-motion: reduce`, it appears without sliding.
- Only one sheet is open at a time.

### Date (`DatePicker`)
- Label "Date". There are three chips in a row (a radio group): `Today`, `Yesterday`, `Other day…`, at least 44px tall, with the chosen one gold.
- The full chosen date is written under the chips (e.g. "Fri, Oct 30, 2026"). All dates use US style, like the rest of the app.
- Picking a chip:
  - **Today:** `todayISO()`.
  - **Yesterday:** the day before today.
  - **Other day…:** opens the calendar sheet; the value doesn't change until a day is picked.
- When the value is neither today nor yesterday, the third chip is the lit one and reads the short date (e.g. `Tue, Oct 20`) instead of "Other day…". Tapping it opens the calendar again.
- **Calendar sheet** (title "Choose a day"):
  - The header has ◀ and ▶ buttons (labelled "Previous month" / "Next month") around the month name (v1 `formatMonth`).
  - Below it are 7 columns, `Su Mo Tu We Th Fr Sa`, and the weeks of that month. Days outside the month are blank.
  - The calendar opens on the month of the current value.
  - Each day is a button, at least 40px wide and 36px tall, labelled with the full date (e.g. "Friday, October 30, 2026").
  - Today has a dark outline (`aria-current="date"`). The chosen day is gold (`aria-pressed="true"`). Days after today are faded but can be picked.
  - **Tapping a day sets the value and closes the sheet.**
  - **Keyboard:** only the chosen day (or the 1st when the chosen day is in another month) is in the Tab order. Arrow keys move one day or one week and cross into neighbouring months; Home and End go to the start and end of the week; Enter or Space picks.
- Edit entry opens with the entry's date, and the chips light up to match.

### Coin Pouch (`PouchPicker`)
- Label "Coin Pouch". The box is a button showing the chosen pouch's icon (24px), its name, and its "left" text, or "Choose a pouch…" when none is chosen, with a ▲.
- **Sheet** (title "Choose a Coin Pouch"):
  - It has one row per pouch of the entry's type (Expense or Income), in the user's pouch order: icon (28px), name, and on the right the "left" text.
  - Rows are real radio buttons, visually hidden behind the styled row, with a gold row for the chosen one. **Tapping a row picks it and closes the sheet.** Arrow keys move between rows and choose as they go, but keep the sheet open; Enter or Space picks and closes (also on the already-chosen row).
- **"Left" text** is for the month of the entry's date, counting all saved entries, including the one being edited:
  - an expense pouch with a limit shows `"$12.00 left"` (green), `"$0.00 left"` (brown) exactly at the limit, or `"$5.00 over"` (calm amber, never red);
  - an expense pouch without a limit shows `"no limit"`;
  - income pouches show nothing.
- Changing Expense/Income clears the chosen pouch, as today.
- When no pouches of that type exist, the sheet shows "No expense pouches yet." (or "income") and a link "Make one in Coin Pouches" to `/pouches`. Today's dropdown shows an empty list in that case, so this is new.

### Amount (`AmountInput`)
- It's a real text input that doesn't call up the phone keyboard (`inputMode="none"`), showing the amount string in the readable font with `$` before it. It keeps the existing label, hint, `aria-invalid` and error message.
- **Opening the pad:** a tap or click on the input opens the pad sheet. Focusing it with Tab does not, so keyboard users can type straight in.
- On touch screens (`(pointer: coarse)`), the input is also `readOnly`, because iPhones don't reliably honor `inputMode="none"` and could show their keyboard over the pad. With a mouse and keyboard it stays editable.
- **Pad sheet** (title "Enter the amount"), top to bottom:
  - the big amount (`$` + the string, or `$0` when empty), which is an `aria-live="polite"` region;
  - the coin buttons `+1` `+5` `+10` `+20`, each with a coin icon, labelled "Add 1 dollar" and so on;
  - the keys `1–9`, `.`, `0`, `⌫` (labelled "Delete"), at least 44px tall;
  - **Done**, which closes the sheet.
- While the sheet is open, the physical keys `0–9`, `.`, `,` (treated as `.`), Backspace and Enter work too. Enter always means Done, even right after clicking a key.
- When the pad opens on an existing amount (e.g. "12.50" when editing), the first digit or `.` starts a new amount, like a calculator; ⌫ and the coin buttons work on the existing amount.
- However the pad closes, a trailing `.` is dropped ("12." becomes "12"), so it can be saved.
- **Key rules** (`lib/amountPad.ts`):
  - A `.` with nothing before it gives `"0."`. A second `.` is ignored.
  - A third decimal digit is ignored.
  - A digit after a lone `"0"` replaces it (`"0"` + `"5"` → `"5"`).
  - `⌫` removes the last character, and removing the last one gives `""`.
  - A key that would make the amount more than $1,000,000.00 is ignored.
  - Digits before the `.` are limited to 7.
- **Coin rules:**
  - `addDollars("", n)` gives `n` with 2 decimals (`"20.00"`).
  - On a valid amount it adds whole dollars and keeps 2 decimals (`"12.5"` + 5 → `"17.50"`).
  - It caps at `"1000000.00"`.
  - If the current string isn't a valid amount (e.g. half-typed `"12."` or something typed on a PC), the coin buttons leave it unchanged.
- Used for: the entry amount (New and Edit entry), and the pouch monthly limit (Coin Pouches). For the limit, an empty value still means "no limit".

### Pixel checkbox (`PixelCheckbox`)
- A real checkbox, visually hidden, inside a label. Next to the label text it draws a 28px square with a 3px dark border: parchment when off, gold with a dark pixel check mark when on.
- The whole row is the tap target (at least 44px tall). The focus ring shows on the square when the checkbox has keyboard focus.
- It's used for Hearth's "Show rewards", keeping its existing `aria-describedby` hint.

## Architecture

**Pure logic (each with `.test.ts`):**
- `lib/calendar.ts`:
  - `calendarWeeks(month: string): (string | null)[][]` gives the weeks of `"YYYY-MM"`, Sunday first, each a 7-item array of `"YYYY-MM-DD"` or `null`.
  - `addDays(date: string, days: number): string`.
  - `yesterdayISO(today: string): string`.
  - `dayChoice(date: string, today: string): "today" | "yesterday" | "other"`.
  - `formatShortDay(date: string): string` gives `"Tue, Oct 20"`; `formatChosenDay` gives `"Fri, Oct 30, 2026"`.
  - `formatLongDay(date: string): string` gives `"Tuesday, October 20, 2026"`.
  - All date maths uses `new Date(y, m - 1, d)` like v1, never `new Date("YYYY-MM-DD")`.
- `lib/amountPad.ts`: `type PadKey = "0" | … | "9" | "." | "back"`; `pressKey(current: string, key: PadKey): string`; `addDollars(current: string, dollars: number): string`; `pressKeyFresh(current, key, fresh)`; `finishAmount(current)`. It's built on `parseAmount`, `centsToInput` and `MAX_AMOUNT_CENTS` from `lib/money.ts`.
- `lib/budget.ts`: adds `pouchLeftText(category: Category, transactions: Transaction[], month: string): { text: string; tone: "good" | "at" | "over" | "none" } | null`, which is `null` for income pouches.

**Components (each with a `.module.css`):** `components/BottomSheet.tsx`, `DatePicker.tsx`, `PouchPicker.tsx`, `AmountInput.tsx`, `PixelCheckbox.tsx`. Each takes `value` and `onChange` (plus `id`, label text and error props where the field has them) and keeps no copy of the value. The form still owns the state.

**iPhone home-screen icon:** `app/apple-icon.png`, 180×180, the favicon coin on the night-blue background (iPhones ignore the manifest's icons and don't show transparency). Next.js links it automatically.

**Changed:**
- `app/layout.tsx` (`viewportFit: "cover"`);
- `components/TransactionForm.tsx` (date, amount, pouch);
- `components/CategoryForm.tsx` (limit);
- `app/hearth/page.tsx` (rewards checkbox);
- `README.md` ("How the code is organized" lists the new files).

## Error handling
- Validation messages appear under each field exactly as today (from `validateTransactionInput` and `validateCategoryInput`). The custom inputs pass on `aria-invalid` and `aria-describedby`.
- If a sheet can't open because `showModal` isn't supported (a very old browser), the input still works: the amount box accepts typing, the date chips still give Today and Yesterday, and the pouch box falls back to showing the list inline. This is a single feature check in `BottomSheet`.

## Testing
- **TDD (Vitest)** for `calendar.ts`, `amountPad.ts` and `pouchLeftText`, using the cases in the Behavior section. Specifically:
  - Oct 2026 starts on Thursday (4 blanks), Feb 2028 has 29 days, and a month starting on Sunday has no leading blanks;
  - `yesterdayISO("2027-01-01") === "2026-12-31"`;
  - every pad rule above;
  - the left text for `$12.00 left`, `$0.00 left`, `$5.00 over`, `no limit`, and `null` for income.
- All existing tests stay green; lint and the build stay clean.
- **Browser checks (Playwright, 360px and 1280px, logged in with the test account from `TEST_LOGIN_EMAIL`/`TEST_LOGIN_PASSWORD`, values never printed):**
  - add an entry using only the new inputs, then reload: the saved entry has the expected date, pouch id and cents;
  - edit it;
  - each sheet opens and closes by tap, Esc and backdrop, and focus returns;
  - keyboard only: Tab, calendar arrows, typing into the pad, Enter;
  - the accessibility snapshot shows the names and states;
  - reduced motion: no slide;
  - the limit pad in Coin Pouches; the Hearth checkbox.
- **Owner's check** on the Samsung phone: add, edit, and toggle rewards.

## Rollout
Build on branch `custom-inputs`, committing and pushing each step (Vercel preview). Merge into `main` once the owner has checked the preview on the phone.
