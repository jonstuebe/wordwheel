import puzzlesData from './puzzles.json';
import type { Puzzle } from '../src/lib/types';
import { isTodaySomewhere, parseDateKey, puzzleForDate } from './puzzles';

const PUZZLES = puzzlesData as Puzzle[];
const ROUTE = /^\/api\/puzzle\/([^/]+)$/;

/** Serves `GET /api/puzzle/<YYYY-MM-DD>` only while that date is today somewhere on Earth. */
export function handle(request: Request, now: number, puzzles: Puzzle[] = PUZZLES): Response {
  const url = new URL(request.url);
  const match = ROUTE.exec(url.pathname);
  if (!match) return json({ error: 'Not found' }, 404);
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });

  const key = match[1];
  const ms = parseDateKey(key);
  if (ms === null) return json({ error: 'Expected a date like 2026-10-26' }, 400);
  if (!isTodaySomewhere(ms, now)) return json({ error: 'That date is not today anywhere' }, 404);

  const found = puzzleForDate(puzzles, key);
  if (!found) return json({ error: 'No Puzzle for that date' }, 404);
  // A date stays "today" for up to 50 hours; let edges and browsers keep it a while.
  return json(found, 200, { 'Cache-Control': 'public, max-age=3600' });
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(status === 200 ? {} : { 'Cache-Control': 'no-store' }), ...headers },
  });
}

export default {
  fetch(request: Request): Response {
    return handle(request, Date.now());
  },
};
