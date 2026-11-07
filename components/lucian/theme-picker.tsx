// Lucian UX/UI Prompt #020 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#020
'use client';

import { useRef, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from 'react';
import './lucian-020.css';

const styles = [
  { id: 'mint', label: '薄荷', color: '#46a57c' },
  { id: 'violet', label: '紫电', color: '#8967d9' },
  { id: 'paper', label: '暖纸', color: '#e97857' },
] as const;
type StyleId = (typeof styles)[number]['id'];
const storageKey = 'zisheng-visual-style';

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
  return () => observer.disconnect();
}
function getStyle(): StyleId {
  const value = document.documentElement.getAttribute('data-style');
  return styles.some((style) => style.id === value) ? value as StyleId : 'mint';
}
export default function ThemePicker() {
  const selected = useSyncExternalStore(subscribe, getStyle, () => 'mint' as StyleId);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function choose(id: StyleId, focus = false) {
    document.documentElement.setAttribute('data-style', id);
    window.localStorage.setItem(storageKey, id);
    if (focus) buttons.current[styles.findIndex((style) => style.id === id)]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    choose(styles[(index + direction + styles.length) % styles.length].id, true);
  }

  const index = styles.findIndex((style) => style.id === selected);
  return <div className="ux u020 theme-picker" aria-label="页面风格">
    <span className="theme-picker-caption">风格</span>
    <div className="u020-row" role="radiogroup" aria-label="页面风格">
      <span className="u020-ring" aria-hidden="true" style={{ '--idx': index } as CSSProperties} />
      {styles.map((style, position) => <button key={style.id} ref={(node) => { buttons.current[position] = node; }} className="u020-sw" type="button" role="radio" aria-label={style.label} aria-checked={selected === style.id} tabIndex={selected === style.id ? 0 : -1} title={style.label} style={{ '--s': style.color } as CSSProperties} onClick={() => choose(style.id)} onKeyDown={(event) => onKeyDown(event, position)} />)}
    </div>
    <span className="theme-picker-name" aria-live="polite">{styles[index].label}</span>
  </div>;
}
