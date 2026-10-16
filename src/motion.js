import { animate, cubicBezier } from 'animejs';

export function createViewMotion(main) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const entries = new Map();
  let observer;

  function finish(element) {
    entries.get(element)?.revert();
    entries.delete(element);
  }

  function clear() {
    observer?.disconnect();
    for (const element of entries.keys()) finish(element);
  }

  preference.addEventListener('change', clear);
  main.addEventListener('focusin', event => {
    const card = event.target.closest('.hero-card, .record-card, .matchup-card');
    if (card) finish(card);
  });

  function reveal(element, delay, duration) {
    const reduced = preference.matches;
    const animation = animate(element, {
      opacity: [reduced ? .45 : 0, 1],
      ...(reduced ? {} : { translateY: [12, 0] }),
      duration: reduced ? 100 : duration,
      delay: reduced ? 0 : delay,
      ease: cubicBezier(.22, 1, .36, 1),
      onComplete: () => finish(element),
    });
    entries.set(element, animation);
  }

  return {
    clear,
    enter() {
      const time = getComputedStyle(document.documentElement).getPropertyValue('--motion-enter').trim();
      const duration = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
      main.querySelectorAll('.page-intro, .feature, .tier-notice, .matchup-notice')
        .forEach((element, index) => reveal(element, index * 32, duration));
      observer = new IntersectionObserver(entries => {
        entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
          reveal(entry.target, (index % 6) * 32, duration);
          observer.unobserve(entry.target);
        });
      }, { threshold: .08 });
      main.querySelectorAll('.hero-card, .record-card, .matchup-card')
        .forEach(element => observer.observe(element));
    },
  };
}
