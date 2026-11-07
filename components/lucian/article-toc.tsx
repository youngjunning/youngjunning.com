// Lucian UX/UI Prompt #275 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#275
// Lucian UX/UI Prompt #058 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#058
// Lucian UX/UI Prompt #040 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#040
'use client';

import { useEffect, useRef, useState } from 'react';
import './article-toc.css';

type Heading = { id: string; text: string; level: number; top?: number; height?: number };

export default function ArticleToc({ documentId }: { documentId: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const rootRef = useRef<HTMLElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    hasScrolled.current = false;
    const nodes = [...document.querySelectorAll<HTMLElement>('.reader .prose :is(h1,h2,h3,h4,h5,h6)[id]')];
    const pending = requestAnimationFrame(() => setHeadings(nodes.map((node) => ({ id: node.id, text: [...node.childNodes].filter((child) => !(child instanceof Element && child.classList.contains('heading-anchor'))).map((child) => child.textContent).join('').trim(), level: Number(node.tagName.slice(1)) }))));
    const frame = document.querySelector<HTMLIFrameElement>('.reader .html-document');
    function receive(event: MessageEvent) {
      if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'article:headings' || !Array.isArray(event.data.headings)) return;
      const entries = event.data.headings.filter((item: Heading) => item && typeof item.id === 'string' && typeof item.text === 'string' && Number.isInteger(item.level) && item.level >= 1 && item.level <= 6 && Number.isFinite(item.top) && Number.isFinite(item.height) && item.height! >= 0);
      setHeadings(entries);
    }
    window.addEventListener('message', receive);
    frame?.contentWindow?.postMessage({ type: 'article:measure' }, '*');
    return () => { cancelAnimationFrame(pending); window.removeEventListener('message', receive); };
  }, [documentId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !headings.length) return;
    const items = [...root.querySelectorAll<HTMLAnchorElement>('.u275-ti')];
    const marker = root.querySelector<HTMLElement>('.u275-mk')!;
    const list = root.querySelector<HTMLElement>('.u275-ul')!;
    const highlight = root.querySelector<HTMLElement>('.u040-hl')!;
    const scroller = root.querySelector<HTMLElement>('.u275-toc')!;
    const ring = root.querySelector<HTMLElement>('.u058-ring')!;
    const percent = ring.querySelector<HTMLElement>('span')!;
    const reader = document.querySelector<HTMLElement>('.reader')!;
    const frame = document.querySelector<HTMLIFrameElement>('.reader .html-document');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let activeRange = '';
    function draw() {
      raf = 0;
      const frameTop = frame?.getBoundingClientRect().top ?? 0;
      const boxes = headings.map((heading) => {
        if (heading.top !== undefined) return { top: frameTop + heading.top, bottom: frameTop + heading.top + (heading.height ?? 0) };
        const rect = document.getElementById(heading.id)?.getBoundingClientRect();
        return { top: rect?.top ?? Infinity, bottom: rect?.bottom ?? Infinity };
      });
      const bottom = document.querySelector('.reader .prose')?.getBoundingClientRect().bottom ?? frame?.getBoundingClientRect().bottom ?? 0;
      const start = document.querySelector('.reader .prose')?.getBoundingClientRect().top ?? frame?.getBoundingClientRect().top ?? reader.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1, (130 - start) / Math.max(1, bottom - start - (window.innerHeight - 130))));
      root!.style.setProperty('--p', progress.toFixed(4));
      percent.textContent = `${Math.round(progress * 100)}%`;
      ring.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      root!.classList.toggle('is-done', progress > .985);
      let first = -1, last = -1, best = 0;
      // Like Fumadocs, highlight every heading intersecting the reading viewport.
      // Between headings, keep the section whose content continues above the fold.
      boxes.forEach(({ top, bottom }, index) => {
        if (bottom > 130 && top < window.innerHeight) { if (first < 0) first = index; last = index; }
        if (top <= 130) best = index;
      });
      if (first >= 0) best = first;
      else first = last = best;
      // replaceState keeps the shareable location in sync without scrolling again
      // or adding a history entry for every section. Leave initial deep links intact.
      const hash = `#${encodeURIComponent(headings[best].id)}`;
      if (hasScrolled.current && window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash);
      items.forEach((item, index) => {
        item.classList.toggle('on', index >= first && index <= last);
        if (index === best) item.setAttribute('aria-current', 'location'); else item.removeAttribute('aria-current');
      });
      const y0 = items[first].parentElement!.offsetTop;
      const y1 = items[last].parentElement!.offsetTop + items[last].offsetHeight;
      marker.style.transform = `translateY(${y0}px)`;
      marker.style.height = `${y1 - y0}px`;
      highlight.style.setProperty('--y', `${y0}px`);
      highlight.style.height = `${y1 - y0}px`;
      const nextRange = `${first}:${last}`;
      if (activeRange !== nextRange) {
        activeRange = nextRange;
        // Reveal the highlighted range inside the TOC without moving the article.
        const firstItem = items[first].getBoundingClientRect();
        const lastItem = items[last].getBoundingClientRect();
        const bounds = scroller.getBoundingClientRect();
        const fits = lastItem.bottom - firstItem.top <= bounds.height - 32;
        const shift = firstItem.top < bounds.top + 16 || !fits ? firstItem.top - bounds.top - 16 : Math.max(0, lastItem.bottom - bounds.bottom + 16);
        if (shift) scroller.scrollTo({ top: scroller.scrollTop + shift, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      }
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
    function onScroll() { hasScrolled.current = true; schedule(); }
    const observer = new ResizeObserver(schedule);
    observer.observe(reader);
    observer.observe(list);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    draw();
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', schedule); cancelAnimationFrame(raf); };
  }, [headings]);

  if (!headings.length) return null;
  const baseLevel = Math.min(...headings.map((heading) => heading.level));
  const chapters = new Map(headings.filter(heading => heading.level === baseLevel).map((heading, index) => [heading.id, index + 1]));
  return <nav ref={rootRef} className="ux u275 u058 article-toc" aria-label="文章目录">
    <span className="u058-bar" aria-hidden="true" />
    <div className="u058-head">
      <div><small>CONTENTS / {String(headings.length).padStart(2, '0')}</small><b>文章目录</b></div>
      <span className="u058-ring" role="progressbar" aria-label="正文阅读进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle className="t" cx="24" cy="24" r="20" /><circle className="p" cx="24" cy="24" r="20" pathLength="100" /></svg>
        <span aria-hidden="true">0%</span><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8" /></svg></i>
      </span>
    </div>
    <div className="u275-toc"><div className="u275-track"><span className="u275-mk" aria-hidden="true" /><ul className="u275-ul"><li className="u040-hl" role="presentation" aria-hidden="true" />{headings.map((heading, index) => {
      const topLevel = heading.level === baseLevel;
      return <li key={heading.id}><a className="u275-ti" href={`#${encodeURIComponent(heading.id)}`} style={{ paddingLeft: `${(heading.level - baseLevel) * 12}px` }} onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const hash = `#${encodeURIComponent(heading.id)}`;
        if (heading.top !== undefined) {
          const frame = document.querySelector<HTMLIFrameElement>('.reader .html-document');
          if (frame?.contentWindow) {
            event.preventDefault();
            frame.contentWindow.postMessage({ type: 'article:navigate', hash }, '*');
          }
          return;
        }
        const target = document.getElementById(heading.id);
        if (!target) return;
        event.preventDefault();
        if (window.location.hash !== hash) window.history.pushState(null, '', hash);
        target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }} onKeyDown={(event) => {
        const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (direction) {
          event.preventDefault();
          const links = rootRef.current!.querySelectorAll<HTMLAnchorElement>('.u275-ti');
          links[(index + direction + links.length) % links.length].focus();
        }
      }}><span className="u275-number" aria-hidden="true">{topLevel ? String(chapters.get(heading.id)).padStart(2, '0') : '·'}</span><span>{heading.text}</span></a></li>;
    })}</ul></div></div>
  </nav>;
}
