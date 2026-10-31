// Calendar maths for Guild Ledger's own date picker.
//
// Like lib/dates.ts, every date is text ("2026-10-30") and is turned into a
// Date with new Date(year, monthIndex, day), never new Date("2026-10-30"),
// which would be read as UTC and could land on the day before.

import { todayISO } from "./dates";

function toDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// The month's weeks, Sunday first. Each week has 7 places: a date, or null
// for the blank days before the 1st and after the last day.
export function calendarWeeks(month: string): (string | null)[][] {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate(); // day 0 = last day of this month
  const blanksBefore = new Date(year, monthNumber - 1, 1).getDay(); // 0 = Sunday

  const cells: (string | null)[] = Array(blanksBefore).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// addDays("2026-10-31", 1) -> "2026-11-01". Negative numbers go back.
export function addDays(date: string, days: number): string {
  const moved = toDate(date);
  moved.setDate(moved.getDate() + days); // JavaScript rolls over months and years
  return todayISO(moved);
}

export function yesterdayISO(today: string): string {
  return addDays(today, -1);
}

// Which date chip should be lit for this date.
export function dayChoice(date: string, today: string): "today" | "yesterday" | "other" {
  if (date === today) return "today";
  if (date === yesterdayISO(today)) return "yesterday";
  return "other";
}

// "2026-10-20" -> "Tue, Oct 20" (on the "other day" chip)
export function formatShortDay(date: string): string {
  return toDate(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// "2026-10-30" -> "Fri, Oct 30, 2026" (under the chips)
export function formatChosenDay(date: string): string {
  return toDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// "2026-10-30" -> "Friday, October 30, 2026" (read out by screen readers)
export function formatLongDay(date: string): string {
  return toDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
