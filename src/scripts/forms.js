/**
 * The proposal request and the job application. Both write straight into Bannuar's database.
 * Errors appear under their own field; "sent" appears only after the database has answered.
 */
import { connected, explain, insert, upload } from './sb.js';

const MOBILE = /^(?:\+?63|0)?9\d{9}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_FILE = 5 * 1024 * 1024;
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const digits = (v) => v.replace(/[^\d+]/g, '');
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const orNull = (v) => (v === '' || v === undefined ? null : v);

function fieldOf(input) {
  return input.closest('.field, .choice, .consent-field');
}

function setError(input, message) {
  const field = fieldOf(input);
  const out = field?.querySelector('.field__error');
  const group = field?.matches('.choice') ? [...field.querySelectorAll('input')] : [input];
  group.forEach((el) => el.setAttribute('aria-invalid', message ? 'true' : 'false'));
  if (out) out.textContent = message || '';
}

function validate(form) {
  let first = null;
  const fail = (input, msg) => {
    setError(input, msg);
    if (!first) first = input;
  };
  form.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.type === 'radio' || el.closest('.form__honey')) return;
    setError(el, '');
  });

  form.querySelectorAll('[data-required]').forEach((field) => {
    const inputs = [...field.querySelectorAll('input, select, textarea')];
    const ok =
      inputs[0]?.type === 'radio' || inputs[0]?.type === 'checkbox'
        ? inputs.some((i) => i.checked)
        : inputs.every((i) => i.value.trim() !== '');
    if (!ok) fail(inputs[0], field.dataset.required);
  });
  form.querySelectorAll('[data-mobile]').forEach((el) => {
    if (el.value.trim() && !MOBILE.test(digits(el.value))) fail(el, 'Enter a mobile number like 0917 123 4567.');
  });
  form.querySelectorAll('[data-phone]').forEach((el) => {
    if (el.value.trim() && digits(el.value).replace('+', '').length < 7) fail(el, 'Enter a number we can call, with the area code for a landline.');
  });
  form.querySelectorAll('input[type="email"]').forEach((el) => {
    if (el.value.trim() && !EMAIL.test(el.value.trim())) fail(el, 'Enter an email address like name@company.ph.');
  });
  form.querySelectorAll('input[type="number"]').forEach((el) => {
    if (!el.value) return;
    const v = Number(el.value);
    if (!Number.isFinite(v) || v < Number(el.min || -Infinity) || v > Number(el.max || Infinity)) {
      fail(el, el.dataset.rangeMessage || `Enter a number from ${el.min} to ${el.max}.`);
    }
  });
  form.querySelectorAll('input[type="date"][data-not-future]').forEach((el) => {
    if (el.value && el.value > new Date().toISOString().slice(0, 10)) fail(el, 'This date cannot be in the future.');
  });
  form.querySelectorAll('input[type="date"][data-not-past]').forEach((el) => {
    if (el.value && el.value < new Date().toISOString().slice(0, 10)) fail(el, 'Choose today or a later date.');
  });
  form.querySelectorAll('input[type="file"]').forEach((el) => {
    const file = el.files?.[0];
    if (!file) return;
    if (!FILE_TYPES.includes(file.type)) fail(el, 'Attach a PDF, JPG or PNG file.');
    else if (file.size > MAX_FILE) fail(el, 'Attach a file under 5 MB.');
  });
  return first;
}

function value(form, name) {
  const els = form.elements.namedItem(name);
  if (!els) return '';
  if (els instanceof RadioNodeList) return els.value;
  if (els.type === 'checkbox') return els.checked;
  return clean(els.value);
}

function proposalRow(form) {
  const guards = value(form, 'guards_needed');
  return {
    company: value(form, 'company'),
    contact_name: value(form, 'contact_name'),
    position: orNull(value(form, 'position')),
    email: orNull(value(form, 'email')),
    phone: value(form, 'phone'),
    site_address: orNull(value(form, 'site_address')),
    site_type: orNull(value(form, 'site_type')),
    guards_needed: guards ? Number(guards) : null,
    coverage: orNull(value(form, 'coverage')),
    start_on: orNull(value(form, 'start_on')),
    message: orNull(value(form, 'message')),
    privacy_consent: value(form, 'privacy_consent') === true,
  };
}

