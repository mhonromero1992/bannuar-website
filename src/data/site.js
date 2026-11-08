/**
 * Every fact the site states, with where it comes from (anti-slop C-5, R-17, R-38).
 * Change a fact here and every page follows. Anything not listed here is not on the site.
 */

const SOURCES = {
  brief: {
    label: 'Client brief relayed by House of Gaia, 8 November 2026',
    url: null,
  },
  emb: {
    label: 'Service agreement between DENR EMB Region 1 and Bannuar Security Agency, Inc. (2025)',
    url: 'https://www.scribd.com/document/991500649/EMB-R1',
  },
  pglu2024: {
    label: 'Provincial Government of La Union: "BDH collects 63 blood units in blood donation drive" (October 2024)',
    url: 'https://launion.gov.ph/?p=104197',
  },
};

export const SITE = {
  name: 'Bannuar Security Agency, Inc.',
  short: 'Bannuar',
  /** Update when the domain is set; canonical and share links follow it (also astro.config.mjs). */
  url: 'https://bannuar-website.vercel.app',
  description:
    'Bannuar Security Agency, Inc. posts security guards at companies, offices and sites from its office on Diversion Road, San Juan, La Union. Request a proposal or apply as a guard.',
};

export const NAME = {
  word: 'bannuar',
  language: 'Ilocano',
  means: 'hero',
  source: SOURCES.brief,
};

export const GUARDS = {
  count: 4000,
  /** As written on the page. Confirm the figure with Bannuar before launch. */
  label: 'About 4,000',
  source: SOURCES.brief,
};

export const OFFICE = {
  building: 'Prime Place Estate',
  floor: '2nd floor',
  street: 'Diversion Road',
  barangay: 'Panicsican',
  town: 'San Juan',
  province: 'La Union',
  /** The search Google Maps runs when someone taps Get directions. */
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Prime Place Estate, Diversion Road, Panicsican, San Juan, La Union'),
  sources: [SOURCES.emb, SOURCES.pglu2024],
};

export const LEADER = {
  name: 'Constantino R. Mosuela',
  title: 'President and General Manager',
  sources: [SOURCES.emb, SOURCES.pglu2024],
};

/** The provincial report calls Bannuar Security Agency, Inc. a grouping of these four agencies. */
export const GROUP = {
  agencies: ['Bannuar', 'Ranniag', 'Sirib', 'Ridam'],
  source: SOURCES.pglu2024,
};

export const BLOOD_DRIVE = {
  date: '2024-10-12',
  dateLabel: '12 October 2024',
  units: 63,
  hospital: 'Bacnotan District Hospital',
  place: 'Bannuar office, Barangay Panicsican',
  cadence: 'every quarter',
  source: SOURCES.pglu2024,
};

/**
 * Documents a security guard applicant in the Philippines is usually asked for. They match the
 * document types in the portal's database. Bannuar's HR should confirm the list before launch.
 */
export const DOCUMENTS_TO_PREPARE = [
  { id: 'birth', label: 'PSA birth certificate' },
  { id: 'nbi', label: 'NBI clearance' },
  { id: 'police', label: 'Police clearance' },
  { id: 'barangay', label: 'Barangay clearance' },
  { id: 'drug', label: 'Drug test result' },
  { id: 'neuro', label: 'Neuro-psychiatric examination' },
  { id: 'diploma', label: 'Diploma or transcript of records' },
  { id: 'license', label: 'Security guard license (LESP), if you already have one' },
];

export const COVERAGE = [
  { value: 'day', label: 'Daytime', hours: 'One shift in daylight', from: 6, to: 18 },
  { value: 'night', label: 'Night', hours: 'One shift through the night', from: 18, to: 30 },
  { value: '24h', label: 'Round the clock', hours: 'Every hour, every day', from: 0, to: 24 },
  { value: 'event', label: 'One event', hours: 'The hours of your event', from: 16, to: 22 },
];

export const SITE_TYPES = [
  { value: 'office', label: 'Office or bank' },
  { value: 'commercial', label: 'Store, mall or restaurant' },
  { value: 'industrial', label: 'Factory, warehouse or plant' },
  { value: 'residential', label: 'Subdivision or condominium' },
  { value: 'school', label: 'School or campus' },
  { value: 'hospital', label: 'Hospital or clinic' },
  { value: 'government', label: 'Government office' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Something else' },
];

export const EDUCATION = [
  { value: 'high_school', label: 'High school graduate' },
  { value: 'senior_high', label: 'Senior high school graduate' },
  { value: 'vocational', label: 'Vocational course' },
  { value: 'college_level', label: 'Some college' },
  { value: 'college_graduate', label: 'College graduate' },
];

export const ALL_SOURCES = Object.values(SOURCES);

/**
 * Bannuar's Supabase project, the same one the HR portal uses. Both values are public by design:
 * they reach every visitor's browser, and row level security in the database decides what the
 * website may do (add applications and proposal requests, read open posts, check a certificate).
 * An environment variable overrides them: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 * or the NEXT_PUBLIC_ names. Never put the secret (service role) key anywhere in this project.
 */
const DEFAULT_SUPABASE_URL = 'https://bcynizcgdgqznlxuzwjx.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_rwAYUkMVmJxXiT9SnrqlxA_VsMFHK25';
const fromProcess = (name) => (typeof process !== 'undefined' && process.env ? process.env[name] : undefined);
const E = import.meta.env;

export const SUPABASE = {
  url: (E.PUBLIC_SUPABASE_URL || E.NEXT_PUBLIC_SUPABASE_URL || fromProcess('NEXT_PUBLIC_SUPABASE_URL') || DEFAULT_SUPABASE_URL).replace(/\/$/, ''),
  key:
    E.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    E.PUBLIC_SUPABASE_ANON_KEY ||
    E.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    E.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    fromProcess('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    fromProcess('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    DEFAULT_SUPABASE_KEY,
};

/** The HR portal, linked as "Staff sign-in" in the footer once it has an address. */
export const PORTAL_URL = (import.meta.env.PUBLIC_PORTAL_URL ?? '').replace(/\/$/, '');
