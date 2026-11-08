/**
 * The 24-hour shift ring. The coverage you pick (day, night, round the clock, one event) draws its
 * arc; the hand shows the time now in San Juan, La Union.
 */
const MANILA = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
const HOURS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

document.querySelectorAll('[data-ring]').forEach((ring) => {
  const scope = ring.closest('[data-ring-scope]') ?? document;
  const inputs = [...scope.querySelectorAll('input[data-ring-input]')];
  const label = ring.querySelector('[data-ring-label]');
  const hoursOut = scope.querySelector('[data-ring-hours]');
  const cta = scope.querySelector('[data-ring-cta]');
  const hand = ring.querySelector('[data-ring-hand]');
  const now = ring.querySelector('[data-ring-now]');
  const nowText = ring.querySelector('[data-ring-time]');
  const r = Number(ring.dataset.radius);
  const c = Number(ring.dataset.centre);

  const show = (value) => {
    ring.querySelectorAll('[data-arc]').forEach((arc) => {
      arc.style.strokeDashoffset = arc.dataset.arc === value ? '0' : '1';
    });
    const input = inputs.find((i) => i.value === value);
    if (label && input) label.textContent = input.dataset.short || input.dataset.label;
    if (hoursOut && input) hoursOut.textContent = input.dataset.hours;
    if (cta) {
      const url = new URL(cta.getAttribute('href'), location.href);
      url.searchParams.set('coverage', value);
      cta.setAttribute('href', url.pathname + url.search);
    }
  };
  inputs.forEach((i) => i.addEventListener('change', () => i.checked && show(i.value)));
  const first = inputs.find((i) => i.checked);
  if (first) show(first.value);

  const tick = () => {
    const [h, m] = HOURS.format(new Date()).split(':').map(Number);
    const a = ((h + m / 60) / 24) * Math.PI * 2 - Math.PI / 2;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    hand?.setAttribute('x2', x.toFixed(1));
    hand?.setAttribute('y2', y.toFixed(1));
    now?.setAttribute('cx', x.toFixed(1));
    now?.setAttribute('cy', y.toFixed(1));
    if (nowText) nowText.textContent = `Now ${MANILA.format(new Date())} in San Juan`;
  };
  tick();
  setInterval(tick, 30000);
});
