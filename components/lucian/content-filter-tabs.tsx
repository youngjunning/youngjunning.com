// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
'use client';
import { useEffect, useRef, type PointerEvent } from 'react';
import './lucian-039.css';
import './content-filter-tabs.css';

export default function ContentFilterTabs({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (value: string) => void; label: string }) {
  const nav = useRef<HTMLDivElement>(null), pill = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ pointerId: number; x: number; scrollLeft: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const root = nav.current, indicator = pill.current;
    if (!root || !indicator) return;
    const position = () => { const button = root.querySelector<HTMLElement>('[aria-pressed="true"]'); if (button) { indicator.style.setProperty('--x', button.offsetLeft + 'px'); indicator.style.setProperty('--w', button.offsetWidth + 'px'); } };
    const observer = new ResizeObserver(position); observer.observe(root); position(); return () => observer.disconnect();
  }, [value, options]);
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (drag.current.moved) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    }
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="content-filter-scroll" onPointerDown={event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.currentTarget.scrollWidth <= event.currentTarget.clientWidth) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, scrollLeft: event.currentTarget.scrollLeft, moved: false };
  }} onPointerMove={event => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const distance = event.clientX - current.x;
    if (!current.moved && Math.abs(distance) < 5) return;
    if (!current.moved) {
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
    }
    event.currentTarget.scrollLeft = current.scrollLeft - distance;
  }} onPointerLeave={() => { if (drag.current && !drag.current.moved) drag.current = null; }} onPointerUp={stopDrag} onPointerCancel={stopDrag} onClickCapture={event => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }}><div className="ux u039-tabs content-filter-tabs" role="group" aria-label={label} ref={nav}><span className="u039-pill" ref={pill} aria-hidden="true" />{options.map(option => <button className="u039-tab" type="button" key={option.id} aria-pressed={value === option.id} onClick={() => onChange(option.id)} onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}>{option.label}</button>)}</div></div>;
}
