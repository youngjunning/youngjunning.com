// Lucian UX/UI Prompt #046 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#046
'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import './article-filter-menu.css';

type TagOption = { label: string; count: number };

type ArticleFilterMenuProps = {
  tag: string;
  tags: TagOption[];
  tagTotal: number;
  onTagChange: (value: string) => void;
};

function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (!query || index < 0) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>;
}

export default function ArticleFilterMenu({ tag, tags, tagTotal, onTagChange }: ArticleFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId().replaceAll(':', '');
  const listId = `${panelId}-tags`;
  const filteredTags = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? tags.filter((option) => option.label.toLocaleLowerCase().includes(normalized)) : tags;
  }, [query, tags]);
  const options = useMemo(() => [{ label: '', count: tagTotal }, ...filteredTags], [filteredTags, tagTotal]);
  const currentActive = Math.min(active, Math.max(0, options.length - 1));

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function expand() {
    setActive(Math.max(0, options.findIndex((option) => option.label === tag)));
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    setQuery('');
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onTagChange(option.label);
    setQuery('');
    setActive(0);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (Math.min(current, options.length - 1) + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (event.key === 'Home') {
      event.preventDefault(); setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault(); setActive(Math.max(0, options.length - 1));
    } else if (event.key === 'Enter' && options.length) {
      event.preventDefault(); choose(currentActive);
    } else if (event.key === 'Escape') {
      event.preventDefault(); close();
    }
  }

  return <div className={`ux u046 article-filter-menu${open ? ' is-open' : ''}`} ref={rootRef}>
    <button className="article-filter-trigger" ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} onClick={() => open ? close(false) : expand()} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); expand(); } }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      <span>{tag ? `#${tag}` : '筛选'}</span>
      {tag && <small aria-label="1 个筛选条件">1</small>}
      <svg className="article-filter-chevron" viewBox="0 0 18 18" aria-hidden="true"><path d="m5 7 4 4 4-4" /></svg>
    </button>
    <div className="article-filter-panel" id={panelId} role="dialog" aria-label="筛选文章" hidden={!open}>
      <label className="u046-field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
        <input ref={inputRef} className="u046-in" type="search" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={options[currentActive] ? `${listId}-${currentActive}` : undefined} autoComplete="off" spellCheck={false} placeholder="搜索标签" aria-label="搜索文章标签" value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onSearchKeyDown} />
        {query && <button className="article-filter-query-clear" type="button" aria-label="清空标签搜索" onClick={() => { setQuery(''); setActive(0); inputRef.current?.focus(); }}>×</button>}
      </label>
      <div className="u046-body">
        <ul className="u046-list" id={listId} role="listbox" aria-label="文章标签">
          {options.map((option, index) => <Fragment key={option.label || 'all'}>
            {index === 0 && <li className="u046-g" role="presentation">标签</li>}
            <li className="u046-op" id={`${listId}-${index}`} role="option" aria-selected={option.label === tag} data-active={index === currentActive} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
              <span className="article-filter-tag-icon" aria-hidden="true">{option.label ? '#' : '全'}</span>
              <span><Highlight text={option.label || '全部标签'} query={query.trim()} /></span>
              <small>{option.count}</small>
              <svg className="article-filter-check" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9.5 7.5 13 14 6" /></svg>
            </li>
          </Fragment>)}
          {!filteredTags.length && query && <li className="u046-empty" role="presentation"><b>没有匹配“{query.trim()}”的标签</b>换一个关键词试试</li>}
        </ul>
      </div>
      <div className="u046-foot">
        <button type="button" className="article-filter-reset" disabled={!tag} onClick={() => { onTagChange(''); setQuery(''); }}>清除筛选</button>
        <button type="button" className="article-filter-done" onClick={() => close()}>完成</button>
      </div>
    </div>
  </div>;
}
