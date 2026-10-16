import {useEffect, useRef} from 'react';

// Presentation only: never hide charts, form values or decision evidence.
// A failed observer/animation leaves all content visible and usable.
const seen = new Set<string>();
export function usePresentationMotion() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const stop = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const target = entry.target as HTMLElement;
        const key = target.dataset.presentation;
        if (!key || seen.has(key) || preference.matches || document.hidden) continue;
        seen.add(key);
        if (typeof target.animate !== 'function') continue;
        const animation = target.animate(
          [{opacity: 0, transform: 'translateY(16px)'}, {opacity: 1, transform: 'translateY(0)'}],
          {fill: 'backwards', duration: 600, delay: Number(target.dataset.delay || 0), easing: 'cubic-bezier(0.23, 1, 0.32, 1)'}
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, {threshold: 0, rootMargin: '0px 0px -12px 0px'});
    element.querySelectorAll('[data-presentation]').forEach(target => observer.observe(target));
    preference.addEventListener('change', stop);
    element.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      observer.disconnect(); stop();
      preference.removeEventListener('change', stop);
      element.removeEventListener('focusin', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, []);
  return root;
}
