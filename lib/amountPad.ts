// The rules behind Guild Ledger's number pad.
//
// The amount stays text ("12.50") while you type, exactly like the old
// input box, so the form's existing check (parseAmount) still decides
// whether it can be saved. These rules just stop the pad from building
// anything that could never be saved.
//
// Each rule takes an optional limit in cents. It's $1,000,000 unless given;
// a split item is limited to what's left of the full amount.

import { centsToInput, MAX_AMOUNT_CENTS, parseAmount } from "./money";

export type PadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

const MAX_WHOLE_DIGITS = 7; // $1,000,000 has 7 digits before the dot

// Something the pad could have built: digits, then maybe a dot and up to 2 more.
const PAD_SHAPE = /^(\d+(\.\d{0,2})?)?$/;

// The amount in cents, for checking the $1,000,000 limit. "12." counts as 1200.
function centsOf(text: string): number {
  const [whole, fraction = ""] = text.split(".");
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}

export function pressKey(current: string, key: PadKey, maxCents = MAX_AMOUNT_CENTS): string {
  if (key === "back") return current.slice(0, -1);
  // Typed on a computer keyboard into a shape the pad doesn't make
  // (like "$12"): only deleting works, so we never guess.
  if (!PAD_SHAPE.test(current)) return current;

  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }

  const [whole, fraction] = current.split(".");
  if (fraction !== undefined && fraction.length >= 2) return current; // 2 decimals is enough
  if (fraction === undefined && whole.length >= MAX_WHOLE_DIGITS) return current;

  // "0" then "5" is "5", not "05".
  const next = current === "0" ? key : current + key;
  return centsOf(next) > maxCents ? current : next;
}

// The coin buttons: add whole dollars. Leaves anything half-typed alone.
export function addDollars(current: string, dollars: number, maxCents = MAX_AMOUNT_CENTS): string {
  if (current !== "" && !/^\d+(\.\d{1,2})?$/.test(current)) return current;
  const cents = Math.min(centsOf(current) + dollars * 100, maxCents);
  return cents <= 0 ? current : centsToInput(cents); // nothing left: no change
}

// When the pad opens on an amount that's already there (like "12.50" when
// editing), the first digit starts a new amount, like a calculator.
// Deleting still works on the old amount.
export function pressKeyFresh(
  current: string,
  key: PadKey,
  fresh: boolean,
  maxCents = MAX_AMOUNT_CENTS,
): string {
  if (fresh && key !== "back") return pressKey("", key, maxCents);
  return pressKey(current, key, maxCents);
}

// When the pad closes (or you leave the box): show the amount with its
// cents, so "5" and "12.5" read "5.00" and "12.50", like the coin buttons
// give. An amount above the limit comes down to it (or to empty, when
// nothing is left). Anything that isn't an amount yet, like "" or "0",
// is left for the form's own check.
export function finishAmount(current: string, maxCents = MAX_AMOUNT_CENTS): string {
  const trimmed = current.endsWith(".") ? current.slice(0, -1) : current;
  const parsed = parseAmount(trimmed);
  if (!parsed.ok) return trimmed;
  if (parsed.cents > maxCents) return maxCents > 0 ? centsToInput(maxCents) : "";
  return centsToInput(parsed.cents);
}
