// Lucian UX/UI Prompt #043 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#043
'use client';

import { useEffect, useRef } from 'react';
import './list-pagination.css';

export default function ListPagination({ page, pageCount, total, onChange, label }: { page: number; pageCount: number; total: number; onChange: (page: number) => void; label: string }) {
  const pager = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const previous = useRef(page);
  const first = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => first + index);
  useEffect(() => {
    const position = () => {
      const active = pager.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active || !pager.current || !indicator.current) return;
      indicator.current.style.setProperty('--l', `${active.offsetLeft}px`);
      indicator.current.style.setProperty('--r', `${pager.current.clientWidth - active.offsetLeft - active.offsetWidth}px`);
    };
    pager.current?.classList.toggle('go-r', page > previous.current);
    pager.current?.classList.toggle('go-l', page < previous.current);
    previous.current = page;
    position();
    const observer = new ResizeObserver(position);
    if (pager.current) observer.observe(pager.current);
    return () => observer.disconnect();
  }, [page, first]);
  if (pageCount <= 1) return null;
  return <div className="ux list-pagination"><div className="list-pagination-heading"><span>{label} · 共 {total} 条</span><span>第 {page} / {pageCount} 页</span></div>
    <nav className="u043-pager" ref={pager} aria-label={`${label}分页`}>
      <span className="u043-ind" ref={indicator} aria-hidden="true" />
      <button className="u043-ar" type="button" aria-label="上一页" disabled={page <= 1} onClick={() => onChange(page - 1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" /></svg></button>
      {pages.map(number => <button className="u043-pg" type="button" key={number} aria-label={`第 ${number} 页`} aria-current={page === number ? 'page' : undefined} onClick={() => onChange(number)}>{number}</button>)}
      <button className="u043-ar" type="button" aria-label="下一页" disabled={page >= pageCount} onClick={() => onChange(page + 1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" /></svg></button>
    </nav></div>;
}
