export type Direction = 'A' | 'D';

/** A Grid word and where it sits: `d` is Across or Down from row `r`, column `c`. */
export interface Placement {
  w: string;
  r: number;
  c: number;
  d: Direction;
}

export interface Puzzle {
  /** The Wheel letters. Their order is only a starting point; the app shuffles them. */
  letters: string;
  rows: number;
  cols: number;
  words: Placement[];
  /** Every Bonus word: real words spellable from the Wheel that aren't Grid words. */
  bonus: string[];
}

/** Progress through one Puzzle. Cells are `"row,col"` keys. */
export interface Run {
  found: string[];
  bonusFound: string[];
  hints: string[];
  /** The Wheel's current letter order, or null before it's first shown. */
  order: string[] | null;
}

export function newRun(): Run {
  return { found: [], bonusFound: [], hints: [], order: null };
}
