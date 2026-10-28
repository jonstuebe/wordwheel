import { expect, test } from '@playwright/test';
import { LEVELS, enter, filledCells, openDaily, openMenu, swipe, todaysPuzzle } from './helpers';

test('first visit shows How to play once', async ({ page }) => {
  await openMenu(page, { seenHelp: false });
  const help = page.getByRole('dialog', { name: 'How to play' });
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: "Let's play" }).click();
  await expect(help).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'WordWheel' })).toBeVisible();
  await expect(help).toBeHidden();
});

test('a swipe across the Wheel fills a Grid word', async ({ page }) => {
  const { puzzle } = todaysPuzzle();
  await openDaily(page);
  const word = puzzle.words[0].w;
  await swipe(page, word);
  await expect(filledCells(page)).toHaveCount(word.length);
  await expect(page.getByRole('img', { name: /Grid: 1 of/ })).toBeVisible();
});

test('the Daily puzzle: bonus words, hints, solving, sharing, and one solve a day', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { number, puzzle } = todaysPuzzle();
  await openDaily(page);
  const coins = page.getByTestId('coins');
  await expect(coins).toHaveText('100');

  await enter(page, puzzle.bonus[0]);
  await expect(page.locator('.toast')).toHaveText('Bonus word +5 coins');
  await expect(coins).toHaveText('105');
  await enter(page, puzzle.bonus[0]);
  await expect(page.locator('.toast')).toHaveText('Bonus word already found');

  await page.getByRole('button', { name: 'Reveal a letter for 25 coins' }).click();
  await expect(coins).toHaveText('80');
  await expect(page.locator('.cell.hint, .cell.got')).toHaveCount(1);

  // Three Wheel letters, in an order that spells nothing.
  const words = new Set([...puzzle.words.map((w) => w.w), ...puzzle.bonus]);
  const letters = [...puzzle.letters];
  const miss = letters.flatMap((a, i) => letters.flatMap((b, j) => letters.map((c, k) => (i !== j && j !== k && i !== k ? a + b + c : ''))))
    .find((w) => w && !words.has(w))!;
  await enter(page, miss);
  await expect(page.locator('.preview.bad')).toBeVisible();

  for (const { w } of puzzle.words) await enter(page, w);
  const done = page.getByRole('dialog', { name: 'Daily solved' });
  await expect(done).toBeVisible();
  await expect(done).toContainText('Streak: 1 day');
  await expect(coins).toHaveText('110');

  await done.getByRole('button', { name: 'Share' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(new RegExp(`^WordWheel #${number} · \\d+:\\d\\d\\n${puzzle.words.length} words · 1 hint`));
  for (const { w } of puzzle.words) expect(text).not.toContain(w);

  await done.getByRole('button', { name: 'Main menu' }).click();
  await expect(page.getByRole('button', { name: /Daily puzzle/ })).toContainText(/Solved in \d+:\d\d/);
  await expect(page.getByRole('button', { name: /Daily puzzle/ })).toContainText('1 day streak');

  // Coming back shows the solved Grid, with no more play.
  await page.reload();
  await page.getByRole('button', { name: /Daily puzzle/ }).click();
  await expect(page.getByRole('dialog', { name: 'Daily solved' })).toBeVisible();
});

test('progress and the Wheel order survive a reload', async ({ page }) => {
  const { puzzle } = todaysPuzzle();
  await openDaily(page);
  const order = await page.locator('.wheel text').allTextContents();
  await enter(page, puzzle.words[1].w);
  await page.reload();
  await page.getByRole('button', { name: /Daily puzzle/ }).click();
  await expect(page.locator('.cell.got')).toHaveCount(puzzle.words[1].w.length);
  expect(await page.locator('.wheel text').allTextContents()).toEqual(order);
  await page.getByRole('button', { name: 'Shuffle letters' }).click();
  await expect.poll(() => page.locator('.wheel text').allTextContents()).not.toEqual(order);
});

test('Challenge levels pay 20 coins and move on when the player is ready', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('button', { name: /Challenge/ }).click();
  await expect(page.getByRole('heading', { name: 'Level 1' })).toBeVisible();
  for (const { w } of LEVELS[0].words) await enter(page, w);
  const done = page.getByRole('dialog', { name: 'Level 1 done' });
  await expect(done).toBeVisible();
  await expect(page.getByTestId('coins')).toHaveText('120');
  await done.getByRole('button', { name: 'Next level' }).click();
  await expect(page.getByRole('heading', { name: 'Level 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to menu' }).click();
  await expect(page.getByRole('button', { name: /Challenge/ })).toContainText(`Level 2 of ${LEVELS.length}`);
});
