// Lucian UX/UI Prompt #025 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#025
// Lucian UX/UI Prompt #027 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#027
'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import './lucian-025.css';
import './content-search.css';

type ContentSearchProps = {
  label: string;
  accessibleLabel: string;
  placeholder: string;
  query: string;
  onChange: (value: string) => void;
  resultCount: number;
  loading?: boolean;
};

export default function ContentSearch({ label, accessibleLabel, placeholder, query, onChange, resultCount, loading = false }: ContentSearchProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const caption = useRef<HTMLLabelElement>(null);
  const [focused, setFocused] = useState(false);
  const [gap, setGap] = useState(58);
  const [modifier, setModifier] = useState('Ctrl');
  const raised = focused || query.length > 0;

  useEffect(() => {
    if (caption.current) setGap(caption.current.offsetWidth * 0.8 + 2);
    setModifier(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl');

    function focusSearch(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.altKey) return;
      const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey;
      if (!shortcut && !slash) return;
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest('input, textarea, select, [role="textbox"]')));
      if (editing && (target !== input.current || slash)) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, [label]);

  function clear() {
    onChange('');
    input.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.key !== 'Escape') return;
    event.preventDefault();
    if (query) clear();
    else input.current?.blur();
  }

  return <div className="ux u025 content-search" role="search" aria-label={label}>
    <div className={`u025-f${raised ? ' is-up' : ''}${focused ? ' is-focus' : ''}`}>
      <div className="u025-box">
        <svg className="content-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.1 4.1" /></svg>
        <input ref={input} id={id} className="u025-in" type="search" aria-label={accessibleLabel} aria-describedby={`${id}-help`} aria-busy={loading} aria-keyshortcuts="Meta+K Control+K /" placeholder={raised ? placeholder : ''} autoComplete="off" spellCheck={false} value={query} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown} />
        <span className="u025-line" aria-hidden="true" style={{ '--gap': raised ? `${gap}px` : '0px' } as CSSProperties}><i className="l" /><i className="g" /><i className="r" /></span>
        <label ref={caption} className="u025-lab" htmlFor={id}>{label}</label>
        <div className="content-search-actions">
          {query ? <><span className="content-search-count" aria-label={loading ? '正在搜索' : `${resultCount} 条结果`}>{loading ? '…' : resultCount}</span><button className="content-search-clear" type="button" aria-label="清空搜索" onClick={clear}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg></button></> : <kbd className="content-search-shortcut" aria-hidden="true"><span>{modifier}</span><span>K</span></kbd>}
        </div>
      </div>
    </div>
    <span id={`${id}-help`} className="content-search-help">输入即筛选下方内容。按 Command 或 Control 加 K 聚焦搜索，Esc 清空关键词。</span>
  </div>;
}
