import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { enter, openDaily, openMenu, todaysPuzzle } from './helpers';

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`no axe violations on the menu, while playing, and when solved (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const { puzzle } = todaysPuzzle();
    await openMenu(page);
    await expectNoViolations(page);
    await page.getByRole('button', { name: /Daily puzzle/ }).click();
    await enter(page, puzzle.words[0].w);
    await expectNoViolations(page);
    for (const { w } of puzzle.words) await enter(page, w);
    await expect(page.getByRole('dialog', { name: 'Daily solved' })).toBeVisible();
    await expectNoViolations(page);
  });
}

test('no axe violations in the help dialog', async ({ page }) => {
  await openMenu(page, { seenHelp: false });
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await expectNoViolations(page);
});

test('@mobile the game fits a phone screen without scrolling', async ({ page }) => {
  await openDaily(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await expect(page.getByRole('button', { name: 'Reveal a letter for 25 coins' })).toBeInViewport();
});
