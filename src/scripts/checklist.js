/** Documents to prepare: ticks are kept on this phone only (localStorage), nothing is sent. */
const KEY = 'bannuar-documents-ready';

function read() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function write(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // private mode or storage blocked: the ticks still work for this visit
  }
}

document.querySelectorAll('[data-checklist]').forEach((list) => {
  const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
  const count = list.querySelector('[data-checklist-count]');
  const reset = list.querySelector('[data-checklist-reset]');
  const saved = read();
  const render = () => {
    const done = boxes.filter((b) => b.checked).length;
    if (count) count.textContent = `${done} of ${boxes.length} ready`;
    if (reset) reset.hidden = done === 0;
  };
  boxes.forEach((b) => {
    b.checked = saved.has(b.value);
    b.addEventListener('change', () => {
      const set = read();
      if (b.checked) set.add(b.value);
      else set.delete(b.value);
      write(set);
      render();
    });
  });
  reset?.addEventListener('click', () => {
    boxes.forEach((b) => (b.checked = false));
    write(new Set());
    render();
    boxes[0]?.focus();
  });
  render();
});
