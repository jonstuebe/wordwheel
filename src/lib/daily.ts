import type { Puzzle } from './types';
import { daysBetween } from './puzzle';

export const PUZZLE_CACHE_KEY = 'wordwheel:puzzle';

export interface DailyPuzzle {
  date: string;
  number: number;
  puzzle: Puzzle;
}

export type Daily =
  | { status: 'loading' }
  | ({ status: 'ready' } & DailyPuzzle)
  /** The server has no Puzzle for this date: before launch, or the list ran out. */
  | { status: 'none' }
  /** Couldn't reach the server and nothing is cached for this date. */
  | { status: 'offline' };

/** The cached Puzzle, whatever date it was for. */
export function readCachedPuzzle(storage: Storage | undefined = safeStorage()): DailyPuzzle | null {
  try {
    const raw = storage?.getItem(PUZZLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyPuzzle;
    const valid = typeof parsed?.date === 'string' && typeof parsed.number === 'number' && Array.isArray(parsed.puzzle?.words);
    return valid ? parsed : null;
  } catch {
    return null;
  }
}

/** Today's Puzzle from the cache, so a game started online keeps working offline. */
export function cachedDaily(date: string, storage?: Storage): Daily | null {
  const cached = readCachedPuzzle(storage);
  return cached?.date === date ? { status: 'ready', ...cached } : null;
}

/** Fetches the Puzzle for a local date, falling back to the cache when offline. */
export async function loadDaily(date: string, fetcher: typeof fetch = fetch, storage: Storage | undefined = safeStorage()): Promise<Daily> {
  const cached = cachedDaily(date, storage);
  if (cached) return cached;
  let res: Response;
  try {
    res = await fetcher(`/api/puzzle/${date}`);
  } catch {
    return { status: 'offline' };
  }
  if (res.status === 404) return { status: 'none' };
  if (!res.ok) return { status: 'offline' };
  try {
    const body = (await res.json()) as { number: number; puzzle: Puzzle };
    const daily: DailyPuzzle = { date, number: body.number, puzzle: body.puzzle };
    try {
      storage?.setItem(PUZZLE_CACHE_KEY, JSON.stringify(daily));
    } catch {
      // Blocked storage: playable now, just not offline later.
    }
    return { status: 'ready', ...daily };
  } catch {
    return { status: 'offline' };
  }
}

/**
 * Today's Puzzle number when the Puzzle itself isn't available, counted on
 * from the last one seen. Lets stats show a broken streak while offline.
 */
export function estimatedPuzzleNumber(date: string, storage?: Storage): number | null {
  const cached = readCachedPuzzle(storage);
  return cached ? cached.number + daysBetween(cached.date, date) : null;
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
