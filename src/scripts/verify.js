/** Check a Bannuar certificate of employment by the code printed on it. */
import { connected, explain, rpc } from './sb.js';

const dateFmt = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
const day = (iso) => (iso ? dateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00+08:00` : iso)) : null);

function normalise(raw) {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return v.length === 12 ? `${v.slice(0, 4)}-${v.slice(4, 8)}-${v.slice(8)}` : null;
}

document.querySelectorAll('form[data-verify]').forEach((form) => {
  const input = form.querySelector('input[name="code"]');
  const error = form.querySelector('.field__error');
  const btn = form.querySelector('[type="submit"]');
  const out = document.getElementById(form.dataset.verify);

  const show = (tone, title, text, rows) => {
    out.hidden = false;
    out.className = `verdict verdict--${tone}`;
    const head = document.createElement('p');
    head.className = 'verdict__head';
    const mark = document.createElement('span');
    mark.className = 'verdict__mark';
    head.append(mark, title);
    const parts = [head];
    if (text) {
      const p = document.createElement('p');
      p.textContent = text;
      parts.push(p);
    }
    if (rows) {
      const dl = document.createElement('dl');
      rows.filter(([, v]) => v).forEach(([k, v]) => {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        dl.append(dt, dd);
      });
      parts.push(dl);
    }
    out.replaceChildren(...parts);
  };

  const check = async () => {
    error.textContent = '';
    input.setAttribute('aria-invalid', 'false');
    const code = normalise(input.value);
    if (!code) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = 'A code has 12 letters and numbers, like K7QM-3XPD-8RTA.';
      input.focus();
      return;
    }
    input.value = code;
    if (!connected) {
      show('plain', 'Checking is not connected yet', 'Certificates can be checked here once Bannuar switches on online checking. Until then, call or visit the office.');
      return;
    }
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    try {
      const r = await rpc('verify_certificate', { p_code: code });
      if (r.status === 'valid') {
        const period = r.date_hired ? `${day(r.date_hired)} to ${r.date_separated ? day(r.date_separated) : 'the present'}` : null;
        show('valid', 'This certificate is genuine', 'Bannuar issued it and it has not been withdrawn. Compare these details with the paper in front of you.', [
          ['Certificate', r.certificate_no],
          ['Name', r.employee_name],
          ['Position', r.position],
          ['Employment', period],
          ['Issued', day(r.issued_at)],
        ]);
      } else if (r.status === 'revoked') {
        show('revoked', 'This certificate was withdrawn', `Bannuar withdrew certificate ${r.certificate_no} on ${day(r.revoked_at)}. Ask the person for a new certificate.`);
      } else if (r.status === 'invalid_format') {
        input.setAttribute('aria-invalid', 'true');
        error.textContent = 'A code has 12 letters and numbers, like K7QM-3XPD-8RTA.';
      } else {
        show('missing', 'No certificate has this code', 'Check the code letter by letter. If it is right, the paper did not come from Bannuar: ask the person for a new copy.');
      }
    } catch (err) {
      show('plain', 'The check could not run', explain(err));
    } finally {
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    check();
  });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      input.setAttribute('aria-invalid', 'false');
      error.textContent = '';
    }
  });

  const preset = new URLSearchParams(location.search).get('code');
  if (preset && form.dataset.autocheck !== undefined) {
    input.value = preset;
    check();
  }
});
