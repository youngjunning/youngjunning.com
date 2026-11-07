// Lucian UX/UI Prompt #399 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#399
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './lucian-399.css';
import './word-cloud.css';

export type CloudWord = { label: string; counts: number[]; group: string; matches: { title: string; url: string; scope: number; count: number }[] };
type Props = { title: string; description: string; words: CloudWord[]; scopes: string[]; groups: { id: string; label: string; color: string }[]; unit: string; onSelect?: (word: string) => void; selectedLabel?: string };

export default function WordCloud({ title, description, words, scopes, groups, unit, onSelect, selectedLabel }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState(0);
  const [selected, setSelected] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);
  const value = words.find((word) => word.label === (selectedLabel ?? selected));
  const highlight = hovered ? words.find((word) => word.label === hovered)?.group : focusedGroup;
  const active = words.filter((word) => word.counts[scope] > 0);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const measure = document.createElement('canvas').getContext('2d');
    if (!measure) return;
    let frame = 0;
    function layout() {
      if (!node || !measure) return;
      const width = node.clientWidth, height = node.clientHeight, compact = width < 450;
      const box = [18, compact && scopes.length > 1 ? 92 : 65, width - 18, height - 64];
      const center = [width / 2, (box[1] + box[3]) / 2];
      const placed: number[][] = [];
      const max = Math.max(1, ...words.map((word) => word.counts[scope]));
      const elements = [...node.querySelectorAll<HTMLAnchorElement>('.u399-w')];
      const order = words.map((word, index) => ({ word, index })).filter(({ word }) => word.counts[scope] > 0).sort((a,b) => b.word.counts[scope]-a.word.counts[scope]);
      const positions = new Map<number, {x:number;y:number;k:number}>();
      for (const { word, index } of order) {
        let fs = 12 + Math.pow(word.counts[scope] / max, .85) * (compact ? 25 : 46);
        const family = getComputedStyle(node).fontFamily;
        measure.font = `850 ${fs}px ${family}`;
        if (measure.measureText(word.label).width > width - 45) fs *= (width - 45) / measure.measureText(word.label).width;
        measure.font = `850 ${fs}px ${family}`;
        const w = measure.measureText(word.label).width + 6, h = fs * 1.15;
        for (let t = 0; t < 140; t += .12) {
          const r = 3.2 * t, x = center[0] + r * Math.cos(t) * 1.45 - w / 2, y = center[1] + r * Math.sin(t) - h / 2;
          if (x < box[0] || y < box[1] || x + w > box[2] || y + h > box[3]) continue;
          if (placed.every((p) => x+w+5 < p[0] || p[0]+p[2]+5 < x || y+h+4 < p[1] || p[1]+p[3]+4 < y)) { placed.push([x,y,w,h]); positions.set(index,{x,y,k:fs/34}); break; }
        }
      }
      elements.forEach((element,index) => {
        const p = positions.get(index);
        const was = element.getAttribute('aria-hidden') !== 'true';
        element.style.transitionDelay = media.matches ? '0s' : `${index % 7 * .025}s`;
        element.classList.toggle('is-out', !p); element.tabIndex = p ? 0 : -1; element.setAttribute('aria-hidden', String(!p));
        if (p) {
          if (!was && !media.matches) { element.style.transition = 'none'; element.style.transform = `translate(${p.x+20*p.k}px,${p.y+12*p.k}px) scale(${p.k*.2})`; void element.offsetWidth; element.style.transition = ''; }
          element.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${p.k.toFixed(3)})`;
        } else if (was) element.style.transform += ' scale(.3)';
      });
      node.dataset.ready = 'true';
    }
    function schedule() { cancelAnimationFrame(frame); frame=requestAnimationFrame(layout); }
    const resize = new ResizeObserver(schedule); resize.observe(node);
    media.addEventListener('change', schedule);
    let mounted = true;
    document.fonts?.ready.then(() => { if (mounted) schedule(); });
    schedule();
    return () => { mounted=false; resize.disconnect(); media.removeEventListener('change',schedule); cancelAnimationFrame(frame); };
  }, [words, scope, scopes.length]);

  const hoveredWord = words.find((word) => word.label === hovered);
  const candidates = value?.matches.filter((match) => scope === 0 || match.scope === scope) || [];
  const matches = !onSelect && scope === 0 ? [...candidates.filter((match) => match.scope === 1).slice(0,2), ...candidates.filter((match) => match.scope === 2).slice(0,2)] : candidates.slice(0,4);
  return <div className="wordcloud-layout">
    <div ref={root} className={`ux u399 content-wordcloud ${highlight ? 'is-f' : ''}`} aria-label={title}>
      <div className="u399-hd"><b>{title}</b>{scopes.length > 1 && <div className="u399-sg" role="group" aria-label={`${title}范围`}>{scopes.map((label,index) => <button key={label} className={`u399-mo ${scope === index ? 'is-on' : ''}`} type="button" aria-pressed={scope === index} onClick={() => { setScope(index); setHovered(null); }}>{label}</button>)}</div>}</div>
      <div className="u399-ws">{words.map((word) => <a key={word.label} className={`u399-w ${highlight === word.group ? 'is-hl' : ''} ${value?.label === word.label ? 'is-selected' : ''}`} href={word.matches.find((match) => scope === 0 || match.scope === scope)?.url || '/blog'} style={{ '--c': groups.find((group) => group.id === word.group)?.color || 'var(--style-secondary)' } as CSSProperties} aria-hidden={word.counts[scope] ? undefined : true} tabIndex={word.counts[scope] ? undefined : -1} aria-label={`${word.label}，${word.counts[scope]}${unit}，查看相关内容`} onPointerEnter={() => setHovered(word.label)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(word.label)} onBlur={() => setHovered(null)} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setSelected(word.label); onSelect?.(word.label); }}>{word.label}</a>)}</div>
      {!active.length && <p className="wordcloud-empty">这个范围暂时没有足够的词。</p>}
      <div className="u399-ft"><span className="u399-in" aria-live="polite">{hoveredWord ? `${hoveredWord.label} · ${hoveredWord.counts[scope]}${unit}` : '词越大，出现越多 · 点击探索'}</span><div className="u399-lg">{groups.map((group) => <button key={group.id} type="button" aria-label={`突出显示${group.label}相关词`} aria-pressed={focusedGroup === group.id} onPointerEnter={() => setFocusedGroup(group.id)} onPointerLeave={() => setFocusedGroup(null)} onFocus={() => setFocusedGroup(group.id)} onBlur={() => setFocusedGroup(null)} onClick={() => setFocusedGroup(focusedGroup === group.id ? null : group.id)}><i style={{ background: group.color }} />{group.label}</button>)}</div></div>
    </div>
    <aside className="wordcloud-detail" aria-label={`${title}详情`}>
      <span className="eyebrow">{onSelect ? 'NOTES TAGS' : 'WORDS IN CONTEXT'}</span>
      <h3>{value?.label || (onSelect ? '从一个标签，读进一组文章。' : '持续关注的事，逐渐浮现。')}</h3>
      <p>{description}</p>
      {value ? <><div className="wordcloud-measure"><strong>{value.counts[scope]}</strong><span>{unit}{scopes.length > 1 ? ` · ${scopes[scope]}` : ''}</span></div>{matches.length ? <div className="wordcloud-matches">{matches.map((match) => <Link key={match.url} href={match.url}><span>{match.scope === 1 ? '个人记录' : '手记'} · {match.title}</span><i aria-hidden="true">↗</i></Link>)}</div> : <p>当前范围没有这个词，试试另一个词。</p>}</> : <div className="wordcloud-hints"><span>01 / 悬停，突出同类词语</span><span>02 / 切换范围，观察重排</span><span>03 / 点击，沿来源继续阅读</span></div>}
      <Link className="text-link" href={onSelect ? '#blog-results' : '/records'}>{onSelect ? '查看筛选后的文章' : '看看这些经历与判断'} ↗</Link>
    </aside>
  </div>;
}
