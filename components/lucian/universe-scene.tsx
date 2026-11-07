// Lucian UX/UI Prompt #341 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#341
// Lucian UX/UI Prompt #080 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#080
// Lucian UX/UI Prompt #306 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#306
'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { ConversationSource } from '@/lib/twin-types';

// #341: responsive canvas, bounded particles, pointer attraction and press burst.
export function UniverseField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current;
    const cx = cv?.getContext('2d');
    if (!cv || !cx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, raf = 0, last = 0;
    let pointer: { x: number; y: number } | null = null;
    const particles = Array.from({ length: 72 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * 22, vy: (Math.random() - .5) * 22, born: 0 }));
    function draw(now: number) {
      cx!.clearRect(0, 0, width, height);
      const visible = width < 650 ? particles.slice(-32) : particles;
      for (let a = 0; a < visible.length; a++) {
        const p = visible[a];
        for (let b = a + 1; b < visible.length; b++) {
          const q = visible[b], distance = Math.hypot((p.x - q.x) * width, (p.y - q.y) * height);
          if (distance > 110) continue;
          cx!.strokeStyle = `rgba(167,174,255,${(1 - distance / 110) * .22})`;
          cx!.beginPath(); cx!.moveTo(p.x * width, p.y * height); cx!.lineTo(q.x * width, q.y * height); cx!.stroke();
        }
        if (pointer) {
          const distance = Math.hypot(p.x * width - pointer.x, p.y * height - pointer.y);
          if (distance < 120) {
            cx!.strokeStyle = `rgba(239,215,171,${(1 - distance / 120) * .8})`;
            cx!.beginPath(); cx!.moveTo(pointer.x, pointer.y); cx!.lineTo(p.x * width, p.y * height); cx!.stroke();
          }
        }
        const age = (now - p.born) / 600;
        cx!.fillStyle = '#CDD2FF'; cx!.beginPath();
        cx!.arc(p.x * width, p.y * height, p.born && age < 1 ? 1.6 + (1 - age) * 2.4 : 1.1, 0, Math.PI * 2); cx!.fill();
      }
    }
    function frame(now: number) {
      raf = 0;
      if (document.hidden || motion.matches) return;
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      particles.forEach(p => {
        if (pointer) {
          const dx = pointer.x - p.x * width, dy = pointer.y - p.y * height, d = Math.hypot(dx, dy);
          if (d < 120 && d > 12) { p.vx += dx / d * 28 * dt; p.vy += dy / d * 28 * dt; }
        }
        if (Math.hypot(p.vx, p.vy) > 30) { p.vx *= 1 - 1.5 * dt; p.vy *= 1 - 1.5 * dt; }
        p.x += p.vx * dt / width; p.y += p.vy * dt / height;
        if (p.x < 0 || p.x > 1) { p.vx *= -1; p.x = Math.max(0, Math.min(1, p.x)); }
        if (p.y < 0 || p.y > 1) { p.vy *= -1; p.y = Math.max(0, Math.min(1, p.y)); }
      });
      draw(now); raf = requestAnimationFrame(frame);
    }
    function run() {
      cancelAnimationFrame(raf); raf = 0;
      draw(performance.now());
      if (!motion.matches && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    const resize = new ResizeObserver(() => {
      const rect = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      width = rect.width; height = rect.height;
      cv.width = width * dpr; cv.height = height * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); run();
    });
    const root = cv.parentElement!;
    function locate(e: PointerEvent) { const r = cv!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function move(e: PointerEvent) { pointer = locate(e); if (motion.matches) draw(performance.now()); }
    function leave() { pointer = null; if (motion.matches) draw(performance.now()); }
    function burst(e: PointerEvent) {
      if ((e.target as HTMLElement).closest('button,a,textarea')) return;
      const q = locate(e);
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * Math.PI * 2 + Math.random() * .4, speed = 60 + Math.random() * 70;
        particles.push({ x: q.x / width, y: q.y / height, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, born: performance.now() });
      }
      if (particles.length > 120) particles.splice(0, particles.length - 120);
      if (motion.matches) draw(performance.now());
    }
    resize.observe(cv); root.addEventListener('pointermove', move); root.addEventListener('pointerleave', leave); root.addEventListener('pointerdown', burst);
    motion.addEventListener('change', run); document.addEventListener('visibilitychange', run);
    return () => { cancelAnimationFrame(raf); resize.disconnect(); root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave); root.removeEventListener('pointerdown', burst); motion.removeEventListener('change', run); document.removeEventListener('visibilitychange', run); };
  }, []);
  return <canvas className="u341-cv universe-field" ref={canvas} aria-hidden="true" />;
}

const ORBITS = [[105, -18, 5.5, 12], [75, 24, 3.6, 10], [50, -58, 2.2, 9]];

