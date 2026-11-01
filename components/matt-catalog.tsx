'use client';
import { useState } from 'react';
type Skill = { name: string; category: string; summary: string; sourceUrl: string; scope: string; projects: string[]; usage: string };
export function MattCatalog({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('全部');
  const filtered = skills.filter(s => (category === '全部' || s.category === category) && [s.name, s.summary, s.usage, ...s.projects].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <><div className="filters"><input aria-label="搜索 Matt 技能" placeholder="搜索技能、用途或项目类型…" value={query} onChange={e => setQuery(e.target.value)} />{['全部', '已引入', '未引入', '历史保留'].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div><p aria-live="polite">{filtered.length} 项技能</p>{filtered.map(s => <details className="resource" key={s.name} style={{ overflowWrap: 'anywhere', minWidth: 0 }}><summary style={{ cursor: 'pointer' }}><strong>{s.name}</strong> · {s.category}</summary><p>{s.summary}</p><p>安装范围：{s.scope}</p><p>历史安装涉及的项目类型：{s.projects.join('、') || '暂无登记'}。此项不代表实际调用。</p><p>使用情况：{s.usage}</p><a href={s.sourceUrl} target="_blank" rel="noreferrer">查看上游技能 ↗</a></details>)}{!filtered.length && <div className="empty">暂无匹配技能，请调整关键词或分类。</div>}</>;
}
