# DESIGN.md · Bannuar Security Agency, Inc.

The art direction for every page of this site. Read it before touching a page, component or token.
Every decision carries its reason in one line (anti-slop R-31).

> **Design Read.** Reading this as: a *service* site for a security agency in San Juan, La Union,
> for two audiences: companies that need guards at a post (desktop, office hours) and people who
> want to work as security guards (Android phones on mobile data). The visual language is
> **night watch to sunrise**, taken from the agency's own badge: a guard on duty under the
> Philippine sun.
> **Dial: ENERGY 3 / RHYTHM 3 / MOTION 3**, with motion concentrated in the hero scene and two dealt
> moments; every other section is still and readable at a glance.

---

## 1. What the site is for

| | |
|---|---|
| What it is | Bannuar Security Agency, Inc., a security agency with its office on Diversion Road, Panicsican, San Juan, La Union. About 4,000 security guards. Part of a group with Ranniag, Sirib and Ridam security agencies. |
| Who comes | (1) A company, school, hospital or office that needs guards at a post. (2) A job seeker, often already a licensed guard, applying from a phone. (3) A bank, embassy or employer checking a Bannuar certificate of employment. |
| Main actions | **Request a security proposal** (companies) and **Apply as a guard** (job seekers). Third: **Check a certificate**. |
| Where the forms go | Straight into Bannuar's own database (Supabase), the same one the HR portal reads. Nothing is emailed or kept by a third party. |

### Verified facts only (C-5, R-17, R-38)

Every fact on the site lives in `src/data/site.js` with its source. Nothing is invented: no phone
numbers, emails, founding year, client names, licence numbers, testimonials or coverage areas. Where
Bannuar has not published something, the site leaves it out and the README lists it under
"Before launch".

---

## 2. Colour: the badge at night

The palette comes from Bannuar's badge (the sun, the red shield, the blue roundel) set against the
hours a guard actually works: the night shift, then sunrise.

| Token | Hex | Source | Use |
|---|---|---|---|
| `--night` | `#0B1626` | the sky over a post at 2 a.m.; the navy of a guard's uniform | hero, dark bands, footer |
| `--night-2` | `#13253D` | the same night under a street lamp | raised surfaces on night |
| `--paper` | `#F4F0E6` | parade khaki, sun-bleached | page ground |
| `--paper-2` | `#E9E3D5` | khaki in shade | panels, inputs |
| `--ink` | `#0D1A2B` | | text on paper |
| `--muted` | `#4A5667` | | secondary text on paper (6.55:1) |
| `--sun` | `#F2C230` | the badge's sun, deepened from lemon to gold so it holds on screens | **core colour**: light on night grounds (10.8:1), the beacons, the identity motif |
| `--sun-ink` | `#7A5900` | the sun as ink | gold text on paper (5.67:1) |
| `--red` | `#C4161C` | the badge's shield and name ribbon | **the one accent**: primary buttons, the focus halo, one mark a screen (white on red 6.04:1) |
| `--pale` | `#AEBCCF` | moonlight | secondary text on night (9.42:1) |

R-29: two core colours (night, sun) + one accent (red) + neutrals (paper, ink). Laurel green
(`#2E6B3A`) and dawn orange (`#F2A65A`) appear only inside the artwork and the hero's sky, never as UI.
Red on night is 3.0:1, so red never carries text on a night ground; there it is a shape only.

**Theme (R-21).** One fixed theme with planned night grounds (hero, the name, the certificate band,
the footer). Reason: the story is a night watch that ends at sunrise; the light khaki ground is the
day, and it reads best on phones outdoors. No toggle, so no half-tested mode.

---

## 3. Type: one family, two widths

**Archivo** (variable: weight 100 to 900, width 62% to 125%), self-hosted, one 90 KB file for Latin.

| Role | Setting | Reason |
|---|---|---|
| Display (h1, h2) | width 118%, weight 760, tracking -0.02em | expanded heavy capitals and lower case read like the lettering on a badge or a shoulder patch |
| Labels | width 72%, weight 640, uppercase, tracking 0.06em | condensed like a name tape; short and functional, never a decorative eyebrow above the h1 |
| Body | width 100%, weight 420, 17 to 18 px | plain grotesque, legible on cheap phone screens |
| Codes and figures | tabular numerals | certificate codes and counts line up |

Why not two families: one family in two widths is the discipline of a uniform; the contrast comes
from width, not from a second typeface (R-06).

---

## 4. Layout

- One `.wrap` (max 1240 px; side gutters 16 px on phones, 28 px on tablets, 48 px on desktop). Every
  block starts and ends on its lines (equal edges).
- One idea a screen. Sections are one or two screens tall at 1440 x 900 and grow with their content
  on phones.
- **RHYTHM 3:** every section has its own composition: a full-bleed scene, a single giant word, a
  split with an interactive dial, a stacked checklist, a field of 63 drops, a document specimen, an
  address set large. No card grid, no feature trio, no logo bar.
- Phones: one column; the nav becomes a full-screen sheet; a glass dock at the bottom carries the
  two main actions; 44 px targets.

---

