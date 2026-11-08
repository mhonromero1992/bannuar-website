/**
 * The two dealt moments (DESIGN.md section 6). Both leave the content readable without them:
 * the words and drops are in the HTML at full strength until this script arms them.
 */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Moment 1: the meaning of the name lights up phrase by phrase as it crosses the screen.
document.querySelectorAll('[data-highlight]').forEach((el) => {
  if (reduced) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const key = node.parentElement?.closest('[data-key]') !== null;
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.append(part);
        return;
      }
      const span = document.createElement('span');
      span.className = key ? 'w is-key' : 'w';
      span.textContent = part;
      frag.append(span);
    });
    node.replaceWith(frag);
  }
  const words = [...el.querySelectorAll('.w')];
  el.classList.add('is-armed');
  let active = false;
  let queued = false;
  const paint = () => {
    queued = false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.3 + r.height * 0.6)));
    const lit = Math.round(progress * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };
  const onScroll = () => {
    if (active && !queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  };
  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) paint();
  }).observe(el);
  window.addEventListener('scroll', onScroll, { passive: true });
  paint();
});

// Moment 2: the 63 units of blood fill in once, one drop per unit.
document.querySelectorAll('[data-drops]').forEach((el) => {
  if (reduced) return;
  el.classList.add('is-armed');
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      el.classList.add('is-filled');
      io.disconnect();
    },
    { threshold: 0.45 },
  );
  io.observe(el);
});
