// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
'use client';
import { useEffect, useRef } from 'react';
import './lucian-039.css';
import './content-filter-tabs.css';

export default function ContentFilterTabs({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (value: string) => void; label: string }) {
  const nav = useRef<HTMLDivElement>(null), pill = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = nav.current, indicator = pill.current;
    if (!root || !indicator) return;
    const position = () => { const button = root.querySelector<HTMLElement>('[aria-pressed="true"]'); if (button) { indicator.style.setProperty('--x', button.offsetLeft + 'px'); indicator.style.setProperty('--w', button.offsetWidth + 'px'); } };
    const observer = new ResizeObserver(position); observer.observe(root); position(); return () => observer.disconnect();
  }, [value, options]);
  return <div className="content-filter-scroll"><div className="ux u039-tabs content-filter-tabs" role="group" aria-label={label} ref={nav}><span className="u039-pill" ref={pill} aria-hidden="true" />{options.map(option => <button className="u039-tab" type="button" key={option.id} aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>)}</div></div>;
}