export default function UniverseScene({ pending, sources, selected, onSelect, complete }: { pending: boolean; sources: ConversationSource[]; selected: string | null; onSelect: (id: string) => void; complete: boolean }) {
  const system = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [connection, setConnection] = useState('');
  useEffect(() => {
    const root = system.current;
    if (!root) return;
    const planets = root.querySelectorAll<HTMLElement>('.u080-p');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0, time = 0, last = performance.now();
    function draw(now: number) {
      raf = 0;
      if (!motion.matches && !document.hidden) time += Math.min(50, now - last) / 1000;
      last = now;
      planets.forEach((planet, index) => {
        const o = ORBITS[Math.floor(index / 2)], a = (index % 2 ? Math.PI : 0) + Math.floor(index / 2) + time * Math.PI * 2 / o[2], tilt = o[1] * Math.PI / 180;
        const x = Math.cos(a) * o[0], y = Math.sin(a) * o[0] * .38;
        planet.style.transform = `translate(${115 + x * Math.cos(tilt) - y * Math.sin(tilt)}px,${100 + x * Math.sin(tilt) + y * Math.cos(tilt)}px)`;
        planet.style.zIndex = Math.sin(a) < 0 ? '0' : '2';
      });
      if (!motion.matches && !document.hidden) raf = requestAnimationFrame(draw);
    }
    function run() { cancelAnimationFrame(raf); last = performance.now(); draw(last); }
    run(); motion.addEventListener('change', run); document.addEventListener('visibilitychange', run);
    return () => { cancelAnimationFrame(raf); motion.removeEventListener('change', run); document.removeEventListener('visibilitychange', run); };
  }, []);
  function connect(index: number, event: ReactPointerEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>) {
    const root = scene.current!.getBoundingClientRect(), button = event.currentTarget.getBoundingClientRect(), scale = root.width / scene.current!.offsetWidth;
    const x = 170 + (button.left + button.width / 2 - root.left - root.width / 2) / scale;
    const y = 170 + (button.top + button.height / 2 - root.top - root.height / 2) / scale;
    setConnection(`M${x} ${y} Q${(x + 170) / 2 + (y - 170) * .18} ${(y + 170) / 2 - (x - 170) * .18} 170 170`);
    setHovered(index);
  }
  return <div ref={scene} className={`ux u306 universe-scene ${hovered !== null ? 'is-hold' : ''} ${pending ? 'is-searching' : ''}`}>
    <div className="universe-halo" aria-hidden="true" />
    <span className="universe-coordinate" aria-hidden="true">{pending ? 'SIGNAL IN TRANSIT' : complete ? 'MEMORY CONSTELLATION' : 'A UNIVERSE WITHIN'}</span>
    <svg className="u306-ln" viewBox="0 0 340 340" aria-hidden="true"><path className={hovered !== null ? 'is-on' : ''} d={connection} /></svg>
    <div className="u306-st">
      {sources.length > 0 && <div className="u306-rg" style={{ '--r': '112px', '--t': '56s', '--dir': 'reverse', '--rdir': 'normal' } as CSSProperties}>
        {sources.map((source, index) => { const angle = 20 + index * 360 / sources.length; return <div className="u306-sl" key={source.id} style={{ transform: `rotate(${angle}deg) translateX(112px) rotate(${-angle}deg)` }}><div className="u306-up"><button className={`u306-ic ${selected === source.id ? 'is-on' : ''}`} type="button" aria-label={`来源 ${index + 1}：${source.title}`} aria-pressed={selected === source.id} onPointerEnter={event => connect(index, event)} onPointerLeave={() => setHovered(null)} onFocus={event => connect(index, event)} onBlur={() => setHovered(null)} onClick={() => onSelect(source.id)}>{String(index + 1).padStart(2, '0')}</button></div></div>; })}
      </div>}
    </div>
    <div className={`u080 universe-core ${complete && !pending ? 'is-settled' : ''}`} aria-hidden="true"><div className="u080-sys" ref={system}>
      {ORBITS.map((o, index) => <div key={index} className="u080-o" style={{ '--d': `${o[0] * 2}px`, '--t': `${o[1]}deg` } as CSSProperties} />)}
      {ORBITS.flatMap((o, index) => [0, 1].map(k => <i key={`${index}-${k}`} className="u080-p" style={{ '--s': `${o[3] - k * 4}px`, '--c': ['#9ebfff', '#c6a6ff', '#edcfaa'][index] } as CSSProperties} />))}
      <span className="u080-wave" /><span className="u080-core"><span>紫</span></span>
    </div></div>
    <span className="universe-core-label">{pending ? '正在查阅记忆与文章' : sources.length ? `${sources.length} 个来源，汇成这次回应` : complete ? '这片星域，尚无足够记忆' : '经历 · 判断 · 思考 · 变化'}</span>
    <span className="universe-coordinate bottom" aria-hidden="true">{pending ? '连接记忆，等待回响' : 'SILICON ZISHENG / 01'}</span>
  </div>;
}
