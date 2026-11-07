// Lucian UX/UI Prompt #206 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#206
'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Graph, GraphNode, Topic } from '@/lib/types';
import './lucian-206.css';
import './spring-graph.css';

type Point = GraphNode & { x: number; y: number; vx: number; vy: number; ax: number; ay: number; r: number; color: string };
const WIDTH = 1100;
const HEIGHT = 780;
const centers = [{ x: 270, y: 226 }, { x: 775, y: 210 }, { x: 852, y: 554 }, { x: 526, y: 617 }, { x: 225, y: 535 }];

export default function SpringGraph({ graph, topics, topic, query, selected, showTopics, zoom, onSelect, onTopic }: {
  graph: Graph; topics: Topic[]; topic: string; query: string; selected: string; showTopics: boolean; zoom: number;
  onSelect: (id: string) => void; onTopic: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ selected, showTopics, zoom, onSelect, onTopic });
  const drawRef = useRef<() => void>(() => {});
  const nodes = useMemo(() => graph.nodes.filter((node) => (topic === 'all' || node.topic === topic) && (node.type === 'topic' || !query || node.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))), [graph.nodes, topic, query]);
  const edges = useMemo(() => {
    const ids = new Set(nodes.map((node) => node.id));
    return graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }, [graph.edges, nodes]);

  useEffect(() => {
    stateRef.current = { selected, showTopics, zoom, onSelect, onTopic };
    drawRef.current();
  }, [selected, showTopics, zoom, onSelect, onTopic]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colorByTopic = new Map(topics.map((item) => [item.id, item.color]));
    const anchors = new Map(topics.map((item, index) => [item.id, topic === 'all' ? {x:WIDTH/2+Math.cos(index/topics.length*Math.PI*2)*WIDTH*.3,y:HEIGHT/2+Math.sin(index/topics.length*Math.PI*2)*HEIGHT*.3} : { x: WIDTH / 2, y: HEIGHT / 2 }]));
    const totals = new Map(topics.map(item => [item.id, nodes.filter(node => node.topic === item.id && node.type !== 'topic').length]));
    const countByTopic = new Map<string, number>();
    const points: Point[] = nodes.map((node) => {
      const anchor = anchors.get(node.topic) || centers[0];
      const index = countByTopic.get(node.topic) || 0;
      if (node.type !== 'topic') countByTopic.set(node.topic, index + 1);
      const angle = index * 2.3999632297;
      const radius = topic === 'all' ? 45 + 85 * Math.sqrt(index / Math.max(1, (totals.get(node.topic) || 1) - 1)) : 80 + Math.sqrt(index) * 36;
      return { ...node, x: node.type === 'topic' ? anchor.x : anchor.x + Math.cos(angle) * radius,
        y: node.type === 'topic' ? anchor.y : anchor.y + Math.sin(angle) * radius,
        ax: anchor.x, ay: anchor.y, vx: 0, vy: 0, r: node.type === 'topic' ? 25 : 5.8,
        color: colorByTopic.get(node.topic) || '#5779a6' };
    });
    const pointById = new Map(points.map((point) => [point.id, point]));
    const activeEdges = edges.map((edge) => ({ edge, a: pointById.get(edge.source)!, b: pointById.get(edge.target)! }));
    const rectSize = { width: 1, height: 1, scale: 1, ox: 0, oy: 0 };
    let frame = 0;
    let remaining = reduced ? 0 : 220;
    let visible = true;
    let dragging: Point | null = null;
    let down: { x: number; y: number; id: string | null; moved: boolean; panX: number; panY: number } | null = null;
    let panX = 0;
    let panY = 0;
    let focusIndex = -1;
    const neighbors = (id: string) => new Set(activeEdges.filter(({ edge }) => edge.type !== 'belongs_to' && (edge.source === id || edge.target === id)).flatMap(({ edge }) => [edge.source, edge.target]));
    const position = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left - rectSize.ox - panX) / (rectSize.scale * stateRef.current.zoom) + WIDTH * (1 - 1 / stateRef.current.zoom) / 2;
      const y = (event.clientY - rect.top - rectSize.oy - panY) / (rectSize.scale * stateRef.current.zoom) + HEIGHT * (1 - 1 / stateRef.current.zoom) / 2;
      return { x, y };
    };
    const nearest = (x: number, y: number) => {
      let hit: Point | null = null;
      let distance = Math.max(21, 20 / (rectSize.scale * stateRef.current.zoom)) ** 2;
      for (const point of points) {
        const d = (point.x - x) ** 2 + (point.y - y) ** 2;
        if (d < Math.max(distance, (point.r + 8) ** 2)) { if (!hit || d < distance) { hit = point; distance = d; } }
      }
      return hit;
    };
    function step(dt: number) {
      for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
        const a = points[i], b = points[j];
        const dx = b.x - a.x, dy = b.y - a.y, d2 = Math.max(400, dx * dx + dy * dy), d = Math.sqrt(d2);
        const force = (a.type === 'topic' || b.type === 'topic' ? 4500 : 1600) / d2;
        a.vx -= dx / d * force * dt * 60; a.vy -= dy / d * force * dt * 60;
        b.vx += dx / d * force * dt * 60; b.vy += dy / d * force * dt * 60;
      }
      for (const { edge, a, b } of activeEdges) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const force = (d - (edge.type === 'belongs_to' ? 74 : 145)) * (edge.type === 'belongs_to' ? 3.1 : 0.22);
        a.vx += dx / d * force * dt; a.vy += dy / d * force * dt;
        b.vx -= dx / d * force * dt; b.vy -= dy / d * force * dt;
      }
      for (const point of points) {
        const strength = point.type === 'topic' ? 14 : 0.7;
        point.vx += (point.ax - point.x) * strength * dt;
        point.vy += (point.ay - point.y) * strength * dt;
        const damp = Math.exp(-4 * dt);
        point.vx *= damp; point.vy *= damp;
        if (point === dragging) continue;
        point.x = Math.max(30, Math.min(WIDTH - 30, point.x + point.vx * dt));
        point.y = Math.max(48, Math.min(HEIGHT - 65, point.y + point.vy * dt));
      }
    }
    function draw() {
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rectSize.width, rectSize.height);
      const transformScale = rectSize.scale * stateRef.current.zoom;
      ctx.translate(rectSize.ox + panX + rectSize.scale * WIDTH * (1 - stateRef.current.zoom) / 2,
        rectSize.oy + panY + rectSize.scale * HEIGHT * (1 - stateRef.current.zoom) / 2);
      ctx.scale(transformScale, transformScale);
      const picked = stateRef.current.selected;
      const linked = picked ? neighbors(picked) : null;
      if (picked) linked?.add(picked);
      for (const { edge, a, b } of activeEdges) {
        if (edge.type === 'belongs_to' && !stateRef.current.showTopics) continue;
        const lit = picked && edge.type !== 'belongs_to' && (a.id === picked || b.id === picked);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = lit ? a.color : edge.type === 'references' ? '#54777e' : a.color;
        ctx.globalAlpha = lit ? .88 : picked ? .04 : edge.type === 'references' || a.topic !== b.topic ? .2 : .1;
        ctx.lineWidth = lit ? 2.4 : 1.2;
        ctx.setLineDash(edge.type === 'belongs_to' ? [2, 5] : edge.type === 'tagged' ? [6, 4] : []);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const point of points) {
        const isTopic = point.type === 'topic';
        const radius = Math.max(point.r, (isTopic ? 17 : 3.4) / transformScale);
        const on = !picked || isTopic || linked?.has(point.id);
        ctx.globalAlpha = on ? 1 : .19;
        if (isTopic || picked === point.id || point === dragging || points[focusIndex] === point) {
          const glow = ctx.createRadialGradient(point.x, point.y, radius * .3, point.x, point.y, isTopic ? radius * 2.5 : radius * 4);
          glow.addColorStop(0, point.color + '55'); glow.addColorStop(1, point.color + '00');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(point.x, point.y, isTopic ? radius * 2.5 : radius * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = point.color; ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = isTopic ? 3 : 1.4; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(point.x - radius * .3, point.y - radius * .35, radius * .35, 0, Math.PI * 2); ctx.fill();
        if (points[focusIndex] === point) { ctx.strokeStyle = getComputedStyle(root!).color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(point.x, point.y, radius + 8, 0, Math.PI * 2); ctx.stroke(); }
        if (isTopic) {
          ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(16, 10 / transformScale)}px system-ui`; ctx.textAlign = 'center';
          ctx.fillText(String(topics.findIndex((item) => item.id === point.topic) + 1), point.x, point.y + 6);
          ctx.fillStyle = getComputedStyle(root!).color; ctx.font = `700 ${Math.max(19, 11 / transformScale)}px system-ui`;
          ctx.fillText(point.label, point.x, point.y + radius + Math.max(25, 15 / transformScale));
        } else if (picked === point.id && rectSize.width > 600) {
          ctx.fillStyle = getComputedStyle(root!).color; ctx.font = '600 14px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(point.label.length > 22 ? point.label.slice(0, 22) + '…' : point.label, point.x, point.y - 21);
        }
      }
      ctx.globalAlpha = 1;
      const info = root?.querySelector('.u206-in');
      if (info) info.textContent = picked ? `${pointById.get(picked)?.label || '文档'} · ${Math.max(0, (linked?.size || 1) - 1)} 个关联节点` : '拖动节点探索 · 点击查看关联';
    }
    drawRef.current = draw;
    function run() {
      if (reduced) { for (let i = 0; i < 150; i++) step(.025); draw(); return; }
      remaining = 130;
      if (!frame && visible) frame = requestAnimationFrame(tick);
    }
    function tick() {
      frame = 0;
      if (!visible) return;
      step(.025); draw();
      if (remaining-- > 0 || dragging) frame = requestAnimationFrame(tick);
    }
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      rectSize.width = rect.width; rectSize.height = rect.height;
      rectSize.scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT);
      rectSize.ox = (rect.width - WIDTH * rectSize.scale) / 2;
      rectSize.oy = (rect.height - HEIGHT * rectSize.scale) / 2;
      canvas!.width = Math.round(rect.width * dpr); canvas!.height = Math.round(rect.height * dpr);
      draw();
    }
    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) run(); });
    intersection.observe(root);
    function pointerDown(event: PointerEvent) {
      const p = position(event); const hit = nearest(p.x, p.y);
      down = { x: event.clientX, y: event.clientY, id: hit?.id || null, moved: false, panX, panY };
      dragging = hit;
      root!.classList.toggle('is-drag', !!hit);
      canvas!.setPointerCapture(event.pointerId);
    }
    function pointerMove(event: PointerEvent) {
      if (!down) {
        const p = position(event); const hit = nearest(p.x, p.y);
        canvas!.style.cursor = hit ? 'grab' : 'move';
        return;
      }
      if (Math.abs(event.clientX - down.x) + Math.abs(event.clientY - down.y) > 5) down.moved = true;
      if (dragging) { const p = position(event); dragging.x = p.x; dragging.y = p.y; }
      else { panX = down.panX + event.clientX - down.x; panY = down.panY + event.clientY - down.y; }
      if (reduced) draw(); else run();
    }
    function pointerUp() {
      if (!down) return;
      if (!down.moved && down.id) {
        const point = pointById.get(down.id)!;
        if (point.type === 'topic') stateRef.current.onTopic(point.topic);
        else stateRef.current.onSelect(point.id);
      }
      down = null; dragging = null; root!.classList.remove('is-drag'); run();
    }
    function keyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') focusIndex = (focusIndex + 1) % points.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') focusIndex = (focusIndex + points.length - 1) % points.length;
      else if (event.key === 'Escape') { focusIndex = -1; stateRef.current.onSelect(''); event.preventDefault(); return; }
      else if (event.key === 'Enter' || event.key === ' ') {
        const point = points[focusIndex]; if (!point) return;
        if (point.type === 'topic') stateRef.current.onTopic(point.topic); else stateRef.current.onSelect(point.id);
        event.preventDefault(); return;
      } else return;
      event.preventDefault();
      const point = points[focusIndex]; if (point) { canvas!.setAttribute('aria-label', `引用图谱，当前节点：${point.label}。按 Enter 查看，方向键切换节点。`); draw(); }
    }
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    canvas.addEventListener('keydown', keyDown);
    resize(); run();
    return () => {
      cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect(); themeObserver.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('keydown', keyDown);
      drawRef.current = () => {};
    };
  }, [nodes, edges, topics, topic]);

  return <div className="ux u206 spring-graph" ref={rootRef}>
    <canvas ref={canvasRef} className="u206-cv" tabIndex={0} role="img" aria-label="引用图谱。方向键切换节点，按 Enter 查看；也可拖动节点探索。" />
    <div className="u206-lg" aria-hidden="true"><span><i className="spring-graph-reference" />引用 / 项目使用（实线）</span><span><i className="spring-graph-topic" />同标签相关（虚线）/ 主题归属（点线）</span></div>
    <div className="u206-in" aria-live="polite">拖动节点探索 · 点击查看关联</div>
  </div>;
}
