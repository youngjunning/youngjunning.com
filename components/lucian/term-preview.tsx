// Lucian UX/UI Prompt #076 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#076
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GlossaryEntry } from '@/lib/article-glossary';
import './term-preview.css';

export default function TermPreview({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, above: false, arrow: 24 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  function clearTimers() {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }
  function place() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(380, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const above = window.innerHeight - rect.bottom < 330 && rect.top > 330;
    setPosition({ left, top: above ? rect.top - 10 : rect.bottom + 10, above, arrow: rect.left + rect.width / 2 - left });
  }
  function show(delay = 0) {
    clearTimers();
    showTimer.current = setTimeout(() => { place(); setOpen(true); }, delay);
  }
  function hide(delay = 80) {
    clearTimers();
    if (pinned) return;
    hideTimer.current = setTimeout(() => setOpen(false), delay);
  }
  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPinned(false); setOpen(false); trigger.current?.focus(); } };
    const outside = (event: PointerEvent) => {
      if (pinned && !trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) { setPinned(false); setOpen(false); }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open, pinned]);
  useEffect(() => () => clearTimers(), []);

  return <span className="ux u076 term-preview">
    <button ref={trigger} className="u076-b term-preview-trigger" type="button" aria-expanded={open} aria-controls={open ? id : undefined}
      onPointerEnter={event => { if (event.pointerType === 'mouse') show(450); }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') hide(); }}
      onFocus={() => show()}
      onBlur={event => { if (!panel.current?.contains(event.relatedTarget as Node)) hide(150); }}
      onClick={() => { clearTimers(); if (open && pinned) { setPinned(false); setOpen(false); } else { place(); setPinned(true); setOpen(true); } }}>{entry.term}</button>
    {open && createPortal(<div ref={panel} id={id} className={`u076-tip on term-preview-tip ${position.above ? 'above' : 'below'}`}
      style={{ left: position.left, top: position.top, ['--ax' as string]: `${position.arrow}px` }} role="dialog" aria-label={`${entry.term} 术语解释`}
      onPointerEnter={() => clearTimers()} onPointerLeave={() => hide(150)} onBlur={event => { if (!trigger.current?.contains(event.relatedTarget as Node) && !panel.current?.contains(event.relatedTarget as Node)) hide(150); }}>
      <div className="u076-box term-preview-box"><strong>{entry.title}</strong><p>{entry.summary}</p>
        {entry.related.length > 0 && <div className="term-preview-related"><span>相关阅读</span>{entry.related.map(item => <a key={item.url} href={item.url}>{item.title}</a>)}</div>}
        <a className="term-preview-favorite" href={`/favorites#${entry.favoriteId}`}>查看百宝箱卡片 ↗</a>
      </div><i className="u076-arr" aria-hidden="true" /></div>, document.body)}
  </span>;
}
