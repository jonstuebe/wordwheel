import { expect, test, type Route } from '@playwright/test';
import { enter, openMenu, servePuzzles, todaysPuzzle, TEST_NOW } from './helpers';

test("today's Puzzle stays playable offline after the first visit", async ({ page, context }) => {
  const { puzzle } = todaysPuzzle();
  await page.clock.install({ time: TEST_NOW });
  await servePuzzles(page);
  await page.addInitScript(() => localStorage.setItem('wordwheel:v1', localStorage.getItem('wordwheel:v1') ?? JSON.stringify({ seenHelp: true })));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Daily puzzle/ })).toContainText('Play puzzle #');
  // Ensure the service worker controls the page and has precached everything.
  await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: /Daily puzzle/ }).click();
  for (const { w } of puzzle.words) await enter(page, w);
  await expect(page.getByRole('dialog', { name: 'Daily solved' })).toBeVisible();
});

test('offline with nothing cached asks to connect, then loads on retry', async ({ page, context }) => {
  await openMenu(page);
  await page.evaluate(() => localStorage.removeItem('wordwheel:puzzle'));
  // Routes still answer while the context is offline, so fail the API explicitly.
  const disconnected = (route: Route) => route.abort('internetdisconnected');
  await context.route('**/api/puzzle/*', disconnected);
  await context.setOffline(true);
  // A new local day with no cached Puzzle, while still offline.
  await page.clock.setSystemTime(new Date(TEST_NOW.getTime() + 86_400_000));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const daily = page.getByRole('button', { name: /Daily puzzle/ });
  await expect(daily).toContainText("Connect to get today's puzzle");

  // Challenge levels ship with the app, so they still play.
  await page.getByRole('button', { name: /Challenge/ }).click();
  await expect(page.getByRole('heading', { name: 'Level 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to menu' }).click();

  await context.unroute('**/api/puzzle/*', disconnected);
  await daily.click();
  await expect(daily).toContainText('Play puzzle #4');
});

test('after the last Puzzle, players are told to come back tomorrow', async ({ page }) => {
  await openMenu(page, { now: new Date(2031, 0, 1, 10, 0, 0) });
  await expect(page.getByRole('button', { name: /Daily puzzle/ })).toContainText('No puzzle today. Back tomorrow.');
});

test('the API is served by the Worker and refuses future dates', async ({ request }) => {
  const res = await request.get('/api/puzzle/2099-01-01');
  expect(res.status()).toBe(404);
  expect(res.headers()['content-type']).toContain('application/json');
  expect((await request.get('/api/puzzle/not-a-date')).status()).toBe(400);
});

test('manifest is valid for installation', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'WordWheel', short_name: 'WordWheel', display: 'standalone', start_url: '/' });
  const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}${i.purpose ? ':' + i.purpose : ''}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512', '512x512:maskable']));
  for (const icon of manifest.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
});
