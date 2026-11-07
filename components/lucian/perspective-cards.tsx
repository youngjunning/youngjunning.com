// Lucian UX/UI Prompt #228 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#228
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import './lucian-228.css';

type View = { title: string; description: string; href: string };

export default function PerspectiveCards({ views, label = 'A WORKING PRINCIPLE' }: { views: View[]; label?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = [...root.querySelectorAll<HTMLElement>('.u228-c')];
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let point = { x: -500, y: -500 };
    let opacity = 0;
    let target = 0;
    let raf = 0;
    let last = 0;
    function apply() {
      if (!root) return;
      const bounds = root.getBoundingClientRect();
      const scale = root.offsetWidth / (bounds.width || 1);
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = point.x - (rect.left - bounds.left) * scale;
        const y = point.y - (rect.top - bounds.top) * scale;
        card.style.setProperty('--cx', `${x.toFixed(1)}px`);
        card.style.setProperty('--cy', `${y.toFixed(1)}px`);
        card.style.setProperty('--o', opacity.toFixed(3));
        const inner = card.firstElementChild as HTMLElement;
        inner.style.setProperty('--cx', `${(x - 1.5).toFixed(1)}px`);
        inner.style.setProperty('--cy', `${(y - 1.5).toFixed(1)}px`);
      });
    }
    function frame(now: number) {
      raf = 0;
      if (!root?.isConnected) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      opacity += (target - opacity) * (rm ? 1 : Math.min(1, dt * (target ? 8 : 2.5)));
      apply();
      if (Math.abs(target - opacity) > 0.005) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function move(event: PointerEvent) {
      const bounds = root!.getBoundingClientRect();
      const scale = root!.offsetWidth / (bounds.width || 1);
      point = { x: (event.clientX - bounds.left) * scale, y: (event.clientY - bounds.top) * scale };
      target = 1;
      apply();
      kick();
    }
    function leave() { target = 0; kick(); }
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    apply();
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
    };
  }, [views]);

  return <div className="ux u228 perspective-showcase" ref={rootRef}><div className="u228-gd">
    {views.map((view, index) => <Link className="u228-c motion-reveal" href={view.href} key={view.title}><div className="u228-in"><span className="u228-ic">0{index + 1}</span><small className="perspective-label">{label}</small><b>{view.title}</b><span className="perspective-copy">{view.description}</span><span className="perspective-source">查看依据 <i aria-hidden="true">↗</i></span></div></Link>)}
  </div></div>;
}
