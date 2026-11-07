// Lucian UX/UI Prompt #228 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#228
'use client';
import { useEffect, type RefObject } from 'react';

const surfaces = '.document-card,.topic-card,.memory-feed .u271-in,.reader-aside,.record-page-aside,.endpoint-list>a,.content-wordcloud';

export function useSurfaceGlow(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let active: HTMLElement | null = null, frame = 0;
    let point = { x: 0, y: 0 };
    function reset() { active?.removeAttribute('data-surface-lit'); active = null; cancelAnimationFrame(frame); frame=0; }
    function paint() {
      frame=0;
      if (!active) return;
      const rect = active.getBoundingClientRect();
      active.style.setProperty('--surface-x', `${point.x - rect.left}px`);
      active.style.setProperty('--surface-y', `${point.y - rect.top}px`);
    }
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' || reduced.matches) return;
      const next = event.target instanceof Element ? event.target.closest<HTMLElement>(surfaces) : null;
      if (next !== active) { reset(); active=next; active?.setAttribute('data-surface-lit', 'true'); }
      if (!active) return;
      point={x:event.clientX,y:event.clientY};
      if (!frame) frame=requestAnimationFrame(paint);
    }
    root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerleave',reset);reduced.addEventListener('change',reset);
    return () => { reset();root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',reset);reduced.removeEventListener('change',reset); };
  }, [ref]);
}
