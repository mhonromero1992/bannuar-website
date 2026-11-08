/** Open job openings, read live from the database; each one can be picked in the application form. */
import { connected, explain, select } from './sb.js';

const box = document.querySelector('[data-openings]');
const picker = document.querySelector('select[name="job_opening_id"]');

const TYPE = { full_time: 'Full time', reliever: 'Reliever', seasonal: 'Seasonal' };
const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  node.append(...kids.filter((k) => k !== null && k !== undefined));
  return node;
}

function state(name, text) {
  box.querySelectorAll('[data-state]').forEach((s) => (s.hidden = s.dataset.state !== name));
  if (text) {
    const s = box.querySelector(`[data-state="${name}"]`);
    if (s) s.textContent = text;
  }
}

async function load() {
  if (!box) return;
  if (!connected) {
    state('offline');
    return;
  }
  state('loading');
  try {
    const rows = await select(
      'job_openings',
      'select=id,title,location,employment_type,summary,qualifications,requirements,slots,closes_on&order=posted_at.desc.nullslast,created_at.desc',
    );
    const list = box.querySelector('[data-openings-list]');
    list.replaceChildren();
    if (!rows.length) {
      state('empty');
      return;
    }
    state('none');
    for (const job of rows) {
      const meta = [job.location, TYPE[job.employment_type], job.slots ? `${job.slots} slot${job.slots > 1 ? 's' : ''}` : null, job.closes_on ? `until ${dateFmt.format(new Date(job.closes_on + 'T00:00:00'))}` : null]
        .filter(Boolean)
        .join(' · ');
      const card = el(
        'li',
        { class: 'opening' },
        el('div', { class: 'opening__top' }, el('h3', {}, job.title), el('p', { class: 'opening__meta' }, meta)),
        job.summary ? el('p', {}, job.summary) : null,
        job.qualifications?.length ? el('ul', { class: 'opening__list' }, ...job.qualifications.map((q) => el('li', {}, q))) : null,
        el('a', { class: 'btn btn--small btn--line opening__apply', href: '#apply', 'data-pick': job.id }, `Apply for ${job.title}`),
      );
      list.append(card);
      if (picker) picker.append(el('option', { value: job.id }, `${job.title} · ${job.location}`));
    }
  } catch (err) {
    state('error', `The open posts could not load. ${explain(err)} You can still apply below.`);
  }
}

box?.addEventListener('click', (e) => {
  const link = e.target.closest('[data-pick]');
  if (link && picker) picker.value = link.dataset.pick;
});

load();
