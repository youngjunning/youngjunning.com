// Lucian UX/UI Prompt #008 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#008
'use client';

import { useEffect, useRef, useState } from 'react';
import './favorite-share.css';

export default function FavoriteShare({ id, variant = 'lucian' }: { id: string; variant?: 'lucian' | 'statechart' }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const href = `/favorites#${encodeURIComponent(id)}`;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    timer.current = setTimeout(() => setStatus('idle'), 3000);
  }

  return <div className={`favorite-share${variant === 'lucian' ? ' ux u008' : ' sc-favorite-share'}${status === 'copied' ? ' is-copied' : ''}`}>
    <button className={variant === 'lucian' ? 'u008-btn' : 'sc-share-btn'} type="button" onClick={copy} aria-label="复制卡片链接">
      <svg className="u008-cp" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></svg>
      <svg className="u008-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 8" /></svg>
      <span>复制卡片链接</span>
    </button>
    <span className={variant === 'lucian' ? 'u008-tip' : 'sc-share-tip'} role="status">{status === 'copied' ? '已复制' : status === 'error' ? <>复制失败，请<a href={href}>打开卡片链接</a></> : ''}</span>
  </div>;
}