function applicationRow(form) {
  const years = value(form, 'years_experience');
  const hasLicense = value(form, 'has_license') === 'yes';
  return {
    job_opening_id: orNull(value(form, 'job_opening_id')),
    first_name: value(form, 'first_name'),
    middle_name: orNull(value(form, 'middle_name')),
    last_name: value(form, 'last_name'),
    birthdate: orNull(value(form, 'birthdate')),
    sex: orNull(value(form, 'sex')),
    mobile_no: value(form, 'mobile_no'),
    email: orNull(value(form, 'email')),
    city: value(form, 'city'),
    province: orNull(value(form, 'province')),
    education: orNull(value(form, 'education')),
    has_license: hasLicense,
    license_no: hasLicense ? orNull(value(form, 'license_no')) : null,
    license_expires_on: hasLicense ? orNull(value(form, 'license_expires_on')) : null,
    years_experience: years ? Number(years) : null,
    previous_agency: orNull(value(form, 'previous_agency')),
    preferred_location: orNull(value(form, 'preferred_location')),
    message: orNull(value(form, 'message')),
    privacy_consent: value(form, 'privacy_consent') === true,
  };
}

function safeName(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const stem = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${stem || 'file'}${ext}`;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

document.querySelectorAll('form[data-form]').forEach((form) => {
  const kind = form.dataset.form;
  const status = form.querySelector('[data-status]');
  const submit = form.querySelector('[type="submit"]');
  const done = document.getElementById(form.dataset.done);
  const sentAt = done?.querySelector('[data-sent-at]');

  // the shift ring on the proposal page and ?coverage=... from the home page
  const preset = new URLSearchParams(location.search).get('coverage');
  if (preset) {
    const radio = form.querySelector(`input[name="coverage"][value="${CSS.escape(preset)}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // licence fields only when the applicant has a licence
  const licenseFields = form.querySelector('[data-license-fields]');
  if (licenseFields) {
    const sync = () => {
      const yes = value(form, 'has_license') === 'yes';
      licenseFields.hidden = !yes;
      licenseFields.querySelectorAll('input').forEach((i) => (i.disabled = !yes));
    };
    form.querySelectorAll('input[name="has_license"]').forEach((r) => r.addEventListener('change', sync));
    sync();
  }

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.getAttribute?.('aria-invalid') === 'true') setError(el, '');
  });

  const say = (text, tone = 'info') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    say('');
    const invalid = validate(form);
    if (invalid) {
      say('Check the fields marked above.', 'error');
      invalid.focus();
      return;
    }
    // bots fill the hidden field; people never see it
    if (form.querySelector('.form__honey input')?.value) {
      form.hidden = true;
      if (done) done.hidden = false;
      return;
    }
    if (!connected) {
      say(form.dataset.offline || 'Online sending is not connected yet.', 'error');
      return;
    }

    submit.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    try {
      if (kind === 'proposal') {
        say('Sending your request…');
        await insert('inquiries', proposalRow(form));
      } else if (kind === 'application') {
        const row = applicationRow(form);
        const file = form.querySelector('input[type="file"]')?.files?.[0];
        if (file) {
          say('Uploading your file…');
          row.resume_path = await upload('applications', `incoming/${uid()}-${safeName(file.name)}`, file);
        }
        say('Sending your application…');
        await insert('job_applications', row);
      }
      if (sentAt) {
        sentAt.textContent = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date());
      }
      form.reset();
      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
      document.querySelectorAll('[data-form-intro]').forEach((el) => (el.hidden = true));
    } catch (err) {
      say(explain(err), 'error');
    } finally {
      submit.removeAttribute('aria-busy');
      submit.disabled = false;
    }
  });

  done?.querySelector('[data-send-another]')?.addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    say('');
    form.querySelector('input:not([type="hidden"]), select, textarea')?.focus();
  });
});
