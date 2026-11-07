'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { contentSubjects } from '@/lib/content-subjects.mjs';

export type PaperItem = { id: string; title: string; summary: string; kind: string; label: string; date?: string | null; tags?: string[]; subjects?: string[]; hasUsage?: boolean; href?: string; detail?: ReactNode; searchText?: string };
export default function PaperCollection({ items, label, initialQuery = '', initialKind = 'all', initialTag = '', initialSubject = 'all', fullText = false }: { items: PaperItem[]; label: string; initialQuery?: string; initialKind?: string; initialTag?: string; initialSubject?: string; fullText?: boolean }) {
  const params = useSearchParams();
  const requestedKind = params.get('type') || params.get('topic') || params.get('status') || params.get('kind') || initialKind;
  const [query, setQuery] = useState(params.get('q') || initialQuery);
  const [kind, setKind] = useState(items.some(item => item.kind === requestedKind) ? requestedKind : 'all');
  const [tag, setTag] = useState(params.get('tag') || initialTag);
  const [sort, setSort] = useState('newest');
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
  return <section aria-label={label}>
    {subjects.length > 0 && <div className="sc-subject-picker"><span className="sc-kicker">先从关注的问题开始</span><div className="sc-tabs" aria-label="按关注主题筛选"><button type="button" aria-pressed={subject === 'all'} onClick={() => setSubject('all')}>全部主题</button>{subjects.map(item => <button type="button" key={item.id} aria-pressed={subject === item.id} onClick={() => setSubject(item.id)}>{item.label}</button>)}</div></div>}
    <form className="sc-filters" onSubmit={event => event.preventDefault()}><label>查找纸片<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="标题、内容或标签" /></label><label>标签<select value={tag} onChange={event => setTag(event.target.value)}><option value="">全部标签</option>{tags.map(value => <option key={value}>{value}</option>)}</select></label><label>排列<select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">最近在前</option><option value="oldest">最早在前</option><option value="title">按名称</option></select></label><button type="button" onClick={() => { setQuery(''); setKind('all'); setTag(''); setSubject('all'); setUsedOnly(false); }}>清除筛选</button></form>
    <div className="sc-tabs" aria-label="按类别筛选"><button type="button" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>全部 · {items.length}</button>{kinds.map(([value, name]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{name} · {items.filter(item => item.kind === value).length}</button>)}</div>
    {items.some(item => item.hasUsage !== undefined) && <div className="sc-tabs" aria-label="按使用证据筛选"><button type="button" aria-pressed={!usedOnly} onClick={() => setUsedOnly(false)}>全部条目</button><button type="button" aria-pressed={usedOnly} onClick={() => setUsedOnly(true)}>有使用记录</button></div>}
    <p className="sc-result" role="status">找到 {visible.length} 张纸片{indexError ? ' · 全文索引暂不可用，已搜索标题与摘要。' : ''}</p>
    <div className="sc-paper-grid">{visible.map((item, i) => <article className="sc-paper" id={item.id} key={item.id}><header><span>{item.label}</span><small>No. {String(i + 1).padStart(2, '0')}</small></header><h2>{item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</h2><p>{item.summary}</p><div className="sc-tags">{item.tags?.map(value => <button key={value} type="button" onClick={() => setTag(value)}>{value}</button>)}</div>{item.detail && <details><summary>展开纸片 · 来源与详情</summary><div className="sc-paper-detail">{item.detail}</div></details>}<footer><time>{item.date?.replace('T', ' ').replace('+08:00', '') || '日期未详'}</time>{item.href && <Link href={item.href}>翻开 →</Link>}</footer></article>)}</div>
    {!visible.length && <div className="sc-empty">没有找到匹配的纸片。可以换个关键词，或清除筛选。</div>}
  </section>;
}
