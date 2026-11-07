// Lucian UX/UI Prompt #031 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#031
'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import './lucian-031.css';

type TopicOption = { id: string; label: string; color?: string; count: number };

export default function GraphTopicSelect({ options, value, onChange, label = '主题', showCounts = true }: { options: TopicOption[]; value: string; onChange: (value: string) => void; label?: string; showCounts?: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const typedRef = useRef('');
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId().replaceAll(':', '');
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => () => { if (typeTimer.current) clearTimeout(typeTimer.current); }, []);

  function expand() { setActive(selectedIndex); setOpen(true); }
  function close(refocus: boolean) { setOpen(false); if (refocus) buttonRef.current?.focus({ preventScroll: true }); }
  function choose(index: number) {
    onChange(options[index].id);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) valueRef.current?.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.34,1.45,.64,1)' });
    close(true);
  }
  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(Math.min(options.length - 1, active + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(0, active - 1)); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(options.length - 1); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active); }
    else if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') close(false);
    else if (event.key.length === 1 && !event.nativeEvent.isComposing) {
      typedRef.current += event.key.toLocaleLowerCase();
      if (typeTimer.current) clearTimeout(typeTimer.current);
      typeTimer.current = setTimeout(() => { typedRef.current = ''; }, 600);
      const hit = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(typedRef.current));
      if (hit >= 0) setActive(hit);
    }
  }

  return <div className={`ux u031 graph-topic-select ${open ? 'is-open' : ''}`} ref={rootRef}>
    <div className="u031-f"><span className="u031-lab">{label}</span><button className="u031-btn" ref={buttonRef} type="button" aria-label={`${label}：${selected.label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => open ? close(true) : expand()} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); expand(); } }}><span className="u031-flag" style={{ '--c': selected.color || 'var(--ux-grad)' } as CSSProperties} aria-hidden="true">{selected.label.slice(0, 1)}</span><span className="u031-v" ref={valueRef}><b>{selected.label}</b>{showCounts && <small>{selected.count} 篇文档</small>}</span><svg className="u031-car" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 7l4.5 4.5L13.5 7" /></svg></button>
      <ul className={`u031-list ${open ? 'is-open' : ''}`} id={listId} ref={listRef} role="listbox" tabIndex={-1} aria-label={`选择${label}`} aria-activedescendant={open ? `${listId}-${active}` : undefined} aria-hidden={!open} onKeyDown={onListKeyDown} style={{ '--i': active } as CSSProperties}><li className="u031-hl" role="presentation" aria-hidden="true" />{options.map((option, index) => <li className="u031-o" key={option.id} id={`${listId}-${index}`} role="option" aria-selected={option.id === value} onPointerMove={() => setActive(index)} onClick={() => choose(index)}><span className="u031-flag" style={{ '--c': option.color || 'var(--ux-grad)' } as CSSProperties} aria-hidden="true">{option.label.slice(0, 1)}</span>{option.label}{showCounts && <small>{option.count} 篇</small>}<svg className="u031-ck" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9.5l3.5 3.5L14 6" /></svg></li>)}</ul>
    </div>
  </div>;
}
