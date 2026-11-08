/** Shared on every page: menu sheet, phone dock, button light, footer year. */

// Menu sheet (phones and small tablets). A <dialog>: Escape closes it and focus returns.
const menuButton = document.querySelector('[data-menu-open]');
const sheet = document.getElementById('menu-sheet');
if (menuButton && sheet && typeof sheet.showModal === 'function') {
  const close = () => sheet.close();
  menuButton.addEventListener('click', () => {
    sheet.showModal();
    menuButton.setAttribute('aria-expanded', 'true');
  });
  sheet.addEventListener('close', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.focus();
  });
  sheet.querySelector('[data-menu-close]')?.addEventListener('click', close);
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });
  window.matchMedia('(min-width: 980px)').addEventListener('change', (e) => {
    if (e.matches && sheet.open) close();
  });
}

// Phone dock: appears once the first screen has scrolled by; never over the footer's own buttons.
const dock = document.querySelector('[data-dock]');
if (dock) {
  document.body.classList.add('has-dock');
  const footer = document.querySelector('.footer');
  let footerVisible = false;
  const update = () => {
    const past = window.scrollY > window.innerHeight * 0.6;
    dock.classList.toggle('is-shown', past && !footerVisible);
  };
  if (footer) {
    new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      update();
    }, { rootMargin: '0px 0px -40% 0px' }).observe(footer);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// Buttons: a soft light follows the pointer across the face (DESIGN.md section 9).
document.addEventListener(
  'pointermove',
  (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.btn') : null;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
    btn.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
  { passive: true },
);

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});
