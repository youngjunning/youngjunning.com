// Lucian UX/UI Prompt #216 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#216
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import './lucian-216.css';
import './hero-entrance.css';

export default function HeroEntrance({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { root.classList.add('is-in'); return; }
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      raf = requestAnimationFrame(() => root.classList.add('is-in'));
    }, { threshold: 0.2 });
    observer.observe(root);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  function replay() {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add('is-snap');
    root.classList.remove('is-in');
    void root.offsetWidth;
    root.classList.remove('is-snap');
    requestAnimationFrame(() => root.classList.add('is-in'));
  }
  return <section className="persona-hero ux u216-entrance" ref={rootRef}>{children}<button type="button" className="u216-re hero-replay" onClick={replay} aria-label="重播首屏动效">↻</button></section>;
}