## 5. The identity motif: lights on posts

A single small gold light with a soft glow stands for one guard on duty. It appears as the beacons
in the hero town, the active marker on the shift ring, the bullet of the document checklist, the
drops of the blood drive (in red), the stamp on the certificate specimen and the sun in the footer.
One gesture, repeated, so the site belongs to Bannuar.

---

## 6. Motion (every motion has a reason)

| Motion | Where | Reason |
|---|---|---|
| Hero entrance, once on load | hero text, staggered line reveal (mask, 70 ms steps) | the first screen should feel set up like a shift starting |
| Night to sunrise, scrubbed by scroll | hero scene only | tells the watch in one gesture; it is the page's subject |
| Patrol lights moving on the streets, beacons breathing | hero scene | guards on rounds; the scene is alive without asking for attention |
| Camera follows the pointer a little | hero scene, desktop | depth, so the town reads as a place |
| **Dealt moment 1:** the word lights up as you read | "Bannuar" section | the meaning of the name lands one phrase at a time |
| **Dealt moment 2:** 63 drops fill once | blood drive | the real figure becomes visible as units of blood |
| Shift ring follows the coverage you choose | proposal form | the form answers back: day, night or round the clock |
| Buttons: light follows the pointer, colour and shadow ease | everywhere | premium feedback without moving the button (no translateY) |
| Page to page: a short cross-fade | desktop | continuity between pages; phones navigate instantly |

Never: fade-in on every section, parallax on text, scroll-jacking, bounce. Under
`prefers-reduced-motion: reduce` every animation stops, the hero shows a still frame at the edge of
dawn and nothing stays hidden. The hero scene has a pause control (it moves for longer than five
seconds, R-39).

---

## 7. The hero scene

A low town at night seen from a rise, built in three.js: blocks of buildings with a few lit windows,
streets, **gold beacons at the gates** (guards on duty), **patrol lights** travelling the streets,
stars, and the sun below the horizon. Scrolling the first screen brings the sunrise: the sky warms,
the stars and windows fade, the sun comes up.

- It is drawn in code: no stock image, no model of a real place, no number that suggests real
  coverage. The town is generic on purpose.
- Weight: one WebGL context, about ten draw calls, instanced buildings; pixel ratio capped at 1.75;
  fewer buildings on phones; it stops drawing when off screen or in a background tab.
- First paint is a poster image of the same scene (`public/images/hero-poster-*.webp`, rendered from
  the scene by `npm run assets`); the live scene fades in over it. No WebGL: the poster stays.

---

## 8. Surfaces

- **Glass** on exactly two elements: the top navigation over the hero and the phone dock (R-10).
  Reason: both float over moving content and must stay readable. Fallback without
  `backdrop-filter`: solid night at 94%.
- **Shadows** only where something is lifted: the nav, the dock, the form panel, the certificate
  specimen (R-12).
- **Radius:** 6 px for inputs and buttons, 14 px for panels, full round only for the beacon dot.
  Small radii keep the uniform's crispness (R-11).
- No visible card borders as structure; hierarchy comes from ground, space and type.

## 9. Buttons and focus

One button pair: **primary** (red, white label) and **secondary** (outlined on paper, glass on
night). Hover: colour deepens, a soft light follows the pointer across the face, the shadow grows.
Press: the face darkens and the shadow tightens. Loading: label stays, a thin progress line runs under
it. Disabled: muted, `cursor: not-allowed`. Focus: a soft two-step halo (paper ring then red ring),
never removed. No arrows on buttons by default (R-08).

## 10. Pictures: the client's own, never stock people

- **The badge** is Bannuar's own file, only cut from its white page. No redrawn or simplified logo
  (R-23). A simplified mark for small icons waits for Bannuar's approval and their vector file.
- **Photo slots** for Bannuar's own photographs (`src/assets/photos/`): `post.jpg`, `team.jpg`,
  `office.jpg`, `blood-drive.jpg`. Until a file is there, the slot shows its line-and-light drawing,
  which is finished artwork, not a grey box. Stock photographs of guards are not used: they would
  pass strangers off as Bannuar's people.
- **Place photographs** of San Juan, La Union (Wikimedia Commons, CC BY-SA 4.0) are fetched by
  `npm run fetch:photos` and credited in the footer line.

## 11. Forms

Labels always visible; errors under their own field; a busy state on submit; success only after the
database answers. Without a configured Supabase project the forms say plainly that online sending is
not connected yet and point to the office, instead of pretending to send. Honeypot field against
bots; the database also limits repeat submissions.

---

## 12. Where the owner's brief overrides the Taste Skill

Taste Skill classes this site as *service*: photographs lead, flat grounds, WebGL only for a product
render. The owner's master prompt asks for an interactive 3D hero, Liquid Glass and atmospheric
light. The brief wins on those three, on purpose and contained: the 3D lives in the hero only, glass
on two elements only, gradients only inside the sky and the artwork. Everything else follows the
skill: plain copy with a noun in every heading, one section a screen, equal edges, the client's own
pictures, a hero entrance and two dealt moments, quiet hover feedback, addresses without house
numbers.
