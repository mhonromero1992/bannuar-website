# Bannuar Security Agency, Inc. · website

The public website of Bannuar Security Agency, Inc., San Juan, La Union. A static Astro site: seven
pages, a WebGL hero (a town keeping watch through the night until the sunrise, scrubbed by scroll),
and forms that write straight into Bannuar's own Supabase database, the same one the HR portal
([bannuar-portal](https://github.com/mhonromero1992/bannuar-portal)) runs on.

Art direction, palette, type and the reason for every decision: [DESIGN.md](DESIGN.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # static site in dist/
npm run preview      # serve dist/ at http://127.0.0.1:4321
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). Pages are built as folders
(`careers/index.html`), which every host serves at `/careers`. When the domain is known, set it in
`astro.config.mjs` (`site`) and `src/data/site.js` (`SITE.url`) so canonical and share links follow.

## Connect it to Bannuar's database

1. Create the Supabase project and run `supabase/schema.sql` from the portal repository
   (its `supabase/SETUP.md` has the steps).
2. Copy `.env.example` to `.env` (or set the same variables in Vercel → Project → Settings →
   Environment Variables) and rebuild:

| Variable | Value |
|---|---|
| `PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | the `anon` public key (or the publishable key). Never the service role key. |
| `PUBLIC_PORTAL_URL` | optional: the HR portal's address, shown as "Staff sign-in" in the footer |

What the website may do with that key is decided by row level security in the database: add a job
application (and upload its file into `applications/incoming/`), add a proposal request, read open
job openings, and check a certificate code. It cannot read any application, request, employee or
certificate.

Until the variables are set, the forms say plainly that online sending is not connected and point
to the office; nothing pretends to send.

## Pages

| Page | What is on it |
|---|---|
| `/` | The night-watch hero; the name (*bannuar* is Ilocano for hero, the four agencies of the group); guards for companies with the 24-hour shift ring; careers with the documents checklist; the 63-unit blood drive; the certificate check; the office on Diversion Road |
| `/about/` | The group, hometown and leadership, the blood drive, the office, and the sources of every fact |
| `/careers/` | Open posts (live from the database), the documents checklist, the application form with an optional resume upload |
| `/proposal/` | The proposal request form beside the shift ring and the three steps of a request |
| `/verify/` | Check a certificate of employment by its 12-character code |
| `/privacy/` | The privacy notice for the forms (Data Privacy Act of 2012) |
| `/404` | A page not on the roster |

## Before launch: what Bannuar has to confirm or supply

Nothing on the site is invented. Every fact is in `src/data/site.js` with its source. Confirm these
and rebuild:

1. **"About 4,000" security guards** (`GUARDS`) comes from the client brief, not a published
   source. Confirm the figure, or remove it from the hero and the About page.
2. **The office address** (2nd floor, Prime Place Estate, Diversion Road, Panicsican, San Juan) and
   **the president and general manager, Constantino R. Mosuela**, come from a 2025 service
   agreement and an October 2024 La Union provincial government report. Confirm both are current.
3. **The group of four agencies** (Bannuar, Ranniag, Sirib, Ridam) and **the blood drives** come
   from the same provincial report. Confirm.
4. **The documents to prepare** (`DOCUMENTS_TO_PREPARE`) are the documents security guard
   applicants in the Philippines are usually asked for. HR should confirm or edit the list; it
   matches the document types in the portal.
5. **The privacy notice** names the Data Protection Officer only by role, at the office address.
   Add the DPO's name and an email address when Bannuar has them, and confirm how long applications
   are kept.
6. **No phone number or email is published** because none could be verified. Add them to
   `src/data/site.js` and the footer when Bannuar supplies official ones.
7. **The badge** on the site is Bannuar's own file, cut from its white page and nothing else.
   For a crisp app icon and print, ask for the vector original (AI, EPS, SVG or PDF).

## Photographs

Photo slots take Bannuar's own photographs: put `office.jpg`, `hometown.jpg` or `blood-drive.jpg` in
`src/assets/photos/` and rebuild (details in that folder's README). Until then each slot shows a
line-and-light drawing. Stock photographs of guards are not used: they would present strangers as
Bannuar's people.

`npm run fetch:photos` downloads a photograph of the San Juan, La Union coast (Wikimedia Commons,
CC BY-SA 4.0) into the `hometown` slot and credits it in the footer automatically. Wikimedia refused
downloads from the machine this site was built on, so run it once from a normal connection.

## Generated images

`npm run assets` (with `npm run preview` running) renders the hero posters
(`public/images/hero-poster-*.webp|jpg`, the first paint before the 3D scene starts) and the share
image `public/og.jpg` from the site itself. Run it again after changing the hero scene.

## Tests

`npm run test:ui` (with `npm run preview` running) opens every page in Chromium at 1440, 1024, 768,
390 and 320 px and checks: no sideways scroll or content past the edge, images load and have alt
text, one `h1` and no skipped heading levels, no em dashes, every control named, 44 px tap targets on
phones, every internal link and anchor, the 404 status, no console errors. Then it clicks through:
the skip link, the hero scene and its pause control, the shift ring, the checklist (kept across a
reload), the 63 drops, the phone menu (focus kept inside, Escape, focus returned) and the phone
dock; the forms empty, wrong, not connected, refused by the database and sent (the request body
checked field by field, the resume uploaded first); the open posts and "Apply for" picking the post;
the certificate check for a genuine, withdrawn, unknown and malformed code and for no connection;
and reduced motion. The Supabase API is mocked inside the test.

Last run (8 November 2026, production build): **461 passed, 0 failed.**

## Delivery gate (anti-slop, DURING mode)

**Block 1, hard gate: all no.**
- R-02 no em dash in page text: the suite checks every page at every width (0 found).
- R-03 mobile: no overflow at 320 to 1440; 44 px targets on phones; menu sheet and dock tested.
- R-17, R-18, R-36, R-38: the only figures are "about 4,000 guards" (client brief, flagged above),
  "63 units of blood" (provincial government report) and the 12 October 2024 date; no testimonials,
  no client names, no invented phone, email or licence numbers.
- R-23 assets: no logo was drawn or simplified; the badge is Bannuar's own file. Photo slots wait
  for Bannuar's own photographs, with finished drawings meanwhile.
- R-24, R-26: every nav item is a real page; every control acts (forms send to the database or say
  they are not connected; the ring, checklist, certificate check, menu and pause all work).
- R-25 contrast: every text pair computed with the WCAG formula (DESIGN.md section 2), all AA or
  better; red on night is never used for text.
- R-27 states: forms have empty-field errors, wrong-value errors, a busy state, database refusals,
  network errors, not-connected and success; the open posts have loading, empty, error and
  not-connected states; the certificate check has five answers.
- R-28: no FAQ (no real questions to answer yet).
- R-32 keyboard: skip link first; menu dialog traps focus, closes on Escape, returns focus; every
  control reachable; a two-step focus halo everywhere.
- R-35 verified by running: the build, the 461-check browser suite, and screenshots reviewed at
  1440 and 390 for every page.
- R-39 semantics: landmarks, `lang`, unique titles, a visible label on every field,
  `cursor: pointer`, reduced motion stops everything and keeps content visible, the moving hero has
  a pause control.
- R-40: posters and images carry dimensions; the hero poster is an eager `img` with
  `fetchpriority="high"`; three.js loads only when the browser is idle and never with Data Saver or
  reduced motion; no third-party script. Lighthouse and Web Vitals were not measured.

**Block 2, purpose gate.** Glass on two elements only (nav, phone dock). One accent (Bannuar red).
No icon set; the only glyph is the gold beacon. Gradients only inside the sky, the sun and the
artwork. Every motion has a written reason (DESIGN.md section 6).

**Block 3, liveliness.** Dials ENERGY 3 / RHYTHM 3 / MOTION 3 with motion concentrated in the hero
and two dealt moments; one focal point a screen; the beacon motif repeated in the hero, the ring,
the checklist, the drops, the certificate and the footer sun.

**Block 4, craftsmanship.** No template layout, no card grid, no logo bar, no pricing; buttons name
the action ("Request a security proposal", "Apply as a guard", "Check the certificate"); one fixed
theme with its reason (DESIGN.md section 2).

**Not verified here:** real phones, Safari and Firefox; real GPUs (the scene was checked in
Chromium's software renderer); Lighthouse; a live Supabase project (the API was mocked; the
database itself is tested in the portal repository); `npm run fetch:photos`.

## How the design skills were used

Taste Skill set the direction: a *service* site with plain copy, one idea a screen, equal edges,
the client's own pictures, a hero entrance and two dealt moments (the name lighting up, the drops
filling). The owner's brief overrides it on purpose for the 3D hero, the glass and the atmospheric
light; see DESIGN.md section 12. The skill's own scripts were not run (third-party code); its checks
are re-implemented in `tests/ui-check.mjs`. Anti-Slop ran in DURING mode throughout; its delivery
gate is above.
