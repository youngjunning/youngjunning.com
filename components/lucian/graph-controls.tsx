// Lucian UX/UI Prompt #025 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#025
// Lucian UX/UI Prompt #013 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#013
'use client';
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import './lucian-025.css';
import './lucian-013.css';
import './graph-controls.css';

export function GraphSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  return <div className="ux u025 graph-search"><div className={`u025-f ${focused || value ? 'is-up' : ''} ${focused ? 'is-focus' : ''}`}><div className="u025-box">
    <input id={id} className="u025-in" type="search" value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    <span className="u025-line" aria-hidden="true"><i className="l" /><i className="g" /><i className="r" /></span><label className="u025-lab" htmlFor={id}>搜索文档</label>
  </div></div></div>;
}

export function GraphLinkSwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const [stretch, setStretch] = useState(false);
  const [dragging, setDragging] = useState(false);
  const knobRef = useRef<HTMLSpanElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipClick = useRef(false);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  function choose(next: boolean) {
    onChange(next);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStretch(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setStretch(false), 170);
    }
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current || !knobRef.current) return;
    const scale = event.currentTarget.getBoundingClientRect().width / event.currentTarget.offsetWidth || 1;
    const dx = (event.clientX - drag.current.x) / scale;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    if (!drag.current.moved) return;
    setDragging(true);
    knobRef.current.style.left = `${Math.max(8, Math.min(72, drag.current.start + dx))}px`;
    knobRef.current.style.width = `${60 + Math.min(18, Math.abs(dx) * .25)}px`;
  }
  function end() {
    if (!drag.current || !knobRef.current) return;
    const moved = drag.current.moved;
    const x = parseFloat(knobRef.current.style.left || (value ? '72' : '8'));
    drag.current = null; setDragging(false);
    knobRef.current.style.left = ''; knobRef.current.style.width = '';
    if (moved) { choose(x > 40); skipClick.current = true; }
  }
  return <div className={`ux u013 graph-link-switch ${value ? 'is-on' : ''} ${stretch ? 'is-stretch' : ''} ${dragging ? 'is-drag' : ''}`}>
    <span className="u013-slot"><button className="u013-sw" type="button" role="switch" aria-label="显示主题连线" aria-checked={value} onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { x: event.clientX, start: value ? 72 : 8, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={() => { if (skipClick.current) { skipClick.current = false; return; } choose(!value); }}><span ref={knobRef} className="u013-knob" aria-hidden="true"><svg viewBox="0 0 24 24"><path className="u013-x" d="M7.5 7.5l9 9M16.5 7.5l-9 9" /><path className="u013-v" d="M5.5 12.5l4.5 4.5 8.5-9" /></svg></span></button></span><span className="graph-link-caption">主题连线</span>
  </div>;
}
