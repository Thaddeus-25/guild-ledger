"use client";

// Guild Ledger's own date picker: Today / Yesterday / Other day… chips,
// and a pixel calendar that slides up for any other day.
//
// It only ever hands the form a "YYYY-MM-DD" string, the same as the old
// browser date box, so saving and checking entries works exactly as before.

import { useEffect, useRef, useState } from "react";
import BottomSheet from "./BottomSheet";
import {
  addDays,
  calendarWeeks,
  dayChoice,
  formatChosenDay,
  formatLongDay,
  formatShortDay,
  yesterdayISO,
} from "@/lib/calendar";
import { formatMonth, monthOf, shiftMonth, todayISO } from "@/lib/dates";
import styles from "./DatePicker.module.css";

type DatePickerProps = {
  id: string;
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  errorId?: string; // the error message's id, when there is one
};

const WEEKDAYS = [
  ["Su", "Sunday"],
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
];

export default function DatePicker({ id, value, onChange, errorId }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const choice = dayChoice(value, today);

  return (
    <fieldset className={`choice-group ${styles.group}`} aria-describedby={errorId}>
      <legend className="field-label">Date</legend>

      <label className="choice">
        <input
          type="radio"
          name={`${id}-day`}
          checked={choice === "today"}
          onChange={() => onChange(today)}
        />
        <span>Today</span>
      </label>
      <label className="choice">
        <input
          type="radio"
          name={`${id}-day`}
          checked={choice === "yesterday"}
          onChange={() => onChange(yesterdayISO(today))}
        />
        <span>Yesterday</span>
      </label>
      <label className="choice">
        {/* onClick (not onChange) so tapping it again reopens the calendar. */}
        <input
          type="radio"
          name={`${id}-day`}
          checked={choice === "other"}
          onChange={() => {}}
          onClick={() => setOpen(true)}
        />
        <span>{choice === "other" ? formatShortDay(value) : "Other day…"}</span>
      </label>

      <p className={styles.chosenText}>{formatChosenDay(value)}</p>

      <BottomSheet open={open} title="Choose a day" onClose={() => setOpen(false)}>
        <Calendar
          value={value}
          today={today}
          onPick={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </fieldset>
  );
}

type CalendarProps = {
  value: string;
  today: string;
  onPick: (date: string) => void;
};

function Calendar({ value, today, onPick }: CalendarProps) {
  const [month, setMonth] = useState(monthOf(value));
  // The one day you can Tab to; arrow keys move it.
  const [focusDay, setFocusDay] = useState(value);
  const movedByKeyboard = useRef(false);
  const tableRef = useRef<HTMLTableElement>(null);

  // The day that gets keyboard focus in the month on screen: the chosen
  // one if it's in this month, otherwise the 1st.
  const tabDay = monthOf(focusDay) === month ? focusDay : `${month}-01`;

  // After an arrow key, move real focus to the new day button.
  useEffect(() => {
    if (!movedByKeyboard.current) return;
    movedByKeyboard.current = false;
    tableRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDay}"]`)?.focus();
  }, [focusDay]);

  function moveTo(date: string) {
    movedByKeyboard.current = true;
    setFocusDay(date);
    setMonth(monthOf(date));
  }

  function handleKeyDown(event: React.KeyboardEvent, date: string) {
    const [year, monthNumber, day] = date.split("-").map(Number);
    const weekday = new Date(year, monthNumber - 1, day).getDay(); // 0 = Sunday
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    };
    if (!(event.key in moves)) return;
    event.preventDefault(); // don't scroll the sheet
    moveTo(addDays(date, moves[event.key]));
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.monthBar}>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Previous month"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          ◀
        </button>
        <p className={styles.monthName} aria-live="polite">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Next month"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          ▶
        </button>
      </div>

      <table ref={tableRef} className={styles.grid} role="grid" aria-label={formatMonth(month)}>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <th key={short} scope="col" abbr={long}>
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks(month).map((week, row) => (
            <tr key={row}>
              {week.map((date, col) =>
                date === null ? (
                  <td key={col} />
                ) : (
                  <td key={col}>
                    <button
                      type="button"
                      data-date={date}
                      data-autofocus={date === tabDay ? "" : undefined}
                      tabIndex={date === tabDay ? 0 : -1}
                      className={[
                        styles.day,
                        date === value ? styles.picked : "",
                        date === today ? styles.today : "",
                        date > today ? styles.future : "",
                      ].join(" ")}
                      aria-label={formatLongDay(date)}
                      aria-pressed={date === value}
                      aria-current={date === today ? "date" : undefined}
                      onClick={() => onPick(date)}
                      onKeyDown={(event) => handleKeyDown(event, date)}
                    >
                      {Number(date.slice(8))}
                    </button>
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.hint}>Tap a day to pick it.</p>
    </div>
  );
}
