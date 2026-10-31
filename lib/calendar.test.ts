import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarWeeks,
  dayChoice,
  formatChosenDay,
  formatLongDay,
  formatShortDay,
  yesterdayISO,
} from "./calendar";

describe("calendarWeeks", () => {
  it("starts weeks on Sunday, with blanks before the 1st", () => {
    // October 1, 2026 is a Thursday: Sun, Mon, Tue and Wed are blank.
    const weeks = calendarWeeks("2026-10");
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks).toHaveLength(5);
    expect(weeks[4]).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  });

  it("has no leading blanks when the 1st is a Sunday", () => {
    // November 1, 2026 is a Sunday.
    expect(calendarWeeks("2026-11")[0][0]).toBe("2026-11-01");
  });

  it("pads the last week with blanks", () => {
    const weeks = calendarWeeks("2026-11");
    expect(weeks[weeks.length - 1]).toEqual(["2026-11-29", "2026-11-30", null, null, null, null, null]);
  });

  it("knows February has 29 days in a leap year", () => {
    const days = calendarWeeks("2028-02").flat().filter(Boolean);
    expect(days).toHaveLength(29);
    expect(days[28]).toBe("2028-02-29");
  });
});

describe("addDays and yesterdayISO", () => {
  it("moves across months and years", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-10-30", 7)).toBe("2026-11-06");
  });

  it("finds yesterday, even on New Year's Day", () => {
    expect(yesterdayISO("2026-10-30")).toBe("2026-10-29");
    expect(yesterdayISO("2027-01-01")).toBe("2026-12-31");
  });
});

describe("dayChoice", () => {
  it("says which date chip is lit", () => {
    expect(dayChoice("2026-10-30", "2026-10-30")).toBe("today");
    expect(dayChoice("2026-10-29", "2026-10-30")).toBe("yesterday");
    expect(dayChoice("2026-10-20", "2026-10-30")).toBe("other");
    expect(dayChoice("2026-10-31", "2026-10-30")).toBe("other");
  });
});

describe("date labels", () => {
  it("writes a short label for the chip", () => {
    expect(formatShortDay("2026-10-20")).toBe("Tue, Oct 20");
  });

  it("writes the chosen day in full under the chips", () => {
    expect(formatChosenDay("2026-10-30")).toBe("Fri, Oct 30, 2026");
  });

  it("writes the full date for screen readers", () => {
    expect(formatLongDay("2026-10-30")).toBe("Friday, October 30, 2026");
  });
});
