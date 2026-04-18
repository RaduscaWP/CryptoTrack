const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function animateCounter(el, target, duration = 1200) {
  const decimals = Number(el.dataset.decimals ?? 0);
  const suffix   = el.dataset.suffix ?? '';
  const prefix   = el.dataset.prefix ?? '';
  const start    = performance.now();
  const sign     = target < 0 ? '-' : (el.dataset.forceSign === 'true' && target > 0 ? '+' : '');
  const abs      = Math.abs(target);

  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased    = easeOutCubic(progress);
    const value    = abs * eased;

    el.textContent = `${prefix}${sign}${value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}${suffix}`;

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export function initAnimations(root = document) {
  const counters = root.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const run = (el) => {
    if (el.dataset.animated === 'true') return;
    el.dataset.animated = 'true';
    const target = parseFloat(el.dataset.target);
    if (Number.isNaN(target)) return;
    animateCounter(el, target);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(run);
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        run(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  counters.forEach((el) => io.observe(el));
}

// UTC clock for the header
export function initClock() {
  const el = document.querySelector('[data-clock]');
  if (!el) return;

  const tick = () => {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss}`;
  };

  tick();
  setInterval(tick, 1000);
}
