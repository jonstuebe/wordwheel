import { describe, expect, it } from 'vitest';
import { handle } from '../../worker/index';
import { LAUNCH_DATE, isTodaySomewhere, parseDateKey, puzzleForDate, puzzleNumber } from '../../worker/puzzles';
import { PUZZLE } from './fixtures';

const LIST = ['CAT', 'ACT', 'TAC'].map((letters) => ({ ...PUZZLE, letters }));
const utc = (y: number, m: number, d: number, h = 0) => Date.UTC(y, m - 1, d, h);
const get = (path: string, now: number, method = 'GET') => handle(new Request(`https://wordwheel.test${path}`, { method }), now, LIST);

describe('parseDateKey', () => {
  it('accepts real calendar dates only', () => {
    expect(parseDateKey('2026-10-28')).toBe(utc(2026, 10, 28));
    expect(parseDateKey('2028-02-29')).toBe(utc(2028, 2, 29));
    for (const bad of ['2027-02-29', '2026-13-01', '2026-10-32', '2026-1-5', '26-10-26', 'today', '2026-10-26x']) {
      expect(parseDateKey(bad), bad).toBeNull();
    }
  });
});

describe('puzzleNumber', () => {
  it('is #1 on the Launch date and counts calendar days after', () => {
    expect(LAUNCH_DATE).toBe('2026-10-28');
    expect(puzzleNumber(parseDateKey(LAUNCH_DATE)!)).toBe(1);
    expect(puzzleNumber(utc(2026, 10, 29))).toBe(2);
    expect(puzzleNumber(utc(2027, 3, 15))).toBe(139);
    expect(puzzleNumber(utc(2026, 10, 27))).toBe(0);
  });
});

describe('puzzleForDate', () => {
  it('returns nothing before launch or after the list runs out, instead of looping', () => {
    expect(puzzleForDate(LIST, '2026-10-28')).toEqual({ number: 1, puzzle: LIST[0] });
    expect(puzzleForDate(LIST, '2026-10-30')?.puzzle.letters).toBe('TAC');
    expect(puzzleForDate(LIST, '2026-10-31')).toBeNull();
    expect(puzzleForDate(LIST, '2026-10-27')).toBeNull();
  });
});

describe('isTodaySomewhere', () => {
  const day = utc(2026, 10, 29);
  it('opens when the date starts at UTC+14 and closes when it ends at UTC−12', () => {
    expect(isTodaySomewhere(day, utc(2026, 10, 28, 9) + 59 * 60_000)).toBe(false);
    expect(isTodaySomewhere(day, utc(2026, 10, 28, 10))).toBe(true);
    expect(isTodaySomewhere(day, utc(2026, 10, 30, 11) + 59 * 60_000)).toBe(true);
    expect(isTodaySomewhere(day, utc(2026, 10, 30, 12))).toBe(false);
  });
});

describe('GET /api/puzzle/:date', () => {
  const now = utc(2026, 10, 29, 12);

  it('serves today with its number', async () => {
    const res = get('/api/puzzle/2026-10-29', now);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(await res.json()).toEqual({ number: 2, puzzle: LIST[1] });
  });

  it('serves yesterday and tomorrow only while they are today somewhere', () => {
    const late = utc(2026, 10, 29, 11);
    expect(get('/api/puzzle/2026-10-30', late).status).toBe(200);
    expect(get('/api/puzzle/2026-10-28', late).status).toBe(200);
    expect(get('/api/puzzle/2026-10-28', utc(2026, 10, 29, 12)).status).toBe(404);
  });

  it('refuses future Puzzles even when they exist', () => {
    const res = get('/api/puzzle/2026-10-30', utc(2026, 10, 28, 12));
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('404s once the Puzzles run out', () => {
    expect(get('/api/puzzle/2026-10-31', utc(2026, 10, 31, 12)).status).toBe(404);
  });

  it('rejects malformed dates, unknown routes and writes', () => {
    expect(get('/api/puzzle/tomorrow', now).status).toBe(400);
    expect(get('/api/puzzles', now).status).toBe(404);
    expect(get('/api/puzzle/2026-10-29', now, 'POST').status).toBe(405);
  });
});
