import type { Puzzle, Run } from './types';
import type { CellKey, GridLayout } from './grid';

export const MIN_WORD = 3;
export const HINT_COST = 25;
export const BONUS_REWARD = 5;
export const LEVEL_REWARD = 20;
export const DAILY_REWARD = 30;
export const STARTING_COINS = 100;

export type Outcome =
  | { kind: 'short' }
  | { kind: 'grid'; word: string; run: Run }
  | { kind: 'repeat'; word: string }
  | { kind: 'bonus'; word: string; run: Run }
  | { kind: 'bonus-repeat'; word: string }
  | { kind: 'miss'; word: string };

/** Checks a Submission against the Grid words, then the Bonus words. */
export function submit(puzzle: Puzzle, grid: GridLayout, run: Run, word: string): Outcome {
  if (word.length < MIN_WORD) return { kind: 'short' };
  if (grid.wordCells.has(word)) {
    if (run.found.includes(word)) return { kind: 'repeat', word };
    return { kind: 'grid', word, run: withCovered(grid, { ...run, found: [...run.found, word] }) };
  }
  if (puzzle.bonus.includes(word)) {
    if (run.bonusFound.includes(word)) return { kind: 'bonus-repeat', word };
    return { kind: 'bonus', word, run: { ...run, bonusFound: [...run.bonusFound, word] } };
  }
  return { kind: 'miss', word };
}

/** Cells showing their letter: covered by a found word or revealed by a Hint. */
export function filledCells(grid: GridLayout, run: Run): Set<CellKey> {
  const filled = new Set<CellKey>(run.hints);
  for (const w of run.found) for (const k of grid.wordCells.get(w) ?? []) filled.add(k);
  return filled;
}

/** Marks as found every Grid word whose cells are all filled, by other words or Hints. */
export function withCovered(grid: GridLayout, run: Run): Run {
  const filled = filledCells(grid, run);
  const covered = [...grid.wordCells].filter(([w, keys]) => !run.found.includes(w) && keys.every((k) => filled.has(k))).map(([w]) => w);
  return covered.length ? { ...run, found: [...run.found, ...covered] } : run;
}

/**
 * The cell a Hint reveals: a random unfilled cell of the shortest unfound word,
 * or null when every cell is already showing.
 */
export function pickHint(grid: GridLayout, run: Run, random: () => number = Math.random): CellKey | null {
  const filled = filledCells(grid, run);
  const unfound = [...grid.wordCells].filter(([w]) => !run.found.includes(w)).sort(([a], [b]) => a.length - b.length);
  for (const [, keys] of unfound) {
    const open = keys.filter((k) => !filled.has(k));
    if (open.length) return open[Math.floor(random() * open.length)];
  }
  return null;
}

export function applyHint(grid: GridLayout, run: Run, cell: CellKey): Run {
  return withCovered(grid, { ...run, hints: [...run.hints, cell] });
}

export function isSolved(puzzle: Puzzle, run: Run): boolean {
  return puzzle.words.every((p) => run.found.includes(p.w));
}
