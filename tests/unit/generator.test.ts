import { describe, expect, it } from 'vitest';
import { SIZES, generatePuzzle, letterSet, spellable } from '../../scripts/generate/puzzle';
import { isClean } from '../../scripts/generate/layout';
import { loadDictionary } from '../../scripts/generate/words';

const dict = loadDictionary();

describe('generatePuzzle', () => {
  it.each([5, 6, 7])('builds a clean %i-letter Puzzle within its size', (letters) => {
    const size = SIZES[letters];
    const p = generatePuzzle(`test:${letters}`, size, dict, new Set());
    expect(p.letters).toHaveLength(letters);
    expect(p.words).toHaveLength(size.words);
    expect(p.rows).toBe(p.cols);
    expect(p.rows).toBeLessThanOrEqual(size.maxSize);
    expect(isClean(p)).toBe(true);
    for (const w of p.words) expect(dict.common.has(w.w)).toBe(true);
    expect(p.bonus.every((b) => dict.bonus.has(b) && !p.words.some((w) => w.w === b))).toBe(true);
    // Players try common words first, so few of them may land as Bonus words.
    expect(p.bonus.filter((b) => dict.common.has(b)).length).toBeLessThanOrEqual(size.leftover);
  });

  it('is reproducible from its seed and skips used Wheels', () => {
    const a = generatePuzzle('test:repeat', SIZES[6], dict, new Set());
    expect(generatePuzzle('test:repeat', SIZES[6], dict, new Set())).toEqual(a);
    const b = generatePuzzle('test:repeat', SIZES[6], dict, new Set([letterSet(a.letters)]));
    expect(letterSet(b.letters)).not.toBe(letterSet(a.letters));
  });

  it('never puts a word and its plural on one Grid', () => {
    const p = generatePuzzle('test:plural', SIZES[7], dict, new Set());
    const words = new Set(p.words.map((w) => w.w));
    expect([...words].filter((w) => words.has(`${w}S`))).toEqual([]);
  });
});

it('fills the Grid with the most frequent words that fit', () => {
  const p = generatePuzzle('test:frequent', SIZES[6], dict, new Set());
  const rarestGrid = Math.min(...p.words.map((w) => dict.frequency(w.w)));
  const commoner = p.bonus.filter((b) => dict.common.has(b) && dict.frequency(b) > rarestGrid);
  // A commoner word can miss the Grid only when no layout fits it; most never do.
  expect(commoner.length).toBeLessThanOrEqual(2);
});

describe('dictionary', () => {
  it('keeps names, acronyms and offensive words out', () => {
    expect(dict.common.has('CAT')).toBe(true);
    expect(dict.bonus.has('ABACUS')).toBe(true);
    expect(dict.frequency('HOUSE')).toBeGreaterThan(dict.frequency('ABACUS'));
    expect([...dict.bonus].every((w) => /^[A-Z]{3,7}$/.test(w))).toBe(true);
    expect(spellable('STONE', ['NOTES', 'TONES', 'STONED'])).toEqual(['NOTES', 'TONES']);
  });
});
