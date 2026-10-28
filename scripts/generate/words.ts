// The dictionaries puzzles are built from, all from SCOWL (wordlist-english).
// SCOWL tiers grow from the most common words (10) to rare ones (70); each tier
// only lists the words new at that size, so a dictionary is a union of tiers.
import { createRequire } from 'node:module';

// Through require: wordlist-english's ESM entry imports a path that doesn't resolve under Vitest.
const require = createRequire(import.meta.url);
const wordlist = require('wordlist-english') as Record<string, string[]>;
const naughty = require('naughty-words') as Record<string, string[]>;

/** Words everyone knows: Wheel roots and Grid words come only from here. */
const COMMON_TIERS = [10, 20];
/** Real but less common words, accepted as Bonus words. */
const BONUS_TIERS = [...COMMON_TIERS, 35, 40, 50];
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
}

export function loadDictionary(): Dictionary {
  return { common: load(COMMON_TIERS), bonus: load(BONUS_TIERS) };
}
