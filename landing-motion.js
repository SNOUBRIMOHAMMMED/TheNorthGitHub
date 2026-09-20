/* Scroll depth for the public hero only. No work occurs in the signed-in app. */
(() => {
  const landing = document.getElementById('landingScreen');
  const hero = landing?.querySelector('.nr-hero');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 800px)');
  let frame = 0;
  function paint() {
    frame = 0;
    if (landing.classList.contains('hidden')) return;
    if (reduce.matches) {
      hero.removeAttribute('style');
      return;
    }
    const height = hero.offsetHeight;
    const top = hero.getBoundingClientRect().top;
    const progress = Math.min(1, Math.max(0, -top / height));
    const depth = mobile.matches ? 0.45 : 1;
    hero.style.setProperty('--hero-image-y', `${progress * 110 * depth}px`);
    hero.style.setProperty('--hero-copy-y', `${-progress * 55 * depth}px`);
    hero.style.setProperty('--hero-scale', `${1 + progress * 0.045 * depth}`);
    hero.style.setProperty('--hero-image-opacity', `${1 - progress * 0.95}`);
    hero.style.setProperty('--hero-copy-opacity', `${Math.max(0, 1 - Math.max(0, progress - 0.15) * 1.6)}`);
  }
  function schedule() {
    if (!frame && !landing.classList.contains('hidden')) frame = requestAnimationFrame(paint);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reduce.addEventListener('change', schedule);
  new MutationObserver(schedule).observe(landing, { attributes: true, attributeFilter: ['class'] });
  schedule();
})();

(() => {
  const landing = document.getElementById('landingScreen');
  if (!landing) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...landing.querySelectorAll('.nx-reveal')];
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        if (!isIntersecting) return;
        target.classList.add('nx-visible');
        target.classList.remove('nx-armed');
        observer.unobserve(target);
      });
    }, {threshold:0.06});
    sections.forEach(section => { section.classList.add('nx-armed'); observer.observe(section); });
    reduce.addEventListener('change', () => {
      if (reduce.matches) { observer.disconnect(); sections.forEach(s => s.classList.remove('nx-armed')); }
    });
  }
  const buttons = [...landing.querySelectorAll('[data-nx-tab]')];
  const panels = [...landing.querySelectorAll('[data-nx-panel]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    panels.forEach(panel => {
      const active = panel.dataset.nxPanel === button.dataset.nxTab;
      panel.hidden = !active;
      panel.classList.toggle('nx-enter', active);
    });
  }));
})();
