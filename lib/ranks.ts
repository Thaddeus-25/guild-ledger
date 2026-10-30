// Optional rewards: one Logbook stamp per day you record an entry,
// and a Guild rank that rises with stamps. Ranks never go down.

// [stamps needed, rank title], lowest first.
export const RANKS: [number, string][] = [
  [0, "Wanderer"],
  [3, "Apprentice Scribe"],
  [10, "Journeyman Scribe"],
  [25, "Keeper of Coin"],
  [50, "Guild Treasurer"],
  [100, "Master of the Ledger"],
];

export function rankFor(stamps: number): {
  title: string;
  nextTitle: string | null;
  stampsToNext: number | null;
} {
  // The last rank whose threshold has been reached.
  let index = 0;
  RANKS.forEach(([needed], i) => {
    if (stamps >= needed) index = i;
  });

  const next = RANKS[index + 1];
  return {
    title: RANKS[index][1],
    nextTitle: next ? next[1] : null,
    stampsToNext: next ? next[0] - stamps : null,
  };
}

// "Apprentice Scribe · 4 Logbook stamps · 6 more to Journeyman Scribe"
export function rankBadgeText(stamps: number): string {
  const rank = rankFor(stamps);
  const stampWord = stamps === 1 ? "stamp" : "stamps";
  const parts = [rank.title, `${stamps} Logbook ${stampWord}`];
  if (rank.nextTitle) parts.push(`${rank.stampsToNext} more to ${rank.nextTitle}`);
  return parts.join(" · ");
}
