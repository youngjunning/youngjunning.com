// Lucian UX/UI Prompt #378 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#378
'use client';
import { useEffect, useRef } from 'react';
import persona from '@/lib/persona';
import './lucian-378.css';

type Particle = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; on: boolean; tone: number };
export default function ParticleName() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!, ctx = canvas.getContext('2d')!;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const fashion = document.documentElement.dataset.theme === 'xiaoxiang';
    const words = [persona.siteName, persona.name];
    let width = 1000, height = 360, index = 0, frame = 0, last = 0, visible = true, disposed = false;
    let pointer: { x: number; y: number } | null = null;
    let particles: Particle[] = [];
    let colors = ['#178ba7', '#3875ba', '#5ca8bb'];
    function theme() {
      const style = getComputedStyle(root);
      colors = [style.getPropertyValue('--style-accent').trim(), style.getPropertyValue('--style-secondary').trim(), style.getPropertyValue('--style-ink').trim()];
      draw();
    }
    function targets() {
      const offscreen = document.createElement('canvas');offscreen.width = width;offscreen.height = height;
      const context = offscreen.getContext('2d')!;
      const size = Math.min(width < 500 ? 145 : 280, Math.floor((width - 30) / words[index].length));
      const headingFont = getComputedStyle(root).getPropertyValue('--font-heading').trim() || '"Songti SC",serif';
      context.fillStyle = '#fff';context.font = `${fashion ? 700 : 400} ${size}px ${headingFont}`;context.textAlign = 'center';context.textBaseline = 'middle';
      context.fillText(words[index], width / 2, height / 2 + 8);
      const data = context.getImageData(0, 0, width, height).data;
      const points: Array<[number, number]> = [];
      const gap = width < 500 ? 4 : 5;
      for (let y = 0; y < height; y += gap) for (let x = 0; x < width; x += gap) if (data[(y * width + x) * 4 + 3] > 128) points.push([x, y]);
      for (let i = points.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [points[i], points[j]] = [points[j], points[i]]; }
      return points;
    }
    function assign() {
      const points = targets();
      particles.forEach((particle, i) => {
        if (i < points.length) { particle.tx = points[i][0] + (Math.random() - .5) * 1.5;particle.ty = points[i][1] + (Math.random() - .5) * 1.5;particle.on = true; }
        else { const angle = Math.random() * Math.PI * 2, radius = width * (.35 + Math.random() * .2);particle.tx = width / 2 + Math.cos(angle) * radius;particle.ty = height / 2 + Math.sin(angle) * radius * .45;particle.on = false; }
      });
      canvas.setAttribute('aria-label', `${words[index]}，按 Enter 或点击切换名称；移动指针拨动光点`);
    }
    function draw() {
      const rect = canvas.getBoundingClientRect();if (!rect.width) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const scale = Math.min(rect.width / width, rect.height / height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.translate((rect.width - width * scale) / 2, (rect.height - height * scale) / 2);ctx.scale(scale, scale);
      particles.forEach((particle) => {
        const speed = Math.min(1, Math.hypot(particle.vx, particle.vy) / 300);
        ctx.globalAlpha = particle.on ? (fashion ? .94 : .78) + speed * (fashion ? .06 : .22) : .1;
        ctx.fillStyle = colors[particle.tone];
        const size = particle.on ? (fashion ? 3.8 : 2.6) + speed * 1.4 : 1.6;
        ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
      });
      ctx.globalAlpha = 1;
    }
    function tick(now: number) {
      frame = 0;if (!visible || !root.isConnected) return;
      const dt = Math.min(.033, Math.max(0, (now - last) / 1000));last = now;
      particles.forEach((particle) => {
        let ax = (particle.tx - particle.x) * 38 - particle.vx * 7.5, ay = (particle.ty - particle.y) * 38 - particle.vy * 7.5;
        if (pointer) { const dx = particle.x - pointer.x, dy = particle.y - pointer.y, distance = dx * dx + dy * dy;
          if (distance < 3600) { const force = (1 - distance / 3600) * 9000 / (Math.sqrt(distance) + 6);ax += dx * force / 40;ay += dy * force / 40; }
        }
        particle.vx += ax * dt;particle.vy += ay * dt;particle.x += particle.vx * dt;particle.y += particle.vy * dt;
      });
      draw();frame = requestAnimationFrame(tick);
    }
    function run() {
      if (media.matches) { cancelAnimationFrame(frame);frame = 0;particles.forEach((particle) => { particle.x = particle.tx;particle.y = particle.ty; });draw();return; }
      if (!frame && visible) { last = performance.now();frame = requestAnimationFrame(tick); }
    }
    function resize() {
      const rect = canvas.getBoundingClientRect(), mobile = rect.width < 650;
      width = mobile ? 340 : 1000;height = mobile ? 320 : 360;
      const dpr = Math.min(2, devicePixelRatio || 1);canvas.width = Math.round(rect.width * dpr);canvas.height = Math.round(rect.height * dpr);
      particles = Array.from({ length: fashion ? (mobile ? 1800 : 4200) : (mobile ? 900 : 1500) }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0, tx: width / 2, ty: height / 2, on: true, tone: Math.floor(Math.random() * colors.length) }));
      assign();run();
    }
    function move(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect(), scale = Math.min(rect.width / width, rect.height / height);
      pointer = { x: (event.clientX - rect.left - (rect.width - width * scale) / 2) / scale, y: (event.clientY - rect.top - (rect.height - height * scale) / 2) / scale };
    }
    function leave() { pointer = null; }
    function change() { index = (index + 1) % words.length;assign();particles.forEach((particle) => { particle.vx += (Math.random() - .5) * 260;particle.vy += (Math.random() - .5) * 260; });run(); }
    function key(event: KeyboardEvent) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault();change(); } }
    const resizeObserver = new ResizeObserver(resize);resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting;if (visible) run();else { cancelAnimationFrame(frame);frame = 0; } });intersection.observe(root);
    const themeObserver = new MutationObserver(theme);themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
    canvas.addEventListener('pointermove', move);canvas.addEventListener('pointerleave', leave);canvas.addEventListener('click', change);canvas.addEventListener('keydown', key);media.addEventListener('change', run);
    theme();resize();
    // Rebuild the particle targets after the web font replaces its fallback.
    const headingFont = getComputedStyle(root).getPropertyValue('--font-heading').trim();
    document.fonts.load(`${fashion ? 700 : 400} 32px ${headingFont}`, words.join('')).then(() => { if (!disposed) { assign();run(); } }).catch(() => {});
    return () => { disposed = true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();themeObserver.disconnect();canvas.removeEventListener('pointermove', move);canvas.removeEventListener('pointerleave', leave);canvas.removeEventListener('click', change);canvas.removeEventListener('keydown', key);media.removeEventListener('change', run); };
  }, []);
  return <div ref={rootRef} className="ux u378 particle-name"><canvas ref={canvasRef} className="u378-cv" role="button" tabIndex={0} aria-label={`${persona.siteName}，点击或按 Enter 切换名称`} /></div>;
}
