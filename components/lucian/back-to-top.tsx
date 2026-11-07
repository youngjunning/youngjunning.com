// Lucian UX/UI Prompt #343 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#343
'use client';

import { useEffect, useRef } from 'react';
import './back-to-top.css';

export default function BackToTop() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const button = root.querySelector<HTMLButtonElement>('button')!;
    const ring = root.querySelector<SVGCircleElement>('.u343-ring')!;
    const rocket = root.querySelector<SVGGElement>('.u343-rk')!;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const circumference = 2 * Math.PI * 24;
    let drawFrame = 0;
    let scrollFrame = 0;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    let rocketAnimation: Animation | undefined;
    let flying = false;
    ring.style.strokeDasharray = String(circumference);

    function draw() {
      drawFrame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      ring.style.strokeDashoffset = (circumference * (1 - progress)).toFixed(1);
      const visible = flying || window.scrollY > 120;
      root!.classList.toggle('show', visible);
      button.tabIndex = visible ? 0 : -1;
      button.setAttribute('aria-hidden', String(!visible));
    }

    function schedule() {
      if (!drawFrame) drawFrame = requestAnimationFrame(draw);
    }

    function reset() {
      flying = false;
      root!.classList.remove('fly');
      rocketAnimation?.cancel();
      draw();
    }

    function finish() {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('article-title')?.focus({ preventScroll: true });
      resetTimer = setTimeout(reset, reducedMotion.matches ? 0 : 200);
    }

    function returnToTop() {
      if (flying) return;
      flying = true;
      if (reducedMotion.matches) {
        finish();
        return;
      }
      root!.classList.add('fly');
      rocketAnimation = rocket.animate?.([
        { transform: 'none' },
        { transform: 'translateY(4px)', offset: 0.15 },
        { transform: 'translateY(-260px)' },
      ], { duration: 900, easing: 'cubic-bezier(.6,0,.8,.4)' });
      const from = window.scrollY;
      const started = performance.now();
      function scroll(now: number) {
        const fraction = Math.min(1, Math.max(0, (now - started) / 900));
        const eased = fraction < 0.5 ? 4 * fraction ** 3 : 1 - (-2 * fraction + 2) ** 3 / 2;
        window.scrollTo({ top: from * (1 - eased), behavior: 'instant' });
        if (fraction < 1) scrollFrame = requestAnimationFrame(scroll);
        else finish();
      }
      scrollFrame = requestAnimationFrame(scroll);
    }

    function motionChanged() {
      if (reducedMotion.matches && flying) {
        cancelAnimationFrame(scrollFrame);
        clearTimeout(resetTimer);
        rocketAnimation?.cancel();
        finish();
      }
    }

    button.addEventListener('click', returnToTop);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reducedMotion.addEventListener('change', motionChanged);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    draw();
    return () => {
      button.removeEventListener('click', returnToTop);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reducedMotion.removeEventListener('change', motionChanged);
      observer.disconnect();
      cancelAnimationFrame(drawFrame);
      cancelAnimationFrame(scrollFrame);
      clearTimeout(resetTimer);
      rocketAnimation?.cancel();
    };
  }, []);

  return <div className="ux u343 article-back-to-top" ref={rootRef}>
    <button className="u343-up" type="button" aria-label="返回顶部" title="返回顶部" aria-hidden="true" tabIndex={-1}>
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle className="u343-ring" cx="26" cy="26" r="24" />
        <path className="u343-ar" d="M26 34V18M19 25l7-7 7 7" />
        <g className="u343-rk">
          <path className="f" d="M23 33h6l-3 7z" />
          <path className="b" d="M26 13c4 3 5 9 4 16h-8c-1-7 0-13 4-16z" />
          <circle className="w" cx="26" cy="22" r="2.2" />
          <path className="b" d="M22 26l-3 6h4zM30 26l3 6h-4z" />
        </g>
      </svg>
    </button>
  </div>;
}
