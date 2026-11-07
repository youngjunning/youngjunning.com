// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
// Lucian UX/UI Prompt #092 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#092
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ContentSearch from './content-search';
import ContentFilterTabs from './content-filter-tabs';
import ResourceCards from './resource-cards';
import type { Favorite } from '@/lib/favorite-types';
import { attributionLabels, favoriteTypeLabels, filterFavorites } from '@/lib/favorite-search.mjs';
import { contentSubjects, subjectLabel } from '@/lib/content-subjects.mjs';
import { displayContentTime } from '@/lib/content-time.mjs';
import './favorites.css';

const types = [{ id: 'all', label: '全部类型' }, ...Object.entries(favoriteTypeLabels).map(([id, label]) => ({ id, label }))];
const usageLabels = { trial: '试用中', adopted: '已采用', retired: '已停用' };
export default function FavoriteCollection({ favorites }: { favorites: Favorite[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [type, setType] = useState(types.some(item => item.id === params.get('type')) ? params.get('type')! : 'all');
  const [subject, setSubject] = useState(contentSubjects.some(item => item.id === params.get('subject')) ? params.get('subject')! : 'all');
  const [usedOnly, setUsedOnly] = useState(params.get('used') === '1');
  const subjects = [{ id: 'all', label: '全部主题' }, ...contentSubjects.filter(item => favorites.some(favorite => favorite.subjects.includes(item.id)))];
  useEffect(() => {
    const url = new URL(location.href);
    for (const [key, value] of [['q', query], ['type', type === 'all' ? '' : type], ['subject', subject === 'all' ? '' : subject], ['used', usedOnly ? '1' : '']]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  }, [query, type, subject, usedOnly]);
  const visible = filterFavorites(favorites, query, type, subject, usedOnly) as Favorite[];
  return <section className="favorites-content">
    <div className="favorite-subjects"><span className="eyebrow">先从关注的问题开始</span><ContentFilterTabs options={subjects} value={subject} onChange={setSubject} label="按关注主题筛选" /></div>
    <div className="favorite-toolbar"><div className="favorite-secondary-filters"><ContentFilterTabs options={types} value={type} onChange={setType} label="按内容类型筛选" /><ContentFilterTabs options={[{ id: 'all', label: '全部条目' }, { id: 'used', label: '有使用记录' }]} value={usedOnly ? 'used' : 'all'} onChange={value => setUsedOnly(value === 'used')} label="按使用证据筛选" /></div><ContentSearch label="搜索百宝箱" accessibleLabel="搜索条目正文、来源、用途和标签" placeholder="主题、概念或使用场景" query={query} onChange={setQuery} resultCount={visible.length} /></div>
    <p className="favorite-count" role="status">{visible.length} 条内容 · 资源保留出处，笔记说明表达归属；使用情况按具体项目记录。</p>
    {visible.length ? <ResourceCards ariaLabel="百宝箱条目" areas={visible.map(item => ({
      id: item.id, title: item.title, description: item.summary,
      status: `${favoriteTypeLabels[item.type]} · ${attributionLabels[item.attribution]} · ${item.selection === 'explicit' ? '主动收藏' : '会话发现'}`,
      details: [
        `主题：${item.subjects.map(subjectLabel).join('、')}`,
        ...(item.note ? [item.note.body, ...(item.note.context ? [`背景：${item.note.context}`] : []), ...(item.note.example ? [`示例：${item.note.example}`] : []), ...(item.note.boundary ? [`边界：${item.note.boundary}`] : [])] : []),
        ...(item.usages || []).map(usage => `使用记录：${usage.project} · ${usageLabels[usage.stage]} · ${usage.purpose}\n依据：${usage.evidence}`),
        `保留理由：${item.reason}`, `来源：${item.sources.map(source => source.label).join('；')}`,
        `保存于 ${displayContentTime(item.savedAt)}${item.updatedAt ? ` · 更新于 ${displayContentTime(item.updatedAt)}` : ''}`,
      ],
      links: [...(item.relatedIds || []).map(id => ({ href: `/favorites#${id}`, label: favorites.find(favorite => favorite.id === id)?.title || '关联条目' })), ...(item.usages || []).map(usage => ({ href: usage.projectUrl, label: usage.project }))],
      href: item.url, linkLabel: '打开原始来源',
    }))} /> : <div className="ux u092 empty favorite-empty"><div className="u092-none"><div className="u092-art" aria-hidden="true"><svg viewBox="0 0 150 92"><path className="u092-shelf" d="M8 30h134M8 56h134M8 82h134" /><g className="u092-lens"><circle cx="34" cy="38" r="20" /><path className="gl" d="M24 30a12 12 0 0 1 8-5" /><path d="M48 52l14 14" /></g></svg></div><p className="u092-nt">没有匹配的条目</p><p className="u092-ns">换个主题或关键词，也可以清除筛选。</p><div className="u092-sgs"><button className="u092-sg" type="button" onClick={() => { setQuery(''); setType('all'); setSubject('all'); setUsedOnly(false); }}><span>清除筛选，查看全部</span><b>{favorites.length} 条</b></button></div></div></div>}
  </section>;
}
