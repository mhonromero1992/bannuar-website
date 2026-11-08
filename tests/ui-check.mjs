/**
 * The site's UI self-test, in Chromium, against the built site:
 *   npm run build && npm run preview   (in one terminal)
 *   npm run test:ui                    (in another)
 *
 * Every page at 1440, 1024, 768, 390 and 320 px, then the interactions one by one. The Supabase
 * project is mocked: the test writes a mock address into each page and answers the API calls
 * itself, so the forms, openings and certificate check are tested connected and not connected.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321';
const MOCK = 'https://mock.supabase.test';
const PAGES = ['/', '/about/', '/careers/', '/proposal/', '/verify/', '/privacy/', '/does-not-exist/'];
const WIDTHS = [1440, 1024, 768, 390, 320];
const SHOTS = new URL('./shots/', import.meta.url);
mkdirSync(SHOTS, { recursive: true });

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) passed++;
  else failures.push(`${name}${detail ? `: ${detail}` : ''}`);
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${!ok && detail ? ` (${detail})` : ''}`);
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** The built pages carry Bannuar's real Supabase project; tests swap it for the mock or for none. */
const SB_ATTRS = /data-sb-url(?:="[^"]*")? data-sb-key(?:="[^"]*")?/;
const MOCK_KEY = 'sb_publishable_mock';
const realHits = [];

/**
 * Every context starts disconnected: the pages' Supabase address is blanked, and any request to a
 * real Supabase host is cut and recorded, so a test can never write into the live database.
 */
async function guarded(options) {
  const context = await browser.newContext(options);
  await context.route(/^https:\/\/[a-z0-9-]+\.supabase\.co\//, (route) => {
    realHits.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  await context.route(`${BASE}/**`, async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    const body = (await res.text()).replace(SB_ATTRS, 'data-sb-url="" data-sb-key=""');
    return route.fulfill({ response: res, body });
  });
  return context;
}

