import { describe, expect, it } from "vitest";
import { rankBadgeText, rankFor } from "./ranks";

describe("rankFor", () => {
  it("starts everyone as a Wanderer", () => {
    expect(rankFor(0)).toEqual({ title: "Wanderer", nextTitle: "Apprentice Scribe", stampsToNext: 3 });
    expect(rankFor(2)).toEqual({ title: "Wanderer", nextTitle: "Apprentice Scribe", stampsToNext: 1 });
  });

  it("rises at each threshold", () => {
    expect(rankFor(3).title).toBe("Apprentice Scribe");
    expect(rankFor(99)).toEqual({ title: "Guild Treasurer", nextTitle: "Master of the Ledger", stampsToNext: 1 });
  });

  it("tops out at Master of the Ledger", () => {
    for (const stamps of [100, 250]) {
      expect(rankFor(stamps)).toEqual({ title: "Master of the Ledger", nextTitle: null, stampsToNext: null });
    }
  });
});

describe("rankBadgeText", () => {
  it("shows rank, stamps, and the next goal", () => {
    expect(rankBadgeText(4)).toBe("Apprentice Scribe · 4 Logbook stamps · 6 more to Journeyman Scribe");
  });

  it("uses singular words for one", () => {
    expect(rankBadgeText(1)).toBe("Wanderer · 1 Logbook stamp · 2 more to Apprentice Scribe");
    expect(rankBadgeText(9)).toBe("Apprentice Scribe · 9 Logbook stamps · 1 more to Journeyman Scribe");
  });

  it("drops the goal at the top rank", () => {
    expect(rankBadgeText(120)).toBe("Master of the Ledger · 120 Logbook stamps");
  });
});
