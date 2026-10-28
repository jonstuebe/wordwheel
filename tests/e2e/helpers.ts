import { expect, type Page } from '@playwright/test';
import puzzles from '../../worker/puzzles.json' with { type: 'json' };
import levels from '../../src/data/levels.json' with { type: 'json' };
import { puzzleForDate } from '../../worker/puzzles';
import { localDateKey } from '../../src/lib/puzzle';
import type { Puzzle } from '../../src/lib/types';

/** A fixed local time used by tests: 10:00 on the 3rd day after launch. */
export const TEST_NOW = new Date(2026, 9, 30, 10, 0, 0);

export const LEVELS = levels as Puzzle[];

export function todaysPuzzle(now = TEST_NOW) {
  return puzzleForDate(puzzles as Puzzle[], localDateKey(now))!;
}

/**
 * Answers `/api/puzzle/<date>` from the Puzzle list with no "today somewhere"
 * gate, since the browser clock is faked but the Worker's isn't.
 */
export async function servePuzzles(page: Page) {
  // On the context, not the page, so requests that pass through the service worker are caught too.
  await page.context().route('**/api/puzzle/*', (route) => {
    const found = puzzleForDate(puzzles as Puzzle[], new URL(route.request().url()).pathname.split('/').pop()!);
    return found ? route.fulfill({ json: found }) : route.fulfill({ status: 404, json: { error: 'No Puzzle for that date' } });
  });
}

export async function openMenu(page: Page, { now = TEST_NOW, seenHelp = true, state = {} as object } = {}) {
  await page.clock.install({ time: now });
  await servePuzzles(page);
  if (seenHelp) {
    await page.addInitScript((initial) => {
      if (!localStorage.getItem('wordwheel:v1')) localStorage.setItem('wordwheel:v1', JSON.stringify({ seenHelp: true, ...initial }));
    }, state);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WordWheel' })).toBeVisible();
}

export async function openDaily(page: Page, options?: Parameters<typeof openMenu>[1]) {
  await openMenu(page, options);
  const daily = page.getByRole('button', { name: /Daily puzzle/ });
  await expect(daily).toContainText(/Play puzzle #\d+|In progress|Solved/);
  await daily.click();
  await expect(page.getByRole('heading', { name: /Daily #\d+/ })).toBeVisible();
}

/** Types a word on the keyboard and submits it, like a swipe. */
export async function enter(page: Page, word: string) {
  await page.keyboard.type(word);
  await page.keyboard.press('Enter');
}

/** Swipes across the Wheel tiles that spell `word`, with the mouse. */
export async function swipe(page: Page, word: string) {
  const tiles = await page.locator('.wheel .tile').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { ch: el.textContent ?? '', id: el.getAttribute('data-id'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  const used = new Set<string | null>();
  const points = [...word].map((ch) => {
    const tile = tiles.find((t) => t.ch === ch && !used.has(t.id))!;
    used.add(tile.id);
    return tile;
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
}

export const filledCells = (page: Page) => page.locator('.cell.got');