/** A page whose HTML carries the mock Supabase address, with API calls answered by `handlers`. */
async function connectedPage(context, handlers = {}) {
  const page = await context.newPage();
  const calls = [];
  await page.route(`${BASE}/**`, async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    const body = (await res.text()).replace(SB_ATTRS, `data-sb-url="${MOCK}" data-sb-key="${MOCK_KEY}"`);
    return route.fulfill({ response: res, body });
  });
  await page.route(`${MOCK}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = `${req.method()} ${url.pathname}`;
    calls.push({ key, url, headers: req.headers(), body: req.postData(), buffer: req.postDataBuffer() });
    const handler = handlers[key];
    if (!handler) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"no mock"}' });
    return handler(route, req, url);
  });
  return { page, calls };
}

const json = (status, data) => (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

// ------------------------------------------------------------------ 1. every page at every width
const linkStatus = new Map();
for (const width of WIDTHS) {
  const context = await guarded({ viewport: { width, height: width < 700 ? 844 : 900 } });
  for (const path of PAGES) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const tag = `${path} @${width}`;
    if (path === '/does-not-exist/') check(`${tag} answers 404`, res.status() === 404, String(res.status()));
    // scroll through so lazy images load and armed moments settle
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const vis = (el) => {
        const s = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0 && !el.closest('[hidden], dialog:not([open]), .form__honey, [aria-hidden="true"]');
      };
      const vw = document.documentElement.clientWidth;
      const overflow = document.documentElement.scrollWidth > vw + 1;
      const spill = [...document.querySelectorAll('main *, header *, footer *')]
        .filter((el) => vis(el) && !el.closest('.hero__scene, .footer__glow, .footer__sun, .pagehead__sky, .drops svg'))
        .filter((el) => el.getBoundingClientRect().right > vw + 1)
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
      const imgs = [...document.images];
      const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy').map((i) => i.src);
      const noAlt = imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.src);
      const h1 = document.querySelectorAll('h1').length;
      const levels = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
      let skipped = null;
      levels.forEach((l, i) => { if (i && l > levels[i - 1] + 1) skipped = `h${levels[i - 1]} to h${l}`; });
      const emDash = document.body.innerText.includes('—');
      const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea')].filter(vis);
      const nameOf = (el) => {
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        const by = el.getAttribute('aria-labelledby');
        if (by) return by.split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ');
        if (el.id && document.querySelector(`label[for="${el.id}"]`)) return document.querySelector(`label[for="${el.id}"]`).textContent;
        if (el.closest('label')) return el.closest('label').textContent;
        return el.textContent || el.getAttribute('title') || el.getAttribute('alt') || '';
      };
      const unnamed = controls.filter((el) => !nameOf(el).trim()).map((el) => el.outerHTML.slice(0, 80));
      const small = vw <= 400
        ? controls
            .filter((el) => !el.closest('p, li:not(.opening), address, .consent, .field__error'))
            .map((el) => {
              const target = el.matches('input[type=radio], input[type=checkbox]') ? el.closest('label') || el : el;
              const b = target.getBoundingClientRect();
              return { el, h: b.height, w: b.width };
            })
            .filter(({ h, w }) => h < 44 || w < 44)
            .map(({ el, h }) => `${el.tagName.toLowerCase()} "${(el.textContent || el.value || '').trim().slice(0, 24)}" ${Math.round(h)}px`)
        : [];
      const internal = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/') || h.startsWith('#'));
      const anchors = internal.filter((h) => h.startsWith('#') && h.length > 1 && !document.getElementById(h.slice(1)));
      return { overflow, spill, broken, noAlt, h1, skipped, emDash, unnamed, small, internal, anchors, lang: document.documentElement.lang, title: document.title };
    });

    check(`${tag} no sideways scroll`, !r.overflow);
    check(`${tag} nothing past the right edge`, r.spill.length === 0, r.spill.join(', '));
    check(`${tag} images load`, r.broken.length === 0, r.broken.join(', '));
    check(`${tag} every image has alt`, r.noAlt.length === 0, r.noAlt.join(', '));
    check(`${tag} one h1`, r.h1 === 1, String(r.h1));
    check(`${tag} no skipped heading levels`, !r.skipped, r.skipped || '');
    check(`${tag} no em dashes`, !r.emDash);
    check(`${tag} every control has a name`, r.unnamed.length === 0, r.unnamed.join(' | '));
    if (width <= 400) check(`${tag} 44 px tap targets`, r.small.length === 0, r.small.slice(0, 4).join(', '));
    check(`${tag} lang and title`, r.lang === 'en' && r.title.length > 5);
    check(`${tag} in-page anchors exist`, r.anchors.length === 0, r.anchors.join(', '));
    check(`${tag} no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    for (const href of r.internal) {
      const target = href.split('#')[0];
      if (!target || linkStatus.has(target)) continue;
      const res2 = await page.request.get(BASE + target);
      linkStatus.set(target, res2.status());
    }
    if (width === 1440 || width === 390) await page.screenshot({ path: new URL(`${path.replace(/\//g, '_') || 'home'}-${width}.png`, SHOTS).pathname, fullPage: true });
    await page.close();
  }
  await context.close();
}
const deadLinks = [...linkStatus].filter(([, s]) => s !== 200);
check('every internal link answers 200', deadLinks.length === 0, deadLinks.map(([h, s]) => `${h} ${s}`).join(', '));

// ------------------------------------------------------------------ 2. interactions
console.log('\nInteractions');
const desktop = await guarded({ viewport: { width: 1440, height: 900 } });
const phone = await guarded({ viewport: { width: 390, height: 844 }, hasTouch: true });

