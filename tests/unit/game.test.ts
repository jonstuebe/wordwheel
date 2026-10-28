import { describe, expect, it } from 'vitest';
import { applyHint, isSolved, pickHint, runFits, submit } from '../../src/lib/game';
import { canSpell, layout, letterRuns } from '../../src/lib/grid';
import { newRun } from '../../src/lib/types';
import { BIG, PUZZLE } from './fixtures';

const grid = layout(BIG);

describe('submit', () => {
  it('ignores Submissions under 3 letters', () => {
    expect(submit(BIG, grid, newRun(), 'UP').kind).toBe('short');
  });

  it('fills a Grid word, then calls a repeat a repeat', () => {
    const found = submit(BIG, grid, newRun(), 'PUT');
    expect(found).toMatchObject({ kind: 'grid', word: 'PUT' });
    const run = found.kind === 'grid' ? found.run : newRun();
    expect(run.found).toEqual(['PUT']);
    expect(submit(BIG, grid, run, 'PUT').kind).toBe('repeat');
  });

  it('checks Grid words before Bonus words, and Bonus words only count once', () => {
    const bonus = submit(BIG, grid, newRun(), 'SOUP');
    expect(bonus).toMatchObject({ kind: 'bonus', word: 'SOUP' });
    const run = bonus.kind === 'bonus' ? bonus.run : newRun();
    expect(run.bonusFound).toEqual(['SOUP']);
    expect(submit(BIG, grid, run, 'SOUP').kind).toBe('bonus-repeat');
  });

  it('misses words that are neither', () => {
    expect(submit(BIG, grid, newRun(), 'PSST').kind).toBe('miss');
  });

  it('counts a word as found once other words cover all its cells', () => {
    // C A T across and A C T down share only the A, so finding CAT alone covers nothing else.
    const g = layout(PUZZLE);
    const r1 = submit(PUZZLE, g, newRun(), 'CAT');
    expect(r1.kind === 'grid' && r1.run.found).toEqual(['CAT']);
  });
});

describe('runFits', () => {
  it("accepts this Puzzle's Runs and turns down a Run saved against another", () => {
    expect(runFits(BIG, newRun())).toBe(true);
    expect(runFits(BIG, { ...newRun(), order: [...'TOPSURP'], found: ['PUT'], bonusFound: ['SOUP'] })).toBe(true);
    expect(runFits(BIG, { ...newRun(), order: [...'CATS'] })).toBe(false);
    expect(runFits(BIG, { ...newRun(), found: ['CAT'] })).toBe(false);
    expect(runFits(BIG, { ...newRun(), bonusFound: ['CAT'] })).toBe(false);
  });
});

describe('hints', () => {
  it('reveal a cell of the shortest unfound word, and complete words they finish', () => {
    let run = newRun();
    const shortest = new Set(['OUT', 'OUR', 'PUT', 'TOP']);
    const cell = pickHint(grid, run, () => 0)!;
    expect([...grid.wordCells].some(([w, keys]) => shortest.has(w) && keys.includes(cell))).toBe(true);
    // Hinting every cell of PUT finds it.
    for (const k of grid.wordCells.get('PUT')!) run = applyHint(grid, run, k);
    expect(run.found).toContain('PUT');
  });

  it('runs out when every cell shows', () => {
    let run = newRun();
    for (const k of grid.letters.keys()) run = applyHint(grid, run, k);
    expect(pickHint(grid, run)).toBeNull();
    expect(isSolved(BIG, run)).toBe(true);
  });
});

describe('grid', () => {
  it('spells with each Wheel letter at most once', () => {
    expect(canSpell('SUPPORT', 'SRPPOTU')).toBe(true);
    expect(canSpell('POPS', 'SRPPOTU')).toBe(true);
    expect(canSpell('TOOT', 'SRPPOTU')).toBe(false);
  });

  it('finds exactly one run per Grid word on a clean Grid', () => {
    const runs = letterRuns(grid.letters, BIG.rows, BIG.cols).map((r) => r.w).sort();
    expect(runs).toEqual(BIG.words.map((w) => w.w).sort());
  });
});
