# Puzzles are generated from SCOWL, then committed

Timestack's Puzzles are hand-written because each needs sourced facts. A WordWheel Puzzle is mechanical: a Root word, the common words it contains laid out as a crossword, and every other real word as a Bonus word. So `npm run generate` builds them (`scripts/generate-puzzles.ts`) and appends them to the JSON files, which are committed and reviewed like any other change. Nothing is generated at request time.

- **Dictionary:** SCOWL via `wordlist-english`. Root and Grid words come from sizes 10–20 (words everyone knows); Bonus words from sizes 10–40, so obscure-but-real words still pay (size 50 was dropped: it's mostly jargon nobody tries). Offensive words (`naughty-words`) and capitalised entries are excluded. Plural Roots are skipped, and a Grid never holds both a word and its plural.
- **Common words go on the Grid:** players try the obvious words first, so a common word landing as a Bonus word feels like the Grid got the obscure ones. The Grid takes the most frequent common words that fit (ranked by SUBTLEX-US spoken frequency, `subtlex-word-frequencies`), and a Root qualifies only if at most a few common words miss the Grid (4 for 5 letters, 5 for 6 and 7). Seven-letter Grids hold 9 words in up to 9×9 to make room. This roughly halves each Puzzle's Bonus list and leaves about 3 common words on it, down from 9.
- **Difficulty:** Daily puzzles get harder through the week: 5 letters Monday–Tuesday, 6 Wednesday–Friday, 7 at the weekend.
- **Fairness:** no two Puzzles share a Wheel's letter set. `tests/unit/puzzles.test.ts` checks every shipped Puzzle: Grid words spellable from the Wheel, crossings agree, no stray letter runs, one connected Grid, and Bonus words disjoint from Grid words.
- **Reproducible:** each Puzzle is seeded by its number (`daily:<n>`, `level:<n>`), so rerunning on the same files gives the same output.

Daily puzzle #1 and Challenge levels 1–3 came from the original prototype and were kept as they were; their Bonus lists used a looser dictionary (they accept words like `PST`). Everything after them was regenerated on the launch date under the rules above. A Challenge Run saved against a Level since regenerated starts over (`runFits` in `src/lib/game.ts`).

## Considered Options

- **Generate on the Worker per request:** no deploy needed to top up, but output then depends on library versions at runtime, and nobody reviews a Puzzle before players see it.
- **Hand-written Puzzles:** slow, and the crossword layout is exactly what a machine does better.
