// The content gate: every shipped Daily puzzle and Challenge level must be a fair, clean Puzzle.
import { describe, expect, it } from 'vitest';
import daily from '../../worker/puzzles.json';
import levels from '../../src/data/levels.json';
import { canSpell, cellKey, layout, letterRuns } from '../../src/lib/grid';
import type { Puzzle } from '../../src/lib/types';
import { GRIM, PROFANE } from '../../scripts/generate/words';

function problems(p: Puzzle): string[] {
  const out: string[] = [];
  const grid = layout(p);
  const words = p.words.map((w) => w.w);
  if (new Set(words).size !== words.length) out.push('a Grid word appears twice');
  for (const w of p.words) {
    if (w.w.length < 3) out.push(`${w.w} is under 3 letters`);
    if (!canSpell(w.w, p.letters)) out.push(`${w.w} can't be spelled from ${p.letters}`);
    const end = w.d === 'A' ? w.c + w.w.length : w.r + w.w.length;
    if (w.r < 0 || w.c < 0 || end > (w.d === 'A' ? p.cols : p.rows)) out.push(`${w.w} runs off the Grid`);
  }
  // Crossings agree and no letters touch except as words.
  const runs = letterRuns(grid.letters, p.rows, p.cols).map((r) => `${r.w}@${r.r},${r.c},${r.d}`).sort();
  const placed = p.words.map((w) => `${w.w}@${w.r},${w.c},${w.d}`).sort();
  if (runs.join() !== placed.join()) out.push(`letters on the Grid spell ${runs.join(' ')}`);
  // Every Grid word is reachable from the first through crossings.
  const seen = new Set<string>();
  const stack = [cellKey(p.words[0].r, p.words[0].c)];
  while (stack.length) {
    const k = stack.pop()!;
    if (seen.has(k) || !grid.letters.has(k)) continue;
    seen.add(k);
    const [r, c] = k.split(',').map(Number);
    stack.push(cellKey(r + 1, c), cellKey(r - 1, c), cellKey(r, c + 1), cellKey(r, c - 1));
  }
  if (seen.size !== grid.letters.size) out.push('the Grid is in more than one piece');
  if (!p.words.some((w) => w.w.length === p.letters.length)) out.push('no Grid word uses every Wheel letter');
  for (const w of words) if (GRIM.has(w) || PROFANE.has(w)) out.push(`${w} is too grim or crude for the Grid`);
  for (const b of p.bonus) if (PROFANE.has(b)) out.push(`Bonus word ${b} is a swear word`);
  for (const b of p.bonus) {
    if (b.length < 3 || !canSpell(b, p.letters)) out.push(`Bonus word ${b} can't be spelled`);
    if (grid.wordCells.has(b)) out.push(`${b} is both a Grid and a Bonus word`);
  }
  return out;
}

describe.each([
  ['Daily puzzle', daily as Puzzle[]],
  ['Challenge level', levels as Puzzle[]],
])('every %s', (kind, list) => {
  it('is a clean, solvable Puzzle', () => {
    const bad = list.flatMap((p, i) => problems(p).map((msg) => `${kind} #${i + 1} (${p.letters}): ${msg}`));
    expect(bad).toEqual([]);
  });
});

it('never repeats a Wheel within the Daily puzzles', () => {
  const sets = (daily as Puzzle[]).map((p) => [...p.letters].sort().join(''));
  const dupes = sets.filter((s, i) => sets.indexOf(s) !== i);
  expect(dupes).toEqual([]);
});
