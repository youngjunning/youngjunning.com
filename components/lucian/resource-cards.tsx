// Lucian UX/UI Prompt #228 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#228
'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import './lucian-228.css';
import './resource-cards.css';

export type ResourceCard = { id: string; title: string; description: string; status: string; details: string[]; href: string | null; linkLabel: string; links?: { href: string; label: string }[] };

export default function ResourceCards({ areas, ariaLabel, masonry = false }: { areas: ResourceCard[]; ariaLabel: string; masonry?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!masonry || !rootRef.current) return;
    const cards = [...rootRef.current.querySelectorAll<HTMLElement>('.u228-c')];
    const update = () => cards.forEach(card => {
      card.style.gridRowEnd = window.innerWidth > 650 ? `span ${Math.ceil((card.getBoundingClientRect().height + 20) / 10)}` : '';
    });
    const observer = new ResizeObserver(update);
    cards.forEach(card => observer.observe(card));
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [areas, masonry]);

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
  }, [areas]);

  return <div className={`ux u228 resource-cards${masonry ? ' resource-cards-masonry' : ''}`} ref={rootRef}>
    <div className="u228-gd" role="list" aria-label={ariaLabel}>
      {areas.map((area, index) => <div className="u228-c" role="listitem" key={area.id} id={area.id}>
        <div className="u228-in">
          <span className="u228-ic" aria-hidden="true">{area.title.charAt(0)}</span>
          <small className="resource-card-status">{String(index + 1).padStart(2, '0')} / {area.status}</small>
          <h3>{area.title}</h3>
          <span>{area.description}</span>
          {area.details.map((detail, i) => <p key={i}>{detail}</p>)}
          {area.links?.map(link => <a key={link.href} href={link.href} target={/^https?:\/\//i.test(link.href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(link.href) ? 'noopener noreferrer' : undefined} aria-label={/^https?:\/\//i.test(link.href) ? `${link.label}（在新标签页打开）` : undefined}>{link.label} ↗</a>)}
          {area.href && <a href={area.href} target={/^https?:\/\//i.test(area.href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(area.href) ? 'noopener noreferrer' : undefined} aria-label={/^https?:\/\//i.test(area.href) ? `${area.linkLabel}（在新标签页打开）` : undefined}>{area.linkLabel} ↗</a>}
        </div>
      </div>)}
    </div>
  </div>;
}
