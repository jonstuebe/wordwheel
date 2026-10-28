# WordWheel

A word puzzle: swipe across the letters on the wheel to spell words that fill a crossword-style grid. Play the timed Daily puzzle, the same for everyone, or work through Challenge levels. Rules and vocabulary are in [GLOSSARY.md](GLOSSARY.md).

- One Daily puzzle per day, chosen from the player's **local** date. Harder through the week: 5 letters early on, 7 at the weekend.
- A small Cloudflare Worker serves only today's Daily puzzle, so future ones can't be read from the page source. Challenge levels ship with the app ([ADR 0001](docs/adr/0001-puzzles-served-by-worker.md)).
- Puzzles are generated from the SCOWL word lists and committed ([ADR 0002](docs/adr/0002-generated-puzzles.md)).
- Coins, Streaks, progress and results live in `localStorage` (`wordwheel:v1`); today's Puzzle is cached in `wordwheel:puzzle`.
- Installable PWA. It needs the network once a day to fetch the Daily puzzle; after that it plays offline, and Challenge always does.
- Swipe with touch or a mouse, or type on a keyboard and press Enter.

## Develop

```sh
npm install
npm run dev          # http://localhost:5173, with the Worker API running in workerd
npm run build        # typecheck + production build into dist/client (site) and dist/wordwheel (Worker)
npm run preview      # serve the build, Worker included (service worker enabled)
```

## Test

```sh
npm test             # Vitest: game rules, storage, Worker date gate, daily fetch/cache, share text, the generator, and a gate over every shipped Puzzle
npm run test:e2e     # Playwright: builds, serves, and plays the game (swipe, keyboard, offline, sharing, axe accessibility)
```

## Puzzles

```sh
npm run generate                      # top up Daily puzzles to 60 days past today
npm run generate -- --days 30         # add 30 Daily puzzles
npm run generate -- --levels 20       # add 20 Challenge levels
npm run generate -- --days 7 --dry-run
```

- Daily puzzles live in `worker/puzzles.json` and never ship in the client bundle; Challenge levels are in `src/data/levels.json`.
- Puzzle number = days since `LAUNCH_DATE` in `worker/puzzles.ts` (#1 on 2026-10-28). When the list runs out, players see "Back tomorrow"; it never loops. The build warns when fewer than 14 are left.
- Each Puzzle is seeded by its number, so the generator is reproducible. Turn a Puzzle down by adding its Root word to `scripts/generate/rejected.txt`.
- `tests/unit/puzzles.test.ts` is the content gate: spellable words, agreeing crossings, no stray letter runs, one connected Grid, Bonus words separate from Grid words.
- Agents: the `generate-puzzles` skill walks through a top-up.

## Deploy

```sh
npm run deploy       # build, then wrangler deploy to https://wordwheel.jonstuebe.com
```

One Cloudflare Worker serves the static site and `GET /api/puzzle/<YYYY-MM-DD>`, which returns `{ number, puzzle }` only while that date is "today" somewhere on Earth (UTC−12 to UTC+14). Every other date gets a 404. The custom domain is set in `wrangler.jsonc`.

## Structure

```
worker/
  index.ts             GET /api/puzzle/:date with the "today somewhere" gate
  puzzles.ts           launch date, puzzle number, date window
  puzzles.json         every Daily puzzle (server only)
scripts/
  generate-puzzles.ts  CLI: append Daily puzzles and Challenge levels
  generate/            dictionary, crossword layout, puzzle builder, rejected roots
src/
  data/levels.json     Challenge levels
  lib/game.ts          Submissions, hints, coin values
  lib/grid.ts          cell layout, letter runs, spellability
  lib/daily.ts         fetch today's puzzle, cache it for offline play
  lib/storage.ts       versioned localStorage, coins, streaks, rewards
  lib/share.ts         spoiler-free share text + Web Share API / clipboard fallback
  lib/effects.ts       flying words, confetti
  components/          Menu, Play, Wheel, Grid, HelpModal, Countdown
public/icons/          PWA icons (regenerate with `npm run icons`)
```
