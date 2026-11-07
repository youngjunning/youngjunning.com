// Lucian UX/UI Prompt #245 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#245
'use client';
import { useEffect, useRef } from 'react';
import './lucian-245.css';

const lines = ['判断框架 × 执行能力', '从真实经历，形成判断。', '把判断做成产品。'];
const glyphs = '!<>-_/[]{}=+~^?#%&@$01';
export default function DecodingHeadline() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current!, heading = root.querySelector<HTMLElement>('.u245-h')!;
    const status = root.querySelector<HTMLElement>('.u245-st')!;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const duration = 1100;
    let frame = 0, running = false, current = 0, visible = true;
    let rotation: ReturnType<typeof setInterval> | null = null;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let cells: Array<{ el: HTMLElement; glyph: HTMLElement; start: number; end: number; last: number; done: boolean }> = [];
    function build(text: string) {
      heading.setAttribute('aria-label', text);heading.textContent = '';
      cells = Array.from(text).map((character) => {
        const el = document.createElement('span'), bold = document.createElement('b'), glyph = document.createElement('i');
        el.className = 'u245-c';el.setAttribute('aria-hidden', 'true');bold.textContent = character;el.append(bold, glyph);heading.append(el);
        return { el, glyph, start: 0, end: 0, last: 0, done: false };
      });
    }
    function run() {
      cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);timers.clear();
      if (media.matches) { cells.forEach((cell) => { cell.el.className = 'u245-c'; });root.classList.remove('is-run');status.textContent = '';running = false;return; }
      const started = performance.now();running = true;root.classList.add('is-run');status.textContent = '';
      cells.forEach((cell, index) => { cell.start = Math.random() * duration * .3;cell.end = duration * (.32 + .68 * index / Math.max(1, cells.length - 1)) + Math.random() * 90;cell.last = 0;cell.done = false;cell.el.className = 'u245-c z'; });
      function tick(now: number) {
        const elapsed = now - started;let remaining = 0;
        cells.forEach((cell) => {
          if (cell.done) return;
          if (elapsed >= cell.end) { cell.done = true;cell.el.className = 'u245-c f';const timer = setTimeout(() => { cell.el.classList.remove('f');timers.delete(timer); }, 40);timers.add(timer);return; }
          remaining++;
          if (elapsed >= cell.start) { cell.el.className = 'u245-c s';if (now - cell.last > 55) { cell.last = now;cell.glyph.textContent = glyphs[Math.floor(Math.random() * glyphs.length)]; } }
        });
        if (remaining) frame = requestAnimationFrame(tick);else { running = false;root.classList.remove('is-run'); }
      }
      frame = requestAnimationFrame(tick);
    }
    function rotate() {
      if (rotation) clearInterval(rotation);
      rotation = null;
      if (visible && !media.matches) rotation = setInterval(() => { current = (current + 1) % lines.length;build(lines[current]);run(); }, 5200);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting;rotate(); });observer.observe(root);
    function preference() { run();rotate(); }
    function hover() { if (!running) run(); }
    heading.addEventListener('pointerenter', hover);heading.addEventListener('focus', hover);media.addEventListener('change', preference);
    build(lines[0]);run();
    return () => { cancelAnimationFrame(frame);if (rotation) clearInterval(rotation);observer.disconnect();for (const timer of timers) clearTimeout(timer);heading.removeEventListener('pointerenter', hover);heading.removeEventListener('focus', hover);media.removeEventListener('change', preference); };
  }, []);
  return <div ref={rootRef} className="ux u245 identity-decoder"><p className="u245-k">HOW I WORK <b className="u245-st" role="status" /></p><h2 className="u245-h" tabIndex={0}>{lines[0]}</h2></div>;
}
