// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
'use client';

import { useEffect, useRef } from 'react';
import { configViews, type ConfigView } from '@/lib/use-agent-config-library';
import './lucian-039.css';

export default function ConfigTabs({ view, onChange }: { view: ConfigView; onChange: (view: ConfigView) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const move = () => {
      const selected = root.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!selected || !pill.current) return;
      pill.current.style.setProperty('--x', `${selected.offsetLeft}px`);
      pill.current.style.setProperty('--w', `${selected.offsetWidth}px`);
    };
    move();
    const observer = new ResizeObserver(move);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [view]);
  return <div className="u039-tabs" ref={root} role="tablist" aria-label="配置详情">
    <span className="u039-pill" ref={pill} aria-hidden="true" />
    {configViews.map((tab, index) => <button key={tab.id} type="button" className="u039-tab" role="tab" id={`config-view-${tab.id}`} aria-selected={view === tab.id} aria-controls="config-detail-panel" tabIndex={view === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % configViews.length : event.key === 'ArrowLeft' ? (index + configViews.length - 1) % configViews.length : event.key === 'Home' ? 0 : event.key === 'End' ? configViews.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      onChange(configViews[next].id);
      root.current?.querySelectorAll('button')[next]?.focus();
    }}>{tab.label}</button>)}
  </div>;
}
