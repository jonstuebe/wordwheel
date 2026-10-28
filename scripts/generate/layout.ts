import { cellKey, letterRuns, type CellKey } from '../../src/lib/grid.ts';
import type { Direction, Placement } from '../../src/lib/types.ts';

interface Cell {
  ch: string;
  across: boolean;
  down: boolean;
}

const step = (d: Direction) => (d === 'A' ? [0, 1] : [1, 0]);

/** A crossword on an unbounded plane, placed one word at a time. */
class Board {
  cells = new Map<CellKey, Cell>();
  words: Placement[] = [];

  get(r: number, c: number) {
    return this.cells.get(cellKey(r, c));
  }

  /**
   * How many letters `w` would share with the board if placed here, or -1 if the
   * placement breaks crossword rules: it must cross a word, agree at every crossing,
   * and never touch another word side-on or end-on.
   */
  crossings(w: string, r: number, c: number, d: Direction): number {
    const [dr, dc] = step(d);
    if (this.get(r - dr, c - dc) || this.get(r + dr * w.length, c + dc * w.length)) return -1;
    let crossings = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const cell = this.get(rr, cc);
      if (cell) {
        if (cell.ch !== w[i] || (d === 'A' ? cell.across : cell.down)) return -1;
        crossings++;
      } else if (this.get(rr + dc, cc + dr) || this.get(rr - dc, cc - dr)) {
        return -1;
      }
    }
    return crossings === w.length ? -1 : crossings;
  }

  place(p: Placement) {
    const [dr, dc] = step(p.d);
    for (let i = 0; i < p.w.length; i++) {
      const key = cellKey(p.r + dr * i, p.c + dc * i);
      const cell = this.cells.get(key) ?? { ch: p.w[i], across: false, down: false };
      if (p.d === 'A') cell.across = true;
      else cell.down = true;
      this.cells.set(key, cell);
    }
    this.words.push(p);
  }

  bounds(extra?: Placement) {
    let [minR, minC, maxR, maxC] = [Infinity, Infinity, -Infinity, -Infinity];
    const add = (r: number, c: number) => {
      minR = Math.min(minR, r);
      minC = Math.min(minC, c);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    };
    for (const key of this.cells.keys()) {
      const [r, c] = key.split(',').map(Number);
      add(r, c);
    }
    if (extra) {
      const [dr, dc] = step(extra.d);
      add(extra.r, extra.c);
      add(extra.r + dr * (extra.w.length - 1), extra.c + dc * (extra.w.length - 1));
    }
    return { minR, minC, rows: maxR - minR + 1, cols: maxC - minC + 1 };
  }

  /** Every legal spot for `w`, with how many letters it shares. */
  options(w: string, maxSize: number) {
    const found: { p: Placement; crossings: number; area: number }[] = [];
    for (const [key, cell] of this.cells) {
      const [r, c] = key.split(',').map(Number);
      const d: Direction = cell.across ? 'D' : 'A';
      if (cell.across && cell.down) continue;
      const [dr, dc] = step(d);
      for (let i = 0; i < w.length; i++) {
        if (w[i] !== cell.ch) continue;
        const p: Placement = { w, r: r - dr * i, c: c - dc * i, d };
        const crossings = this.crossings(w, p.r, p.c, d);
        if (crossings < 1) continue;
        const b = this.bounds(p);
        if (b.rows > maxSize || b.cols > maxSize) continue;
        found.push({ p, crossings, area: Math.max(b.rows, b.cols) ** 2 + b.rows * b.cols });
      }
    }
    return found;
  }
}

export interface LayoutOptions {
  /** Grid words to place, the root included. */
  target: number;
  /** The Grid is square and at most this many cells a side. */
  maxSize: number;
  attempts: number;
}

export interface Layout {
  rows: number;
  cols: number;
  words: Placement[];
}

/**
 * Lays `root` across, then crosses in other `candidates` until `target` words fit
 * inside a `maxSize` square. Tries several orders and keeps the tightest Grid.
 * Returns null if no attempt places `target` words.
 */
export function buildLayout(root: string, candidates: string[], random: () => number, options: LayoutOptions): Layout | null {
  let best: { layout: Layout; score: number } | null = null;
  for (let attempt = 0; attempt < options.attempts; attempt++) {
    const board = new Board();
    board.place({ w: root, r: 0, c: 0, d: 'A' });
    // Longer words first, jittered so attempts differ.
    const pool = candidates
      .filter((w) => w !== root)
      .map((w) => ({ w, key: w.length + random() * 2.5 }))
      .sort((a, b) => b.key - a.key)
      .map((x) => x.w);
    for (const w of pool) {
      if (board.words.length >= options.target) break;
      if (board.words.some((p) => isPluralPair(p.w, w))) continue;
      const spots = board.options(w, options.maxSize);
      if (!spots.length) continue;
      spots.sort((a, b) => b.crossings - a.crossings || a.area - b.area);
      // Usually the best spot, sometimes the runner-up, for variety between attempts.
      const pick = spots.length > 1 && random() < 0.3 ? spots[1] : spots[0];
      board.place(pick.p);
    }
    if (board.words.length < options.target) continue;
    const layout = normalize(board);
    if (!isClean(layout)) continue;
    const crossings = [...board.cells.values()].filter((c) => c.across && c.down).length;
    const score = layout.rows * layout.cols - crossings * 3;
    if (!best || score < best.score) best = { layout, score };
  }
  return best?.layout ?? null;
}

/** CAT and CATS on one Grid give the second away. */
const isPluralPair = (a: string, b: string) => a + 'S' === b || b + 'S' === a;

/** Shifts the board to start at row 0, column 0, centred in a square. */
function normalize(board: Board): Layout {
  const b = board.bounds();
  const size = Math.max(b.rows, b.cols);
  const offR = Math.floor((size - b.rows) / 2) - b.minR;
  const offC = Math.floor((size - b.cols) / 2) - b.minC;
  return { rows: size, cols: size, words: board.words.map((p) => ({ ...p, r: p.r + offR, c: p.c + offC })) };
}

/** True when the only runs of letters on the Grid are its words. */
export function isClean(layout: Layout): boolean {
  const letters = new Map<CellKey, string>();
  for (const p of layout.words) {
    const [dr, dc] = step(p.d);
    for (let i = 0; i < p.w.length; i++) letters.set(cellKey(p.r + dr * i, p.c + dc * i), p.w[i]);
  }
  const placed = new Set(layout.words.map((p) => `${p.w}@${p.r},${p.c},${p.d}`));
  const runs = letterRuns(letters, layout.rows, layout.cols);
  return runs.length === layout.words.length && runs.every((p) => placed.has(`${p.w}@${p.r},${p.c},${p.d}`));
}
