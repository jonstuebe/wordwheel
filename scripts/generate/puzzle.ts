import { canSpell } from '../../src/lib/grid.ts';
import { hashString, mulberry32, shuffle } from '../../src/lib/puzzle.ts';
import type { Puzzle } from '../../src/lib/types.ts';
import { buildLayout } from './layout.ts';
import { MIN_LENGTH, type Dictionary } from './words.ts';

/**
 * How big a Puzzle is: Wheel letters, Grid words, the Grid's largest side, and
 * how many common words may miss the Grid and become Bonus words.
 */
export interface Size {
  letters: number;
  words: number;
  maxSize: number;
  leftover: number;
}

export const SIZES: Record<number, Size> = {
  5: { letters: 5, words: 5, maxSize: 6, leftover: 4 },
  6: { letters: 6, words: 7, maxSize: 8, leftover: 5 },
  // Seven letters spell many words, so a bigger Grid keeps the common ones on it.
  7: { letters: 7, words: 9, maxSize: 9, leftover: 5 },
};

/** Sorted letters: two Puzzles with the same letter set feel like a repeat. */
export const letterSet = (s: string) => [...s].sort().join('');

/** Every word in `words` the Wheel `letters` can spell. */
export function spellable(letters: string, words: Iterable<string>): string[] {
  const out: string[] = [];
  for (const w of words) if (w.length >= MIN_LENGTH && w.length <= letters.length && canSpell(w, letters)) out.push(w);
  return out.sort();
}

/**
 * Builds one Puzzle of `size` from a seed string: picks a common root word,
 * lays out a Grid from the most frequent common words it contains, and lists
 * every other word as a Bonus word. A root qualifies only if at most
 * `size.leftover` common words miss the Grid, so the words players try first
 * are Grid words, not Bonus words. Deterministic for a given seed, dictionary
 * and `used` set.
 */
export function generatePuzzle(seed: string, size: Size, dict: Dictionary, used: Set<string>): Puzzle {
  const random = mulberry32(hashString(seed));
  const roots = shuffle(
    // Plural roots make samey Grids (the singular is always in them), so skip them.
    [...dict.common].filter((w) => w.length === size.letters && !w.endsWith('S') && !used.has(letterSet(w))),
    random,
  );
  for (const root of roots) {
    const common = spellable(root, dict.common);
    // Enough common words that the Grid has a choice, but not so many that most become Bonus words.
    if (common.length < size.words + 2 || common.length > size.words + size.leftover) continue;
    const layout = layoutFrequent(root, common, size, dict, random);
    if (!layout) continue;
    const gridWords = new Set(layout.words.map((p) => p.w));
    if (common.filter((w) => !gridWords.has(w)).length > size.leftover) continue;
    return {
      letters: shuffle([...root], random).join(''),
      rows: layout.rows,
      cols: layout.cols,
      words: layout.words,
      bonus: spellable(root, dict.bonus).filter((w) => !gridWords.has(w)),
    };
  }
  throw new Error(`No ${size.letters}-letter root left that makes a Puzzle (seed ${seed})`);
}

/** Lays out a Grid from as few of the most frequent `common` words as will fit, widening the pool until one does. */
function layoutFrequent(root: string, common: string[], size: Size, dict: Dictionary, random: () => number) {
  const byFrequency = common.filter((w) => w !== root).sort((a, b) => dict.frequency(b) - dict.frequency(a));
  for (let take = size.words - 1; take <= byFrequency.length; take++) {
    const layout = buildLayout(root, [root, ...byFrequency.slice(0, take)], random, { target: size.words, maxSize: size.maxSize, attempts: 60 });
    if (layout) return layout;
  }
  return null;
}
