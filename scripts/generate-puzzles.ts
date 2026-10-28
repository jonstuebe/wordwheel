#!/usr/bin/env node
// Generates Daily puzzles into worker/puzzles.json and Challenge levels into src/data/levels.json.
//
//   npm run generate                    top up Daily puzzles to 60 days past today
//   npm run generate -- --days 30       add 30 Daily puzzles
//   npm run generate -- --levels 20     add 20 Challenge levels
//   npm run generate -- --dry-run       print what would be added, write nothing
//
// Each new Puzzle is seeded by its number, so a run is reproducible from the same files.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { LAUNCH_DATE, parseDateKey, puzzleNumber } from '../worker/puzzles.ts';
import type { Puzzle } from '../src/lib/types.ts';
import { SIZES, generatePuzzle, letterSet, type Size } from './generate/puzzle.ts';
import { loadDictionary } from './generate/words.ts';

const DAILY_FILE = fileURLToPath(new URL('../worker/puzzles.json', import.meta.url));
const LEVELS_FILE = fileURLToPath(new URL('../src/data/levels.json', import.meta.url));
/** Root words a reviewer turned down, one per line; the generator never uses their letters. */
const REJECTED_FILE = fileURLToPath(new URL('./generate/rejected.txt', import.meta.url));
const DEFAULT_RUNWAY_DAYS = 60;
const DAY_MS = 86_400_000;

/** Harder through the week, like a newspaper puzzle: 5 letters early on, 7 at the weekend. */
const WEEKDAY_LETTERS = [7, 5, 5, 6, 6, 6, 7];
/** Challenge levels grow from 5 letters to 7; the first three are hand-made warm-ups. */
const levelSize = (n: number): Size => SIZES[n < 30 ? 5 : n < 48 ? 6 : 7];

const { values } = parseArgs({
  options: {
    days: { type: 'string' },
    levels: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Puzzle[];
const daily = read(DAILY_FILE);
const levels = read(LEVELS_FILE);
const rejected = existsSync(REJECTED_FILE) ? readFileSync(REJECTED_FILE, 'utf8').split('\n').map((l) => l.trim().toUpperCase()).filter((l) => l && !l.startsWith('#')) : [];
const used = new Set([...[...daily, ...levels].map((p) => p.letters), ...rejected].map(letterSet));
const dict = loadDictionary();

const dateOf = (n: number) => new Date(parseDateKey(LAUNCH_DATE)! + (n - 1) * DAY_MS).toISOString().slice(0, 10);

const todayNumber = puzzleNumber(parseDateKey(new Date().toISOString().slice(0, 10))!);
const days = values.days !== undefined
  ? Number(values.days)
  : values.levels !== undefined ? 0 : Math.max(0, todayNumber + DEFAULT_RUNWAY_DAYS - daily.length);

const added: string[] = [];
for (let i = 0; i < days; i++) {
  const n = daily.length + 1;
  const size = SIZES[WEEKDAY_LETTERS[new Date(parseDateKey(dateOf(n))!).getUTCDay()]];
  const puzzle = generatePuzzle(`daily:${n}`, size, dict, used);
  used.add(letterSet(puzzle.letters));
  daily.push(puzzle);
  added.push(`Daily #${n} ${dateOf(n)}  ${describe(puzzle)}`);
}

for (let i = 0; i < Number(values.levels ?? 0); i++) {
  const n = levels.length + 1;
  const puzzle = generatePuzzle(`level:${n}`, levelSize(n), dict, used);
  used.add(letterSet(puzzle.letters));
  levels.push(puzzle);
  added.push(`Level ${n}  ${describe(puzzle)}`);
}

function describe(p: Puzzle): string {
  return `${p.letters}  ${p.rows}x${p.cols}  ${p.words.map((w) => w.w).join(' ')}  (+${p.bonus.length} bonus)`;
}

console.log(added.join('\n') || 'Nothing to add.');
if (!values['dry-run'] && added.length) {
  writeFileSync(DAILY_FILE, JSON.stringify(daily, null, 2) + '\n');
  writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2) + '\n');
  console.log(`\n${daily.length} Daily puzzles (through ${dateOf(daily.length)}), ${levels.length} Challenge levels.`);
}
