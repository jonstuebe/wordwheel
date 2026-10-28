import { describe, expect, it, vi } from 'vitest';
import { PUZZLE_CACHE_KEY, cachedDaily, estimatedPuzzleNumber, loadDaily } from '../../src/lib/daily';
import { PUZZLE, memoryStorage } from './fixtures';

const ok = () => vi.fn(async () => new Response(JSON.stringify({ number: 5, puzzle: PUZZLE }), { status: 200 }));

describe('loadDaily', () => {
  it('fetches by local date and caches the Puzzle', async () => {
    const storage = memoryStorage();
    const fetcher = ok();
    const daily = await loadDaily('2026-10-30', fetcher, storage);
    expect(fetcher).toHaveBeenCalledWith('/api/puzzle/2026-10-30');
    expect(daily).toEqual({ status: 'ready', date: '2026-10-30', number: 5, puzzle: PUZZLE });
    expect(cachedDaily('2026-10-30', storage)).toEqual(daily);
  });

  it('serves a cached Puzzle for the same date without the network', async () => {
    const storage = memoryStorage();
    await loadDaily('2026-10-30', ok(), storage);
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await loadDaily('2026-10-30', offline, storage)).toMatchObject({ status: 'ready', number: 5 });
    expect(offline).not.toHaveBeenCalled();
  });

  it('is offline when the network fails and only an older day is cached', async () => {
    const storage = memoryStorage();
    await loadDaily('2026-10-30', ok(), storage);
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await loadDaily('2026-10-31', offline, storage)).toEqual({ status: 'offline' });
  });

  it('is none when the server has no Puzzle for the date', async () => {
    const notFound = vi.fn(async () => new Response('{}', { status: 404 }));
    expect(await loadDaily('2027-06-01', notFound, memoryStorage())).toEqual({ status: 'none' });
  });

  it('treats server errors and bad bodies as offline, and ignores a corrupt cache', async () => {
    const storage = memoryStorage();
    storage.setItem(PUZZLE_CACHE_KEY, '{nope');
    expect(cachedDaily('2026-10-30', storage)).toBeNull();
    expect(await loadDaily('2026-10-30', vi.fn(async () => new Response('', { status: 500 })), storage)).toEqual({ status: 'offline' });
    expect(await loadDaily('2026-10-30', vi.fn(async () => new Response('<html>', { status: 200 })), storage)).toEqual({ status: 'offline' });
  });
});

describe('estimatedPuzzleNumber', () => {
  it('counts on from the last cached Puzzle so a missed day still shows', async () => {
    const storage = memoryStorage();
    expect(estimatedPuzzleNumber('2026-11-02', storage)).toBeNull();
    await loadDaily('2026-10-30', ok(), storage);
    expect(estimatedPuzzleNumber('2026-11-02', storage)).toBe(8);
  });
});
