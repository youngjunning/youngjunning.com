// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
'use client';
import { useId, useRef } from 'react';
import './article-sort.css';

export default function ArticleSort({ value, onChange }: { value: 'updated' | 'created'; onChange: (value: 'updated' | 'created') => void }) {
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const options = [{ value: 'updated', label: '按更新时间' }, { value: 'created', label: '按创建时间' }] as const;
  return <div className="ux u039 article-sort"><span className="article-sort-label">排序</span><div className="u039-tabs" role="tablist" aria-label="文章排序方式" style={{ '--x': value === 'updated' ? '5px' : 'calc(100% + 5px)', '--w': 'calc(50% - 5px)' } as React.CSSProperties}>
    <span className="u039-pill" aria-hidden="true" />
    {options.map((option, index) => <button key={option.value} ref={(node) => { tabs.current[index] = node; }} className="u039-tab" type="button" role="tab" aria-selected={value === option.value} aria-controls={id} tabIndex={value === option.value ? 0 : -1} onClick={() => onChange(option.value)} onKeyDown={(event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = options[index === 0 ? 1 : 0].value;
      onChange(next);
      tabs.current[index === 0 ? 1 : 0]?.focus();
    }}>{option.label}</button>)}
  </div><span id={id} className="sr-only" role="tabpanel">{value === 'updated' ? '按更新时间倒序' : '按创建时间倒序'}</span></div>;
}
