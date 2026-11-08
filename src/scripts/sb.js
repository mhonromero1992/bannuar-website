/**
 * The few calls the website makes to Bannuar's Supabase project, over plain REST (no client
 * library to download). The URL and the public key come from the page (data-sb-url, data-sb-key).
 * Row level security in the database decides what these calls may do: add an application or a
 * proposal request, read open job openings, check a certificate code. Nothing else.
 */
const root = document.documentElement;
const URL_ = root.dataset.sbUrl || '';
const KEY = root.dataset.sbKey || '';

export const connected = Boolean(URL_ && KEY);

export class SbError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function headers(extra = {}) {
  const h = { apikey: KEY, ...extra };
  // legacy anon keys are JWTs and also go in Authorization; new publishable keys go in apikey only
  if (KEY.startsWith('eyJ')) h.Authorization = `Bearer ${KEY}`;
  return h;
}

async function call(path, init = {}, timeoutMs = 20000) {
  if (!connected) throw new SbError(0, 'not_connected');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(URL_ + path, { ...init, signal: ctrl.signal });
  } catch (e) {
    throw new SbError(0, e?.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let body = {};
    try {
      body = await res.json();
    } catch {
      // not JSON
    }
    throw new SbError(res.status, body.message || body.error || res.statusText, body.code);
  }
  return res;
}

export async function insert(table, row) {
  await call(`/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(row),
  });
}

export async function select(table, query) {
  const res = await call(`/rest/v1/${table}?${query}`, { headers: headers({ Accept: 'application/json' }) });
  return res.json();
}

export async function rpc(name, args) {
  const res = await call(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(args),
  });
  return res.json();
}

export async function upload(bucket, path, file) {
  await call(
    `/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: headers({ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false', 'cache-control': '3600' }),
      body: file,
    },
    60000,
  );
  return path;
}

/** A message a person can act on, from a database or network error. */
export function explain(err) {
  if (!(err instanceof SbError)) return 'Something went wrong. Please try again.';
  if (err.message === 'not_connected') return 'Online sending is not connected yet.';
  if (err.message === 'network') return 'No connection. Check your signal and try again.';
  if (err.message === 'timeout') return 'The connection is slow and the request timed out. Please try again.';
  // messages raised on purpose by the database are written for people (codes 22023, P0001)
  if (err.code === '22023' || err.code === 'P0001') return err.message;
  if (err.status === 413) return 'The file is too large. Attach a file under 5 MB.';
  if (err.status === 415 || /mime/i.test(err.message)) return 'Attach a PDF, JPG or PNG file.';
  return 'The request could not be sent. Please try again in a moment.';
}
