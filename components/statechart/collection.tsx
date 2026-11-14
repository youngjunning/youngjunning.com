'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { contentSubjects } from '@/lib/content-subjects.mjs';
import FavoriteShare from '../favorite-share';

export type PaperItem = { id: string; title: string; summary: string; kind: string; label: string; date?: string | null; tags?: string[]; subjects?: string[]; hasUsage?: boolean; href?: string; detail?: ReactNode; searchText?: string };
export default function PaperCollection({ items, label, initialQuery = '', initialKind = 'all', initialTag = '', initialSubject = 'all', fullText = false, pageSize = 0 }: { items: PaperItem[]; label: string; initialQuery?: string; initialKind?: string; initialTag?: string; initialSubject?: string; fullText?: boolean; pageSize?: number }) {
  const params = useSearchParams();
  const requestedKind = params.get('type') || params.get('topic') || params.get('status') || params.get('kind') || initialKind;
  const [query, setQuery] = useState(params.get('q') || initialQuery);
  const [kind, setKind] = useState(items.some(item => item.kind === requestedKind) ? requestedKind : 'all');
  const [tag, setTag] = useState(params.get('tag') || initialTag);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const requestedSubject = params.get('subject') || initialSubject;
  const [subject, setSubject] = useState(contentSubjects.some(item => item.id === requestedSubject) ? requestedSubject : 'all');
  const [usedOnly, setUsedOnly] = useState(params.get('used') === '1');
  const [index, setIndex] = useState<Record<string, string>>({});
  const [indexError, setIndexError] = useState(false);
  useEffect(() => {
    const url = new URL(location.href);
    const kindKey = url.pathname === '/blog' ? 'topic' : url.pathname === '/favorites' ? 'type' : 'kind';
    for (const [key, value] of [['q', query], [kindKey, kind === 'all' ? '' : kind], ['tag', tag], ['subject', subject === 'all' ? '' : subject], ['used', usedOnly ? '1' : '']]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  }, [query, kind, tag, subject, usedOnly]);
  useEffect(() => {
    if (!fullText) return;
    const abort = new AbortController();
    fetch('/api/search', { signal: abort.signal }).then(response => { if (!response.ok) throw new Error('search'); return response.json(); }).then(data => {
      const entries = Array.isArray(data) ? data : data.documents || data.entries || [];
      setIndex(Object.fromEntries(entries.map((entry: { id: string; text?: string; content?: string }) => [entry.id, entry.text || entry.content || ''])));
    }).catch(() => { if (!abort.signal.aborted) setIndexError(true); });
    return () => abort.abort();
  }, [fullText]);
  const kinds = [...new Map(items.map(item => [item.kind, item.label])).entries()];
  const tags = [...new Set(items.flatMap(item => item.tags || []))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const subjects = contentSubjects.filter(item => items.some(entry => entry.subjects?.includes(item.id)));
  const visible = useMemo(() => items.filter(item => (kind === 'all' || item.kind === kind) && (subject === 'all' || item.subjects?.includes(subject)) && (!usedOnly || item.hasUsage) && (!tag || item.tags?.includes(tag)) && `${item.title} ${item.summary} ${item.searchText || ''} ${item.tags?.join(' ') || ''} ${index[item.id] || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : sort === 'oldest' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')), [items, kind, subject, usedOnly, tag, query, sort, index]);
  const pageCount = pageSize ? Math.ceil(visible.length / pageSize) : 1;
  const currentPage = Math.min(page, pageCount || 1);
  const pageItems = pageSize ? visible.slice((currentPage - 1) * pageSize, currentPage * pageSize) : visible;
  const isFavorites = label === '百宝箱内容';
  useEffect(() => {
    if (!isFavorites) return;
    let frame = 0;
    const scrollToCard = () => {
      const id = window.location.hash.slice(1);
      if (!pageItems.some(item => item.id === id)) return;
      frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }));
    };
    scrollToCard();
    window.addEventListener('hashchange', scrollToCard);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', scrollToCard); };
  }, [isFavorites, pageItems]);
  const firstPage = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);
  const changePage = (next: number) => { setPage(next); document.querySelector('.sc-result')?.scrollIntoView({ block: 'start' }); };
  return <section aria-label={label}>
    {subjects.length > 0 && <div className="sc-subject-picker"><span className="sc-kicker">先从关注的问题开始</span><div className="sc-tabs" aria-label="按关注主题筛选"><button type="button" aria-pressed={subject === 'all'} onClick={() => { setSubject('all'); setPage(1); }}>全部主题</button>{subjects.map(item => <button type="button" key={item.id} aria-pressed={subject === item.id} onClick={() => { setSubject(item.id); setPage(1); }}>{item.label}</button>)}</div></div>}
    <form className="sc-filters" onSubmit={event => event.preventDefault()}><label>查找纸片<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="标题、内容或标签" /></label><label>标签<select value={tag} onChange={event => { setTag(event.target.value); setPage(1); }}><option value="">全部标签</option>{tags.map(value => <option key={value}>{value}</option>)}</select></label><label>排列<select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="newest">最近在前</option><option value="oldest">最早在前</option><option value="title">按名称</option></select></label><button type="button" onClick={() => { setQuery(''); setKind('all'); setTag(''); setSubject('all'); setUsedOnly(false); setPage(1); }}>清除筛选</button></form>
    <div className="sc-tabs" aria-label="按类别筛选"><button type="button" aria-pressed={kind === 'all'} onClick={() => { setKind('all'); setPage(1); }}>全部 · {items.length}</button>{kinds.map(([value, name]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setPage(1); }}>{name} · {items.filter(item => item.kind === value).length}</button>)}</div>
    {items.some(item => item.hasUsage !== undefined) && <div className="sc-tabs" aria-label="按使用证据筛选"><button type="button" aria-pressed={!usedOnly} onClick={() => { setUsedOnly(false); setPage(1); }}>全部条目</button><button type="button" aria-pressed={usedOnly} onClick={() => { setUsedOnly(true); setPage(1); }}>有使用记录</button></div>}
    <p className="sc-result" role="status">找到 {visible.length} 张纸片{indexError ? ' · 全文索引暂不可用，已搜索标题与摘要。' : ''}</p>
    <div className="sc-paper-grid">{pageItems.map((item, i) => <article className="sc-paper" id={item.id} key={item.id}><header><span>{item.label}</span><small>No. {String((currentPage - 1) * pageSize + i + 1).padStart(2, '0')}</small></header><h2>{item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</h2><p>{item.summary}</p><div className="sc-tags">{item.tags?.map(value => <button key={value} type="button" onClick={() => { setTag(value); setPage(1); }}>{value}</button>)}</div>{item.detail && <details><summary>展开纸片 · 来源与详情</summary><div className="sc-paper-detail">{item.detail}</div></details>}<footer><time>{item.date?.replace('T', ' ').replace('+08:00', '') || '日期未详'}</time>{item.href && <Link href={item.href}>翻开 →</Link>}{isFavorites && <FavoriteShare id={item.id} variant="statechart" />}</footer></article>)}</div>
    {pageCount > 1 && <nav className="sc-pagination" aria-label={`${label}分页`}><span>第 {currentPage} / {pageCount} 页</span><button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>上一页</button>{pageNumbers.map(number => <button type="button" key={number} aria-current={number === currentPage ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}<button type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>下一页</button></nav>}
    {!visible.length && <div className="sc-empty">没有找到匹配的纸片。可以换个关键词，或清除筛选。</div>}
  </section>;
}
