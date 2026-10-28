import type { Direction, Placement, Puzzle } from './types';

export type CellKey = string;

export const cellKey = (r: number, c: number): CellKey => `${r},${c}`;

/** The cells a word covers, first letter first. */
export function placementCells(p: Pick<Placement, 'w' | 'r' | 'c' | 'd'>): CellKey[] {
  return [...p.w].map((_, i) => cellKey(p.r + (p.d === 'D' ? i : 0), p.c + (p.d === 'A' ? i : 0)));
}

export interface GridLayout {
  /** The letter in every lettered cell. */
  letters: Map<CellKey, string>;
  /** The cells of each Grid word. */
  wordCells: Map<string, CellKey[]>;
}

export function layout(puzzle: Puzzle): GridLayout {
  const letters = new Map<CellKey, string>();
  const wordCells = new Map<string, CellKey[]>();
  for (const p of puzzle.words) {
    const keys = placementCells(p);
    keys.forEach((k, i) => letters.set(k, p.w[i]));
    wordCells.set(p.w, keys);
  }
  return { letters, wordCells };
}

/**
 * Every maximal run of two or more lettered cells, read across and down.
 * A valid Grid has exactly one run per Grid word and no others.
 */
export function letterRuns(letters: Map<CellKey, string>, rows: number, cols: number): Placement[] {
  const runs: Placement[] = [];
  const scan = (d: Direction, lines: number, length: number) => {
    for (let a = 0; a < lines; a++) {
      let word = '';
      let start = 0;
      for (let b = 0; b <= length; b++) {
        const ch = b < length ? letters.get(d === 'A' ? cellKey(a, b) : cellKey(b, a)) : undefined;
        if (ch) {
          if (!word) start = b;
          word += ch;
          continue;
        }
        if (word.length > 1) runs.push(d === 'A' ? { w: word, r: a, c: start, d } : { w: word, r: start, c: a, d });
        word = '';
      }
    }
  };
  scan('A', rows, cols);
  scan('D', cols, rows);
  return runs;
}

/** Letter counts, for checking what the Wheel can spell. */
function counts(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

/** True when `word` can be swiped on a Wheel of `letters`, using each letter at most once. */
export function canSpell(word: string, letters: string): boolean {
  const left = counts(letters);
  for (const ch of word) {
    const n = left.get(ch) ?? 0;
    if (!n) return false;
    left.set(ch, n - 1);
  }
  return true;
}
