# Daily puzzles are served one day at a time by the Worker

Following Timestack, `worker/puzzles.json` lives in a Cloudflare Worker that serves `GET /api/puzzle/<YYYY-MM-DD>` only for a date that is "today" somewhere on Earth (UTC−12 to UTC+14) and returns `{ number, puzzle }`. Shipping Daily puzzles in the client bundle, as the original single-file prototype did, lets anyone read every future Grid from view-source. Players must be online once per day; the Puzzle they fetch is cached so play in progress still works offline.

Challenge levels are the opposite case and stay in the client bundle (`src/data/levels.json`). They aren't shared or timed, so nothing is gained by hiding them, and bundling keeps Challenge fully playable offline.

## Considered Options

- **Bundle everything (the prototype):** leaks every future Daily puzzle and loops when the list runs out.
- **Serve Challenge levels from the Worker too:** costs offline play for no fairness gain.
- **Server-side checking of Submissions:** would also hide today's answers, but costs offline play and a round-trip per word. Today's answers reaching DevTools is accepted, as it is for Wordle.

## Consequences

- The Puzzle number and Launch date live only on the server; the client asks for its local date.
- When the Daily puzzles run out the server returns 404 and the menu says "Back tomorrow" instead of looping. The build warns when fewer than 14 remain.
- Only today's Puzzle is served; there is no archive endpoint.
