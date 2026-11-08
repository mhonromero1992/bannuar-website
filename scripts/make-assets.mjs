/**
 * Renders the hero posters (the first paint before WebGL starts) and the share image from the site
 * itself. Run with the preview server up:  npm run build && npm run preview  then  npm run assets
 */
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Playwright is the machine's own install (no pinned copy in this project), as in the shrine site
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.SITE_URL || 'http://127.0.0.1:4321';
const out = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const HIDE = '.nav,.dock,.hero__wrap,.hero__shade,.hero__controls{display:none!important}';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function poster(name, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/?poster`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE });
  await page.waitForFunction(() => window.__heroReady === true, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  const png = await page.locator('[data-hero-scene]').screenshot();
  await sharp(png).webp({ quality: 74 }).toFile(out(`images/hero-poster-${name}.webp`));
  await sharp(png).jpeg({ quality: 78, mozjpeg: true }).toFile(out(`images/hero-poster-${name}.jpg`));
  await page.close();
  console.log(`hero-poster-${name}: ${width}x${height}`);
}

await poster('landscape', 1600, 1000);
await poster('portrait', 900, 1600);

// share image: the first screen as people see it
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '.dock,.hero__controls{display:none!important} .hero{min-height:630px!important}' });
await page.waitForTimeout(3500);
const og = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
await sharp(og).jpeg({ quality: 82, mozjpeg: true }).toFile(out('og.jpg'));
console.log('og.jpg: 1200x630');

await browser.close();
