/**
 * The home hero: entrance once on load, the shift bar, and the 3D scene started when the browser
 * is idle. The poster stays when there is no WebGL, when the visitor prefers reduced motion, or
 * when Data Saver is on (people on prepaid data keep their load).
 */
const hero = document.querySelector('[data-hero]');
const sceneHost = hero?.querySelector('[data-hero-scene]');
const pauseBtn = hero?.querySelector('[data-hero-pause]');
const params = new URLSearchParams(location.search);
const posterMode = params.has('poster');

if (hero) {
  const enter = () => hero.classList.add('is-entered');
  if (posterMode) {
    hero.classList.add('is-entered', 'is-poster');
  } else {
    Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(() =>
      requestAnimationFrame(enter),
    );
  }

  // the shift bar under the hero follows the night-to-sunrise scroll
  const shift = hero.querySelector('[data-hero-shift]');
  if (shift) {
    const set = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.82)));
      shift.style.setProperty('--sunrise', p.toFixed(3));
    };
    window.addEventListener('scroll', set, { passive: true });
    set();
  }
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  if (!sceneHost || (!posterMode && (reduced || saveData)) || !webglAvailable()) return;
  const { startHeroScene } = await import('./hero3d.js');
  const scene = startHeroScene(sceneHost, posterMode ? { still: true, dawn: 0, timeOffset: 14, capture: true, observe: hero } : { observe: hero });
  if (!scene) return;
  requestAnimationFrame(() => sceneHost.classList.add('is-live'));
  if (posterMode) {
    scene.renderStill();
    window.__heroReady = true;
    return;
  }
  if (pauseBtn) {
    pauseBtn.hidden = false;
    pauseBtn.addEventListener('click', () => {
      const paused = pauseBtn.getAttribute('aria-pressed') !== 'true';
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.querySelector('[data-label]').textContent = paused ? 'Play the night scene' : 'Pause the night scene';
      scene.setPaused(paused);
    });
  }
}

if (sceneHost) {
  const start = () => ('requestIdleCallback' in window ? requestIdleCallback(boot, { timeout: 1500 }) : setTimeout(boot, 300));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
