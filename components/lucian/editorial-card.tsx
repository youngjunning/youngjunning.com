// Lucian UX/UI Prompt #049 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#049
'use client';

import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import { useId, useRef, useState, type PointerEvent } from 'react';
import './lucian-049.css';

type Props = { href: string; title: string; summary: string; category: string; minutes: number; tone?: number };

const tones = [
  { sky: ['#aab9df', '#d9dff0', '#efd7c4'], sun: '#f5b57c', glow: '#fff1d9', hills: ['#777db1', '#5a6b9c', '#2d426d', '#243659'] },
  { sky: ['#dcaa9b', '#f3cfb2', '#f7e1c3'], sun: '#ffdf9b', glow: '#fff2ce', hills: ['#d18d83', '#b8747b', '#895d72', '#59466b'] },
  { sky: ['#a5bfc3', '#c9d8ce', '#e8d2bd'], sun: '#f2c48c', glow: '#fff0cb', hills: ['#8ba9a3', '#6d898d', '#486779', '#2b485f'] },
];

export default function EditorialCard({ href, title, summary, category, minutes, tone = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const gradientId = useId().replaceAll(':', '');
  const colors = tones[tone % tones.length];
  const suppressFocus = useRef(false);
  function toggleSaved() {
    setSaved(!saved);
  }

  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--px', ((event.clientX - rect.left) / rect.width * 2 - 1).toFixed(3));
    event.currentTarget.style.setProperty('--py', ((event.clientY - rect.top) / rect.height * 2 - 1).toFixed(3));
  }

  function leave(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse') return;
    event.currentTarget.style.setProperty('--px', '0');
    event.currentTarget.style.setProperty('--py', '0');
    if (!event.currentTarget.contains(document.activeElement)) setOpen(false);
  }

  return <article className={`ux u049 ${open ? 'is-open' : ''}`} tabIndex={0} aria-label={`${title}，${minutes} 分钟阅读`} onPointerEnter={(event) => { if (event.pointerType === 'mouse') setOpen(true); }} onPointerMove={move} onPointerLeave={leave} onClick={(event) => { if (!(event.target as HTMLElement).closest('a,button')) setOpen(true); }} onFocus={() => { if (!suppressFocus.current) setOpen(true); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === 'Escape') { suppressFocus.current = true; event.currentTarget.focus(); setOpen(false); suppressFocus.current = false; } if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setOpen(true); event.currentTarget.querySelector<HTMLAnchorElement>('.u049-cta')?.focus(); } }}>
    <div className="u049-art" aria-hidden="true">
      <svg className="u049-l1" viewBox="0 0 360 500" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.sky[0]} /><stop offset=".55" stopColor={colors.sky[1]} /><stop offset="1" stopColor={colors.sky[2]} /></linearGradient></defs><rect width="360" height="500" fill={`url(#${gradientId})`} /><circle cx="236" cy="210" r="62" fill={colors.sun} /><circle cx="236" cy="210" r="96" fill={colors.glow} opacity=".18" /></svg>
      <svg className="u049-l2" viewBox="0 0 360 500" preserveAspectRatio="xMidYMid slice"><path d="M-10 300 C 60 250 110 270 160 245 S 260 200 370 260 V500 H-10Z" fill={colors.hills[0]} /><path d="M-10 330 C 80 300 120 320 190 300 S 300 290 370 310 V500 H-10Z" fill={colors.hills[1]} opacity=".9" /></svg>
      <svg className="u049-l3" viewBox="0 0 360 500" preserveAspectRatio="xMidYMid slice"><path d="M-10 370 C 70 330 140 380 210 350 S 320 340 370 360 V500 H-10Z" fill={colors.hills[2]} /><path d="M40 368 l8 -26 l8 26 M70 360 l10 -34 l10 34" fill={colors.hills[3]} /></svg>
    </div>
    <div className="u049-shade" aria-hidden="true" />
    <div className="u049-top"><span className="u049-tag">{category}</span><button className="u049-bm" type="button" aria-pressed={saved} aria-label={saved ? '取消收藏' : '收藏文章'} onClick={toggleSaved}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11a.5.5 0 0 1 .5.5V20l-6-4-6 4V4.5a.5.5 0 0 1 .5-.5z" /></svg></button></div>
    <div className="u049-body"><div className="u049-k">文章 · {minutes} 分钟</div><h3 className="u049-t">{title}</h3><p className="u049-sum">{summary}</p><div className="u049-foot"><span className="u049-av" aria-hidden="true">{siteProfile.name.slice(0, 1)}</span><span className="u049-by">{siteProfile.name}<small>实践与判断</small></span><Link className="u049-cta" href={href}>阅读 <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg></Link></div></div>
  </article>;
}
