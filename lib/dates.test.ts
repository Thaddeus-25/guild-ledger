import { describe, expect, it } from "vitest";
import { formatDay, formatMonth, monthOf, shiftMonth, todayISO } from "./dates";

describe("todayISO", () => {
  it("uses the local calendar date, even late at night", () => {
    // October 5th, 11:30pm local time (months count from 0, so 9 = October)
    expect(todayISO(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
  });
});

describe("monthOf", () => {
  it("keeps the last day of a month in that month", () => {
    expect(monthOf("2026-10-31")).toBe("2026-10");
  });
});

describe("shiftMonth", () => {
  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("formatMonth and formatDay", () => {
  it("show friendly labels", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatDay("2026-10-05")).toBe("Oct 5");
  });
});
