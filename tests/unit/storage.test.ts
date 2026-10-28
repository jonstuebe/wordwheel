import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  dailyProgress,
  defaultState,
  effectiveStreak,
  loadState,
  nextLevel,
  recordDailySolve,
  recordLevelSolve,
  saveState,
} from '../../src/lib/storage';
import { memoryStorage } from './fixtures';

describe('loadState', () => {
  it('starts a new player with 100 coins', () => {
    expect(loadState(memoryStorage()).coins).toBe(100);
  });

  it('survives corrupt and partial data', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadState(storage)).toEqual(defaultState());
    storage.setItem(STORAGE_KEY, JSON.stringify({ coins: 40, challenge: { level: 3, run: { found: 'x' } } }));
    const state = loadState(storage);
    expect(state.coins).toBe(40);
    expect(state.challenge).toEqual({ level: 3, run: { found: [], bonusFound: [], hints: [], order: null } });
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const state = recordDailySolve(defaultState(), 4, 61_000, 1);
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });
});

describe('Daily puzzle', () => {
  it('starts fresh progress on a new day', () => {
    const state = { ...defaultState(), daily: { number: 3, run: { found: ['CAT'], bonusFound: [], hints: [], order: null }, elapsed: 9 } };
    expect(dailyProgress(state, 3).run.found).toEqual(['CAT']);
    expect(dailyProgress(state, 4)).toEqual({ number: 4, run: { found: [], bonusFound: [], hints: [], order: null }, elapsed: 0 });
  });

  it('pays 30 coins once per day and builds a Streak on consecutive days', () => {
    let state = recordDailySolve(defaultState(), 1, 1000, 0);
    expect(state.coins).toBe(130);
    expect(recordDailySolve(state, 1, 500, 0)).toBe(state);
    state = recordDailySolve(state, 2, 1000, 0);
    expect(state.stats).toMatchObject({ solved: 2, currentStreak: 2, maxStreak: 2, lastSolved: 2 });
    state = recordDailySolve(state, 4, 1000, 0);
    expect(state.stats).toMatchObject({ currentStreak: 1, maxStreak: 2 });
  });

  it('shows a missed day as a broken Streak before the next solve', () => {
    const state = recordDailySolve(recordDailySolve(defaultState(), 1, 1, 0), 2, 1, 0);
    expect(effectiveStreak(state, 3)).toBe(2);
    expect(effectiveStreak(state, 4)).toBe(0);
  });
});

describe('Challenge', () => {
  it('pays 20 coins per Level and keeps the player on it until they move on', () => {
    const solved = recordLevelSolve(defaultState());
    expect(solved.coins).toBe(120);
    expect(solved.challenge.level).toBe(0);
    expect(nextLevel(solved).challenge.level).toBe(1);
  });
});
