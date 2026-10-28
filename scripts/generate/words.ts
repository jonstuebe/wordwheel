// The dictionaries puzzles are built from, all from SCOWL (wordlist-english).
// SCOWL tiers grow from the most common words (10) to rare ones (70); each tier
// only lists the words new at that size, so a dictionary is a union of tiers.
// SCOWL says whether a word is common, not how common: for that, SUBTLEX-US counts
// how often each word is spoken in film and TV subtitles.
import { createRequire } from 'node:module';

// Through require: wordlist-english's ESM entry imports a path that doesn't resolve under Vitest.
const require = createRequire(import.meta.url);
const wordlist = require('wordlist-english') as Record<string, string[]>;
const naughty = require('naughty-words') as Record<string, string[]>;
const subtlex = require('subtlex-word-frequencies') as { word: string; count: number }[];

/** Words everyone knows: Wheel roots and Grid words come only from here. */
const COMMON_TIERS = [10, 20];
/** Real but less common words, accepted as Bonus words. Tier 50 and up is mostly jargon nobody tries. */
const BONUS_TIERS = [...COMMON_TIERS, 35, 40];
const SPELLINGS = ['english', 'english/american'];

export const MIN_LENGTH = 3;
export const MAX_LENGTH = 7;

const BLOCKED = new Set(naughty.en.filter((w) => /^[a-z]+$/.test(w)).map((w) => w.toUpperCase()));

function load(tiers: number[]): Set<string> {
  const out = new Set<string>();
  for (const spelling of SPELLINGS) {
    for (const tier of tiers) {
      for (const w of wordlist[`${spelling}/${tier}`] ?? []) {
        // Lowercase only: capitalised entries are names and acronyms.
        if (w.length < MIN_LENGTH || w.length > MAX_LENGTH || !/^[a-z]+$/.test(w)) continue;
        const upper = w.toUpperCase();
        if (!BLOCKED.has(upper)) out.add(upper);
      }
    }
  }
  return out;
}

export interface Dictionary {
  common: Set<string>;
  bonus: Set<string>;
  /** How often each word is spoken; 0 for words SUBTLEX never saw. */
  frequency: (word: string) => number;
}

export function loadDictionary(): Dictionary {
  const counts = new Map<string, number>();
  for (const { word, count } of subtlex) {
    const upper = word.toUpperCase();
    counts.set(upper, (counts.get(upper) ?? 0) + count);
  }
  return { common: load(COMMON_TIERS), bonus: load(BONUS_TIERS), frequency: (w) => counts.get(w) ?? 0 };
}