{
  // skip link, keyboard first stop
  const page = await desktop.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  check('Tab reaches the skip link first', await page.evaluate(() => document.activeElement?.classList.contains('skip-link')));
  const shadow = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  check('the skip link shows a focus halo', shadow !== 'none');
  await page.keyboard.press('Enter');
  check('the skip link moves focus to the content', await page.evaluate(() => document.activeElement?.id === 'main'));

  // the hero scene starts and can be paused
  await page.waitForSelector('.hero__scene.is-live canvas', { timeout: 15000 }).catch(() => null);
  check('the hero scene starts (WebGL)', await page.evaluate(() => Boolean(document.querySelector('.hero__scene.is-live canvas'))));
  const pause = page.locator('[data-hero-pause]');
  check('the pause control appears with the scene', await pause.isVisible());
  await pause.click();
  check('pause: aria-pressed and label change', (await pause.getAttribute('aria-pressed')) === 'true' && /Play/.test(await pause.innerText()));
  await pause.click();

  // shift ring
  await page.locator('label:has(input[name="coverage-preview"][value="day"])').click();
  await page.waitForTimeout(900); // the arc draws in over 700 ms
  const ring = await page.evaluate(() => ({
    day: getComputedStyle(document.querySelector('[data-arc="day"]')).strokeDashoffset,
    full: getComputedStyle(document.querySelector('[data-arc="24h"]')).strokeDashoffset,
    href: document.querySelector('[data-ring-cta]').getAttribute('href'),
    label: document.querySelector('[data-ring-label]').textContent,
    hours: document.querySelector('[data-ring-hours]').textContent,
  }));
  check('ring: Daytime draws its arc and hides the others', parseFloat(ring.day) === 0 && parseFloat(ring.full) === 1, JSON.stringify(ring));
  check('ring: the button carries the chosen coverage', ring.href === '/proposal/?coverage=day', ring.href);
  check('ring: centre label and hours follow', ring.label === 'Daytime' && /daylight/.test(ring.hours));

  // checklist kept on the device
  const boxes = page.locator('[data-checklist] input[type="checkbox"]');
  await page.locator('[data-checklist] label').nth(0).click();
  await page.locator('[data-checklist] label').nth(2).click();
  check('checklist: count follows the ticks', (await page.locator('[data-checklist-count]').innerText()) === '2 of 8 ready');
  await page.reload({ waitUntil: 'networkidle' });
  check('checklist: ticks survive a reload', (await boxes.nth(0).isChecked()) && (await boxes.nth(2).isChecked()));
  await page.locator('[data-checklist-reset]').click();
  check('checklist: clear empties it', (await page.locator('[data-checklist-count]').innerText()) === '0 of 8 ready');

  // the blood drive's 63 drops
  check('blood drive shows 63 drops', (await page.locator('.drop').count()) === 63);
  await page.locator('[data-drops]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  check('drops fill when they come into view', await page.evaluate(() => document.querySelector('[data-drops]').classList.contains('is-filled')));
  await page.close();
}

{
  // menu sheet on a phone
  const page = await phone.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const menu = page.locator('[data-menu-open]');
  await menu.click();
  check('menu: opens as a dialog', await page.evaluate(() => document.getElementById('menu-sheet').open));
  check('menu: button says it is expanded', (await menu.getAttribute('aria-expanded')) === 'true');
  for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
  check('menu: Tab stays inside the sheet', await page.evaluate(() => document.getElementById('menu-sheet').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  check('menu: Escape closes it', !(await page.evaluate(() => document.getElementById('menu-sheet').open)));
  check('menu: focus returns to the button', await page.evaluate(() => document.activeElement?.hasAttribute('data-menu-open')));

  // phone dock
  check('dock: hidden on the first screen', !(await page.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-shown'))));
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(300);
  check('dock: shows after the first screen', await page.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-shown')));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  check('dock: steps aside for the footer', !(await page.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-shown'))));
  await page.close();
}

{
  // not connected: honest messages, nothing pretends to send
  const page = await desktop.newPage();
  await page.goto(BASE + '/proposal/', { waitUntil: 'networkidle' });
  await page.locator('form[data-form="proposal"] [type="submit"]').click();
  const errs = await page.locator('form[data-form="proposal"] .field__error:not(:empty)').count();
  check('proposal: empty form shows errors under the fields', errs >= 4, String(errs));
  check('proposal: focus goes to the first problem', await page.evaluate(() => document.activeElement?.name === 'company'));
  await page.fill('#p-company', 'Acme Mart');
  await page.fill('#p-name', 'Lorna Cruz');
  await page.fill('#p-phone', '(072) 555 0101');
  await page.locator('.consent-field input').check();
  await page.locator('form[data-form="proposal"] [type="submit"]').click();
  check('proposal offline: says it is not connected, no success shown',
    /not connected/.test(await page.locator('form[data-form="proposal"] [data-status]').innerText()) && (await page.locator('#proposal-done').isHidden()));

  await page.goto(BASE + '/careers/', { waitUntil: 'networkidle' });
  check('openings offline: explains where the list will appear', await page.locator('[data-state="offline"]').isVisible());
  await page.goto(BASE + '/verify/', { waitUntil: 'networkidle' });
  await page.fill('#page-verify-code', 'k7qm 3xpd 8rta');
  await page.locator('#page-verify-code').press('Enter');
  check('verify offline: says checking is not connected', /not connected/.test(await page.locator('#page-verify-result').innerText()));
  await page.close();
}

{
  // connected: the proposal request reaches the database
  const { page, calls } = await connectedPage(desktop, { 'POST /rest/v1/inquiries': (route) => route.fulfill({ status: 201, body: '' }) });
  await page.goto(BASE + '/proposal/?coverage=night', { waitUntil: 'networkidle' });
  check('proposal: ?coverage=night pre-selects Night', await page.locator('input[name="coverage"][value="night"]').isChecked());
  check('proposal: the ring shows Night', (await page.locator('[data-ring-label]').textContent()) === 'Night');
  await page.fill('#p-company', 'Acme Mart');
  await page.fill('#p-name', 'Lorna Cruz');
  await page.fill('#p-phone', '0917 555 0101');
  await page.fill('#p-email', 'not-an-email');
  await page.fill('#p-guards', '9000');
  await page.locator('.consent-field input').check();
  await page.locator('form[data-form="proposal"] [type="submit"]').click();
  check('proposal: bad email and guard count are caught', /email address/.test(await page.locator('#p-email-err').innerText()) && /5,000/.test(await page.locator('#p-guards-err').innerText()));
  check('proposal: nothing is sent while fields are wrong', calls.length === 0);
  await page.fill('#p-email', 'lorna@acme.ph');
  await page.fill('#p-guards', '4');
  await page.selectOption('#p-type', 'commercial');
  await page.locator('form[data-form="proposal"] [type="submit"]').click();
  await page.waitForSelector('#proposal-done:not([hidden])', { timeout: 5000 }).catch(() => null);
  const sent = calls.find((c) => c.key === 'POST /rest/v1/inquiries');
  const row = sent ? JSON.parse(sent.body) : {};
  check('proposal: one insert into inquiries', Boolean(sent));
  check('proposal: the row carries the answers', row.company === 'Acme Mart' && row.guards_needed === 4 && row.coverage === 'night' && row.site_type === 'commercial' && row.privacy_consent === true, JSON.stringify(row));
  check('proposal: sends the publishable key as apikey only, asks for no data back', sent?.headers.apikey === MOCK_KEY && !sent?.headers.authorization && /return=minimal/.test(sent?.headers.prefer || ''));
  check('proposal: success shown after the database answers', await page.locator('#proposal-done').isVisible());
  await page.close();
}

{
  // connected: a database refusal is shown as written
  const { page } = await connectedPage(desktop, {
    'POST /rest/v1/inquiries': json(400, { code: 'P0001', message: 'We already have your request. The office will call you.' }),
  });
  await page.goto(BASE + '/proposal/', { waitUntil: 'networkidle' });
  await page.fill('#p-company', 'Acme Mart');
  await page.fill('#p-name', 'Lorna Cruz');
  await page.fill('#p-phone', '0917 555 0101');
  await page.locator('.consent-field input').check();
  await page.locator('form[data-form="proposal"] [type="submit"]').click();
  await page.waitForTimeout(500);
  check('proposal: the database message reaches the person', /already have your request/.test(await page.locator('form[data-form="proposal"] [data-status]').innerText()));
  check('proposal: the form stays for another try', await page.locator('form[data-form="proposal"]').isVisible());
  await page.close();
}

{
  // connected: openings and an application with a resume
  const openings = [
    { id: '11111111-1111-4111-8111-111111111111', title: 'Security Guard', location: 'San Fernando, La Union', employment_type: 'full_time', summary: 'Day and night shifts at a commercial post.', qualifications: ['Licensed security guard'], requirements: [], slots: 3, closes_on: null },
    { id: '22222222-2222-4222-8222-222222222222', title: 'Lady Guard', location: 'San Juan, La Union', employment_type: 'reliever', summary: null, qualifications: [], requirements: [], slots: null, closes_on: '2026-12-15' },
  ];
  const { page, calls } = await connectedPage(desktop, {
    'GET /rest/v1/job_openings': json(200, openings),
    'POST /storage/v1/object/applications/incoming': (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"Key":"applications/x"}' }),
    'POST /rest/v1/job_applications': (route) => route.fulfill({ status: 201, body: '' }),
  });
  // storage paths include the file name, so match by prefix
  await page.route(`${MOCK}/storage/v1/object/applications/incoming/**`, async (route) => {
    calls.push({ key: 'UPLOAD', url: new URL(route.request().url()), headers: route.request().headers(), buffer: route.request().postDataBuffer() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"Key":"applications/incoming/x"}' });
  });
  await page.goto(BASE + '/careers/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.opening', { timeout: 5000 }).catch(() => null);
  check('openings: two posts listed', (await page.locator('.opening').count()) === 2);
  check('openings: each is offered in the form', (await page.locator('select[name="job_opening_id"] option').count()) === 3);
  await page.locator('[data-pick="22222222-2222-4222-8222-222222222222"]').click();
  check('openings: Apply picks that post in the form', (await page.locator('select[name="job_opening_id"]').inputValue()) === '22222222-2222-4222-8222-222222222222');

  await page.fill('#a-first', 'Rico');
  await page.fill('#a-last', 'Abad');
  await page.fill('#a-mobile', '0918 222 333');
  await page.fill('#a-city', 'Agoo');
  await page.locator('label.choice__item:has(input[name="has_license"][value="yes"])').click();
  check('application: licence fields appear for a licensed guard', await page.locator('[data-license-fields]').isVisible());
  await page.fill('#a-lic-no', 'LIC-2024-1234');
  await page.locator('form[data-form="application"] .consent-field input').check();
  await page.locator('form[data-form="application"] [type="submit"]').click();
  check('application: a short mobile number is caught', /0917 123 4567/.test(await page.locator('#a-mobile-err').innerText()));
  await page.fill('#a-mobile', '0918 222 3333');
  await page.setInputFiles('#a-file', { name: 'My Resume (2026).pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
  await page.locator('form[data-form="application"] [type="submit"]').click();
  await page.waitForSelector('#application-done:not([hidden])', { timeout: 6000 }).catch(() => null);
  const up = calls.find((c) => c.key === 'UPLOAD');
  const ins = calls.find((c) => c.key === 'POST /rest/v1/job_applications');
  const app = ins ? JSON.parse(ins.body) : {};
  check('application: the file is uploaded to applications/incoming', Boolean(up) && /\/applications\/incoming\/.+-my-resume-2026\.pdf$/.test(up.url.pathname), up?.url.pathname);
  check('application: the row points to the uploaded file', /^incoming\/.+-my-resume-2026\.pdf$/.test(app.resume_path || ''), app.resume_path);
  check('application: the row carries the answers', app.first_name === 'Rico' && app.has_license === true && app.license_no === 'LIC-2024-1234' && app.job_opening_id === '22222222-2222-4222-8222-222222222222' && app.privacy_consent === true, JSON.stringify(app));
  check('application: success shown', await page.locator('#application-done').isVisible());
  await page.close();
}

{
  // connected: the certificate check, every answer
  const answers = {
    'VALI-DCOD-E234': { status: 'valid', certificate_no: 'COE-2026-000123', employee_name: 'Bea Lim', position: 'Lady Guard', date_hired: '2023-01-10', date_separated: null, issued_at: '2026-11-08T03:00:00Z' },
    'REVO-KEDC-ODE2': { status: 'revoked', certificate_no: 'COE-2026-000124', revoked_at: '2026-11-09T03:00:00Z' },
  };
  const { page, calls } = await connectedPage(desktop, {
    'POST /rest/v1/rpc/verify_certificate': (route, req) => {
      const code = JSON.parse(req.postData()).p_code;
      return json(200, answers[code] || { status: 'not_found' })(route);
    },
  });
  await page.goto(BASE + '/verify/?code=vali-dcod-e234', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const v = await page.locator('#page-verify-result').innerText();
  check('verify: ?code= checks on arrival', /genuine/.test(v) && /Bea Lim/.test(v) && /to the present/.test(v), v.slice(0, 120));
  check('verify: the code is sent normalised', JSON.parse(calls[0]?.body || '{}').p_code === 'VALI-DCOD-E234');
  await page.fill('#page-verify-code', 'REVO KEDC ODE2');
  await page.locator('#page-verify-code').press('Enter');
  await page.waitForTimeout(400);
  check('verify: a withdrawn certificate says so', /withdrawn/.test(await page.locator('#page-verify-result').innerText()));
  await page.fill('#page-verify-code', 'AAAA-BBBB-CCCC');
  await page.locator('#page-verify-code').press('Enter');
  await page.waitForTimeout(400);
  check('verify: an unknown code says so', /No certificate has this code/.test(await page.locator('#page-verify-result').innerText()));
  await page.fill('#page-verify-code', '123');
  await page.locator('#page-verify-code').press('Enter');
  check('verify: a short code is caught before sending', /12 letters/.test(await page.locator('#page-verify-error').innerText()) && calls.length === 3);
  await page.close();

  const { page: p2 } = await connectedPage(desktop, { 'POST /rest/v1/rpc/verify_certificate': (route) => route.abort('failed') });
  await p2.goto(BASE + '/verify/', { waitUntil: 'networkidle' });
  await p2.fill('#page-verify-code', 'AAAA-BBBB-CCCC');
  await p2.locator('#page-verify-code').press('Enter');
  await p2.waitForTimeout(500);
  check('verify: no signal gives a plain message', /No connection/.test(await p2.locator('#page-verify-result').innerText()));
  await p2.close();
}

{
  // reduced motion: everything visible, nothing moving, no WebGL
  const ctx = await guarded({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const rm = await page.evaluate(() => ({
    canvas: Boolean(document.querySelector('.hero__scene canvas')),
    pauseHidden: document.querySelector('[data-hero-pause]').hidden,
    titleOpacity: getComputedStyle(document.querySelector('.hero__title .line > span')).transform,
    ledeOpacity: getComputedStyle(document.querySelector('.hero__lede')).opacity,
    highlightArmed: document.querySelector('[data-highlight]').classList.contains('is-armed'),
    dropsArmed: document.querySelector('[data-drops]').classList.contains('is-armed'),
  }));
  check('reduced motion: no WebGL scene, the poster stays', !rm.canvas);
  check('reduced motion: no pause control without motion', rm.pauseHidden);
  check('reduced motion: hero text fully shown', rm.ledeOpacity === '1' && (rm.titleOpacity === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(rm.titleOpacity)), JSON.stringify(rm));
  check('reduced motion: moments stay still and readable', !rm.highlightArmed && !rm.dropsArmed);
  await ctx.close();
}

check('no request reached a real Supabase project', realHits.length === 0, realHits.slice(0, 3).join(', '));

await desktop.close();
await phone.close();
await browser.close();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
