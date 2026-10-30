import { describe, expect, it } from "vitest";
import { ICON_ART, ICON_COLORS } from "./icons";
import { ICON_NAMES } from "./types";

describe("pixel icon art", () => {
  it.each(ICON_NAMES)("%s is drawn on a 16×16 grid using only palette colors", (name) => {
    const rows = ICON_ART[name];
    expect(rows).toHaveLength(16);
    rows.forEach((row, y) => {
      expect(row.length, `row ${y} of ${name}`).toBe(16);
      for (const letter of row) {
        if (letter !== ".") expect(ICON_COLORS, `"${letter}" in row ${y}`).toHaveProperty(letter);
      }
    });
  });
});
