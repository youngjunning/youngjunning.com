'use client';
import { siteProfile } from '@/lib/site-profile.mjs';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from './shell';
import type { Catalog } from '@/lib/types';
import ContentSearch from './lucian/content-search';
import WordCloud from './lucian/word-cloud';
import { buildBlogCloud } from '@/lib/word-cloud.mjs';
import ArticleTags from './lucian/article-tags';
import ArticleReadingStats from './lucian/article-reading-stats';
import ArticleSort from './lucian/article-sort';
import { articleFilters, articleHref } from '@/lib/article-navigation.mjs';
import { displayContentTime } from '@/lib/content-time.mjs';

type ArticleFilters = { topic: string; query: string; tag: string; sort: 'updated' | 'created' };

export default function Library({ catalog, initialFilters }: { catalog: Catalog; initialFilters: ArticleFilters }) {
  const [filters, setFilters] = useState(initialFilters);
  const { topic, query, tag, sort } = filters;
  const setTopic = (value: string) => setFilters((current) => ({ ...current, topic: value }));
  const setQuery = (value: string) => setFilters((current) => ({ ...current, query: value }));
  const setTag = (value: string) => setFilters((current) => ({ ...current, tag: value }));
  const setSort = (value: 'updated' | 'created') => setFilters((current) => ({ ...current, sort: value }));
  const [searchIndex, setSearchIndex] = useState<{ id: string; text: string }[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const searchLoading = Boolean(query.trim() && !searchIndex && !searchError);
  useEffect(() => {
    const url = articleHref(filters);
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url);
  }, [filters]);
  useEffect(() => {
    const restore = () => setFilters(articleFilters(Object.fromEntries(new URLSearchParams(window.location.search))));
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!query.trim() || searchIndex) return;
    const controller = new AbortController();
    fetch('/api/search', { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error('Search unavailable');
      return response.json();
    }).then((data) => { setSearchIndex(data); setSearchError(false); }).catch((error) => { if (error.name !== 'AbortError') setSearchError(true); });
    return () => controller.abort();
  }, [query, searchIndex]);
  const docs = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const fulltext = new Map(searchIndex?.map((entry) => [entry.id, entry.text]));
    return catalog.documents.filter((doc) => (topic === 'all' || topic === doc.topic) && (!tag || doc.tags.includes(tag)) && terms.every((term) => `${doc.title} ${doc.summary} ${doc.headings.join(' ')} ${doc.tags.join(' ')} ${fulltext.get(doc.id) || ''}`.toLowerCase().includes(term))).sort((a, b) => (sort === 'created' ? (b.date || '').localeCompare(a.date || '') : (b.updatedAt || b.date || '').localeCompare(a.updatedAt || a.date || '')) || a.title.localeCompare(b.title, 'zh-CN'));
  }, [catalog, topic, query, tag, sort, searchIndex]);
  const cloud = useMemo(() => buildBlogCloud(catalog.documents.filter((doc) => topic === 'all' || doc.topic === topic)), [catalog, topic]);
  return <Shell><section className="page-intro"><div className="eyebrow">PERSONAL NOTES</div><h1>写下技术实践，<span>展开自己的思考。</span></h1><p>{siteProfile.name}的手记。这里阅读完整文章；经历、项目和判断的持续记录，从个人记录进入。</p><div className="intro-bottom"><div className="stats"><span><strong>{catalog.documents.length}</strong> 篇文章</span><span><strong>{catalog.topics.length}</strong> 种文章主题</span></div><Link className="text-link" href="/graph">探索文章间的引用 <span>↗</span></Link></div></section>
    <section className="library-content"><div className="section-heading"><div><span className="eyebrow">BROWSE BY QUESTION</span><h2>从一个问题开始</h2></div><span className="muted">原理、设计、实践、诊断与复盘</span></div>
      <div className="topic-grid">{catalog.topics.map((item, index) => <button key={item.id} className={`topic-card ${topic === item.id ? 'selected' : ''}`} style={{ '--topic-color': item.color } as React.CSSProperties} onClick={() => setTopic(topic === item.id ? 'all' : item.id)} aria-pressed={topic === item.id}><span className="topic-symbol">{['◇', '⌁', '↗', '◉', '✳'][index]}</span><span className="topic-count">{catalog.documents.filter((doc) => doc.topic === item.id).length} 篇</span><h3>{item.label}</h3><p>{item.description}</p><span className="topic-arrow">↗</span></button>)}</div>
      <section className="blog-wordcloud" aria-label="手记标签云"><WordCloud title="手记标签云" description="这里仅统计文章标签，大小按带有该标签的文章数区分。点击标签筛选下方文章，可与分类和关键词组合。" words={cloud} scopes={['手记']} groups={catalog.topics.map((item) => ({id:item.id,label:item.label,color:item.color}))} unit="篇文章" selectedLabel={tag} onSelect={(word) => setTag(tag === word ? '' : word)} /></section>
      <div id="blog-results" className="documents-header"><h2>{topic === 'all' ? '全部文章' : catalog.topics.find((item) => item.id === topic)?.label}<span>{docs.length}</span></h2><ContentSearch label="搜索文章" accessibleLabel="搜索文章全文" placeholder="标题、全文、标签…" query={query} onChange={setQuery} resultCount={docs.length} loading={searchLoading} /></div>
      <div className="document-filters unified-document-filters"><div className="muted article-filter-status" aria-live="polite"><span>{searchError ? '全文索引暂不可用，已搜索标题和摘要' : query && !searchIndex ? '正在载入全文索引…' : tag ? `标签：${tag}` : '按主题、标签和关键词浏览文章'}</span>{(topic !== 'all' || tag || query) && <button className="reset-filter" onClick={() => setFilters((current) => ({ ...current, topic: 'all', query: '', tag: '' }))}>清除全部筛选 ×</button>}</div><ArticleSort value={sort} onChange={setSort} /></div>
      <div className="document-grid">{docs.map((doc) => {
        const category = catalog.topics.find((item) => item.id === doc.topic)!;
        return <article className="document-card" key={doc.id}><div className="card-meta"><span className="category-tag" style={{ color: category.color }}>{category.label}</span></div><Link className="document-card-link" href={doc.url}><h3>{doc.title}</h3><p>{doc.summary}</p><div className="card-bottom"><span className="card-reading-meta"><span className="card-dates">{doc.date && <time dateTime={doc.date}>创建 {displayContentTime(doc.date)}</time>}{doc.updatedAt && <time dateTime={doc.updatedAt}>更新 {displayContentTime(doc.updatedAt)}</time>}</span><ArticleReadingStats words={doc.words} /></span><span>阅读文章 ↗</span></div></Link><ArticleTags tags={doc.tags} onSelect={setTag} /></article>;
      })}</div>
      {!docs.length && !searchLoading && <div className="empty-state"><h3>没有找到匹配的文章</h3><p>尝试缩短关键词，或清除分类与标签筛选。</p><button className="primary-button" onClick={() => setFilters((current) => ({ ...current, topic: 'all', query: '', tag: '' }))}>查看全部文章</button></div>}
    </section></Shell>;
}
