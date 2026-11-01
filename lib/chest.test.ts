import { describe, expect, it } from "vitest";
import { chestState } from "./chest";
import { CHEST_ART, CHEST_COLORS, MIMIC_BLINK } from "./chestArt";

describe("chestState", () => {
  it("picks the state from the share of income left", () => {
    expect(chestState(100000, 100000)).toBe("wealthy");
    expect(chestState(100000, 80000)).toBe("wealthy");
    expect(chestState(100000, 79999)).toBe("comfortable");
    expect(chestState(100000, 60000)).toBe("comfortable");
    expect(chestState(100000, 59999)).toBe("cautious");
    expect(chestState(100000, 40000)).toBe("cautious");
    expect(chestState(100000, 39999)).toBe("low");
    expect(chestState(100000, 20000)).toBe("low");
    expect(chestState(100000, 19999)).toBe("critical");
    expect(chestState(100000, 0)).toBe("critical");
  });

  it("shows the mimic when spending passes income", () => {
    expect(chestState(100000, -1)).toBe("overspent");
    expect(chestState(0, -500)).toBe("overspent");
  });

  it("shows an empty chest when there is no income yet", () => {
    expect(chestState(0, 0)).toBe("critical");
  });
});

describe("chest art", () => {
  it("is 32×32 and only uses known colors", () => {
    for (const rows of [...Object.values(CHEST_ART), MIMIC_BLINK]) {
      expect(rows).toHaveLength(32);
      for (const row of rows) {
        expect(row).toHaveLength(32);
        for (const letter of row) if (letter !== ".") expect(CHEST_COLORS[letter]).toBeDefined();
      }
    }
  });

  it("blinks by changing only the mimic's eyes", () => {
    const changedRows = MIMIC_BLINK.flatMap((row, y) => (row === CHEST_ART.overspent[y] ? [] : [y]));
    expect(changedRows).toEqual([14, 15]);
  });
});
