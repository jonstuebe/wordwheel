// Renders PWA icons from SVG using the bundled Playwright Chromium.
// Usage: npm run icons
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);
const outDir = new URL('icons/', root);
await mkdir(outDir, { recursive: true });

const favicon = await readFile(new URL('favicon.svg', root), 'utf8');
// Full-bleed variant: maskable icons and iOS add their own rounded mask, and
// keep the artwork inside the central 80% safe zone.
const fullBleed = favicon.replace('rx="96" ', '');
const maskable = fullBleed.replace(
  /<g id="art">[\s\S]*<\/svg>/,
  (inner) => `<g transform="translate(256 256) scale(0.78) translate(-256 -256)">${inner.replace('</svg>', '')}</g></svg>`,
);

const targets = [
  { file: 'icon-192.png', size: 192, svg: favicon },
  { file: 'icon-512.png', size: 512, svg: favicon },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, svg } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.locator('svg').screenshot({ path: new URL(file, outDir).pathname, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
