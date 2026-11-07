// Lucian UX/UI Prompt #058 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#058
'use client';

import { useEffect, useRef } from 'react';
import './lucian-058.css';

export default function ReadingProgress() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    function sync() {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 1;
      root?.style.setProperty('--p', progress.toFixed(4));
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(sync); }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    sync();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="ux u058-document-progress" ref={rootRef} aria-hidden="true"><span className="u058-bar" /></div>;
}
