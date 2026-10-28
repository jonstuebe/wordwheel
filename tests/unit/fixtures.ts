import type { Puzzle } from '../../src/lib/types';

/**
 *   C A T
 *   . C .
 *   . T .
 */
export const PUZZLE: Puzzle = {
  letters: 'CAT',
  rows: 3,
  cols: 3,
  words: [
    { w: 'CAT', r: 0, c: 0, d: 'A' },
    { w: 'ACT', r: 0, c: 1, d: 'D' },
  ],
  bonus: [],
};

/** Daily #1: SUPPORT across with seven words crossing it, and plenty of Bonus words. */
export const BIG: Puzzle = {
  letters: 'SRPPOTU',
  rows: 7,
  cols: 7,
  words: [
    { w: 'SUPPORT', r: 2, c: 0, d: 'A' },
    { w: 'OUT', r: 2, c: 4, d: 'D' },
    { w: 'SORT', r: 4, c: 1, d: 'A' },
    { w: 'POST', r: 0, c: 0, d: 'D' },
    { w: 'OUR', r: 4, c: 2, d: 'D' },
    { w: 'PUT', r: 0, c: 0, d: 'A' },
    { w: 'TOP', r: 0, c: 2, d: 'D' },
    { w: 'STOP', r: 1, c: 6, d: 'D' },
  ],
  bonus: ['OPT', 'POUR', 'SOUP', 'SPORT', 'SPOT'],
};

export function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}
