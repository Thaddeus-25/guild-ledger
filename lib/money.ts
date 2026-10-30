// All money in the app is stored as whole cents (1250 = $12.50).
// This file is the only place that converts between cents and text.

export const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000.00

export type ParseAmountResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Turns what someone typed ("$1,234.50") into cents (123450).
export function parseAmount(input: string): ParseAmountResult {
  const cleaned = input.trim().replace(/[$,]/g, "");

  if (cleaned === "") {
    return { ok: false, error: "Enter an amount." };
  }
  // Digits, optionally followed by a dot and more digits. No minus sign.
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { ok: false, error: "Use numbers only, like 12.50." };
  }

  const [whole, fraction = ""] = cleaned.split(".");
  if (fraction.length > 2) {
    return { ok: false, error: "Use at most 2 decimal places." };
  }

  // Build the cents from the two parts separately, so we never
  // multiply a decimal number (19.99 * 100 = 1998.9999999999998).
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (cents === 0) {
    return { ok: false, error: "Amount must be more than $0." };
  }
  if (cents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: "Amount must be $1,000,000.00 or less." };
  }
  return { ok: true, cents };
}

// 123450 -> "$1,234.50"
export function formatCents(cents: number): string {
  return dollars.format(cents / 100);
}

// 1250 -> "12.50", for filling in an input box when editing.
export function centsToInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${whole}.${rest}`;
}
