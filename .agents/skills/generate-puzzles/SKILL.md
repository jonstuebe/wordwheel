---
name: generate-puzzles
description: Top up Daily puzzles in worker/puzzles.json or add Challenge levels to src/data/levels.json with the generator. Use when adding puzzles, extending the runway, adding levels, or when the build warns that Puzzles are running out.
---

# Generate puzzles

Puzzles are generated, not written (see `docs/adr/0002-generated-puzzles.md`; terms in `GLOSSARY.md`).

## Steps

1. **Find where you're starting.** `node -e "console.log(require('./worker/puzzles.json').length, require('./src/data/levels.json').length)"`. Daily puzzle N plays on `LAUNCH_DATE` (in `worker/puzzles.ts`) + (N − 1) days.
2. **Preview.** `npm run generate -- --days <n> --dry-run` (or `--levels <n>`). With no flags it tops Daily up to 60 days past today. Each line shows the Wheel, Grid size, Grid words and the Bonus count.
3. **Read the preview.** Look for Root or Grid words that are crude, dated, or upsetting in a daily game (e.g. war or illness words on a cheerful puzzle). Two word lists are applied automatically: `scripts/generate/profane.txt` (swear words, never in a Puzzle at all) and `scripts/generate/grim.txt` (grim or crude words, never a Root or Grid word). When a grim or crude word turns up, add it to the right list and rerun the preview; don't patch the JSON. For a Root that's merely odd (jargon, an obscure form), add its Root word (the Grid word using every letter) to `scripts/generate/rejected.txt` and rerun the preview: the generator never uses a rejected Root's letters, so that slot gets a different Puzzle.
4. **Generate.** Rerun without `--dry-run`. It writes both JSON files.
5. **Run the gate.** `npx vitest run tests/unit/puzzles.test.ts` must be green.
6. **Report** how many were added, the last date now covered, and anything you removed and why. Shipping is `npm run deploy`, which publishes to the live site: run it only when the human asks.

Never edit a Puzzle that has already been played (number at or before today's): players' saved progress refers to its words and cells.
