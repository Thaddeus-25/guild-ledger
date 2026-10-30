// What the guild clerk says on the Guild Hall.
// Tone rules: never scold, never call spending good or bad, and never
// suggest spending leftover gold.

export const ENCOURAGEMENTS = [
  "A steady ledger is a trusty companion.",
  "Knowing where your gold goes is half the journey.",
  "Small entries add up to a clear map.",
  "The guild thanks you for keeping good records.",
];

interface ClerkInput {
  monthEntryCount: number; // entries in the month being viewed
  overPouchNames: string[]; // pouches past their limit that month
  recordedToday: boolean; // an entry was recorded today
  dayOfMonth: number; // today's day, 1–31
}

// The first rule that matches wins.
export function clerkMessage(input: ClerkInput): string {
  if (input.monthEntryCount === 0) {
    return "A fresh page in the ledger. Record your first entry when you're ready.";
  }
  if (input.overPouchNames.length > 0) {
    return `${input.overPouchNames[0]} is past its limit this month. Want to look over its entries or adjust the limit?`;
  }
  if (input.recordedToday) {
    return "Thanks for keeping the ledger. Every entry makes the map clearer.";
  }
  return ENCOURAGEMENTS[(input.dayOfMonth - 1) % ENCOURAGEMENTS.length];
}
