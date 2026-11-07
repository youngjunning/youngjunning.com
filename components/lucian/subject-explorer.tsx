'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ContentFilterTabs from './content-filter-tabs';
import ContentSearch from './content-search';
import ResourceCards from './resource-cards';
import { contentSubjects, subjectLabel } from '@/lib/content-subjects.mjs';
import { displayContentTime } from '@/lib/content-time.mjs';
import './subject-explorer.css';

export type SubjectEntry = { id: string; title: string; summary: string; kind: string; label: string; subjects: string[]; date: string | null; tags: string[]; href: string };
export default function SubjectExplorer({ items, initialSubject = 'all' }: { items: SubjectEntry[]; initialSubject?: string }) {
  const params = useSearchParams();
  const [subject, setSubject] = useState(params.get('subject') || initialSubject);
  const [kind, setKind] = useState(params.get('kind') || 'all');
  const [query, setQuery] = useState(params.get('q') || '');
  useEffect(() => {
    const url = new URL(location.href);
    for (const [key, value] of [['subject', subject === 'all' ? '' : subject], ['kind', kind === 'all' ? '' : kind], ['q', query]]) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
    history.replaceState(null, '', url);
  }, [subject, kind, query]);
  const subjects = [{ id: 'all', label: '全部主题' }, ...contentSubjects.filter(item => items.some(entry => entry.subjects.includes(item.id)))];
  const kinds = [{ id: 'all', label: '全部内容' }, ...[...new Map(items.map(item => [item.kind, item.label])).entries()].map(([id, label]) => ({ id, label }))];
  const visible = items.filter(item => (subject === 'all' || item.subjects.includes(subject)) && (kind === 'all' || item.kind === kind) && `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="subject-explorer" aria-label="跨栏目主题浏览"><ContentFilterTabs options={subjects} value={subject} onChange={setSubject} label="关注主题" /><div className="subject-explorer-tools"><ContentFilterTabs options={kinds} value={kind} onChange={setKind} label="内容类型" /><ContentSearch label="搜索主题内容" accessibleLabel="搜索主题下的文章、个人记录、资源与知识笔记" query={query} onChange={setQuery} resultCount={visible.length} placeholder="文章、概念、方法或项目" /></div><p role="status">{visible.length} 条相关内容 · 主题表示浏览关联，具体观点与使用情况请回到原文核对。</p><ResourceCards ariaLabel="主题内容" areas={visible.map(item => ({ id: 'subject-' + item.id, title: item.title, description: item.summary.slice(0, 260), status: item.label, details: [`主题：${item.subjects.map(subjectLabel).join('、')}`, ...(item.date ? [`内容时间：${displayContentTime(item.date)}`] : [])], href: item.href, linkLabel: '阅读原文' }))} />{!visible.length && <p>当前筛选没有匹配内容，可以换一个主题或关键词。</p>}</section>;
}
