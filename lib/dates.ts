// Dates are stored as text: "2026-10-29" for a day, "2026-10" for a month.
//
// Never write new Date("2026-10-01"): JavaScript reads that as midnight in
// UTC, which is still September 30th in the Americas. Instead we build
// dates from numbers with new Date(year, monthIndex, day), which uses
// the computer's own time zone.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Today's date on the user's calendar, e.g. "2026-10-29".
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// True for real calendar days like "2026-02-28", false for "2026-02-30" or "soon".
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, monthNumber, day] = date.split("-").map(Number);
  const built = new Date(year, monthNumber - 1, day);
  // JavaScript quietly turns Feb 30 into Mar 2, so check nothing moved.
  return (
    built.getFullYear() === year && built.getMonth() === monthNumber - 1 && built.getDate() === day
  );
}

// "2026-10-29" -> "2026-10"
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

// shiftMonth("2026-12", 1) -> "2027-01"
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  // JavaScript rolls month 12 over to January of the next year for us.
  const shifted = new Date(year, monthNumber - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`;
}

// "2026-10" -> "October 2026"
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// "2026-10-05" -> "Oct 5"
export function formatDay(date: string): string {
  const [year, monthNumber, day] = date.split("-").map(Number);
  return new Date(year, monthNumber - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
