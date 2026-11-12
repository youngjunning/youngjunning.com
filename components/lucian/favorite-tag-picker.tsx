// Lucian UX/UI Prompt #031 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#031
'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import './favorite-tag-picker.css';

type TagOption = { id: string; label: string };

export default function FavoriteTagPicker({ options, value, onChange }: { options: TagOption[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef('');
  const typedAt = useRef(0);
  const id = useId();
  const selected = Math.max(0, options.findIndex(option => option.id === value));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  useEffect(() => {
    if (open) list.current?.querySelectorAll('[role="option"]')[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const show = () => { setActive(selected); setOpen(true); requestAnimationFrame(() => list.current?.focus()); };
  const choose = (index: number) => { onChange(options[index].id); setOpen(false); root.current?.querySelector<HTMLButtonElement>('.u031-btn')?.focus(); };
  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); root.current?.querySelector<HTMLButtonElement>('.u031-btn')?.focus(); }
    else if (event.key === 'Tab') setOpen(false);
    else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      typed.current = now - typedAt.current < 700 ? typed.current + event.key.toLocaleLowerCase() : event.key.toLocaleLowerCase();
      typedAt.current = now;
      const match = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(typed.current));
      if (match >= 0) setActive(match);
    }
  };

  return <div className={`ux u031 favorite-tag-picker${open ? ' is-open' : ''}`} ref={root}>
    <span className="u031-lab">按标签筛选</span>
    <button className="u031-btn" type="button" aria-haspopup="listbox" aria-controls={id} aria-expanded={open} onClick={() => open ? setOpen(false) : show()} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } }}>
      <span className="u031-flag" aria-hidden="true">#</span><span className="u031-v"><b>{options[selected].label}</b></span>
      <svg className="u031-car" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 7l4.5 4.5L13.5 7" /></svg>
    </button>
    <ul className={`u031-list${open ? ' is-open' : ''}`} id={id} ref={list} role="listbox" tabIndex={-1} aria-label="选择百宝箱标签" aria-activedescendant={open ? `${id}-${active}` : undefined} onKeyDown={onListKeyDown} onBlur={event => { if (!root.current?.contains(event.relatedTarget)) setOpen(false); }}>
      {options.map((option, index) => <li className={`u031-o${active === index && open ? ' is-active' : ''}`} id={`${id}-${index}`} key={option.id} role="option" aria-selected={selected === index} onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>{option.label}<svg className="u031-ck" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9.5l3.5 3.5L14 6" /></svg></li>)}
    </ul>
  </div>;
}
