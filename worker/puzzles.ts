import type { Puzzle } from '../src/lib/types.ts';

/** Puzzle #1 is played on this local date. */
export const LAUNCH_DATE = '2026-10-28';

/** Puzzles left before players see "Back tomorrow"; the build warns below this. */
export const RUNWAY_WARNING_DAYS = 14;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC midnight of a `YYYY-MM-DD` key, or null if it isn't a real calendar date. */
export function parseDateKey(key: string): number | null {
  const m = DATE_KEY.exec(key);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return ms;
}

/** The Puzzle number for a valid date key: #1 on the Launch date, 0 or less before it. */
export function puzzleNumber(dateMs: number): number {
  return Math.round((dateMs - parseDateKey(LAUNCH_DATE)!) / DAY_MS) + 1;
}

/**
 * True when the calendar date is "today" in some time zone (UTC−12 to UTC+14)
 * at the instant `now`. Anything else is a past or future Puzzle and is refused.
 */
export function isTodaySomewhere(dateMs: number, now: number): boolean {
  return now >= dateMs - 14 * HOUR_MS && now < dateMs + DAY_MS + 12 * HOUR_MS;
}

/** The Puzzle for a date key, or null before launch, after the list runs out, or for a bad key. */
export function puzzleForDate(puzzles: Puzzle[], key: string): { number: number; puzzle: Puzzle } | null {
  const ms = parseDateKey(key);
  if (ms === null) return null;
  const number = puzzleNumber(ms);
  const puzzle = puzzles[number - 1];
  return number >= 1 && puzzle ? { number, puzzle } : null;
}
