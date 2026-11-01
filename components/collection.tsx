'use client';
import Link from 'next/link';
import {priorityLabels,adoptionLabels} from '@/lib/favorite-tracking.mjs';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { RecordItem, Favorite, Post } from '@/lib/content';
const labels: Record<string,string> = { experience:'经历',project:'项目',judgment:'判断',change:'变化',thought:'想法',knowledge:'知识资料',card:'知识卡片' };
export function RecordList({ records }: { records: RecordItem[] }) {
  const [query, setQuery] = useState(''), [kind, setKind] = useState('all');
  const list = records.filter(item => (kind === 'all' || item.kind === kind) && (item.title + item.text + item.context).toLowerCase().includes(query.toLowerCase()));
  return <><div className="filters"><input aria-label="搜索个人记录" placeholder="搜索经历、项目或判断…" value={query} onChange={e => setQuery(e.target.value)} />{['all','experience','project','judgment','change','thought'].map(value => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{labels[value] || '全部'}</button>)}</div><p className="eyebrow" aria-live="polite">{list.length} 条记录</p>{list.map(item => <Link className="record-row" key={item.id} href={'/records/' + item.id}><div className="record-date">{item.date || '时间未详'}<span>{labels[item.kind]}</span></div><div><h3>{item.title}</h3><p>{item.text}</p></div><ArrowUpRight size={20} /></Link>)}{!list.length && <div className="empty">暂时没有符合条件的记录。<br />试试其他关键词或分类。</div>}</>;
}
export function FavoriteList({ favorites }: { favorites: Favorite[] }) {
  const [query, setQuery] = useState(''), [kind, setKind] = useState('all');
  const list = favorites.filter(item => (kind === 'all' || item.kind === kind) && (item.title + item.summary + item.tags.join(' ')).toLowerCase().includes(query.toLowerCase()));
  return <><div className="filters"><input aria-label="搜索收藏" placeholder="搜索项目、工具与知识资料…" value={query} onChange={e => setQuery(e.target.value)} />{['all','project','knowledge','card'].map(value => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{labels[value] || '全部'}</button>)}</div>{list.map(item => <article className="resource" id={item.id} key={item.id}><small>{labels[item.kind]} · {item.selection === 'explicit' ? '本人收藏' : '会话发现'} · {item.savedAt}</small><h2>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h2><p>{item.summary}</p><p>分级：{priorityLabels[item.priority || "lead"]} · 选用：{adoptionLabels[item.adoption || "unknown"]}</p><p>收藏理由：{item.reason}</p>{item.usages?.map(u=><p key={u.projectUrl}><a href={u.projectUrl}>{u.project}</a> · {adoptionLabels[u.stage]} · {u.purpose}<br/>证据：{u.evidence}</p>)}<Link href={"/graph?favorite="+item.id}>查看图谱关联 →</Link>{item.card && <><p>{item.card.understanding}</p><p>示例：{item.card.example}</p><p>{item.card.distinction}</p></>}<small>{item.sources.map(source => source.label).join('；')}</small></article>)}{!list.length && <div className="empty">收藏夹还在慢慢积累。<br />只保留有明确用途、来源可核验的资料。</div>}</>;
}
export function PostList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState('');
  const list = posts.filter(item => (item.title + item.description + item.tags.join(' ') + item.body).toLowerCase().includes(query.toLowerCase()));
  return <><div className="filters"><input aria-label="搜索文章" placeholder="搜索文章全文…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="article-grid">{list.map(item => <Link className="article-card" href={'/blog/' + item.id} key={item.id}>{item.cover && <img src={item.cover} alt={item.title + '封面'} loading="lazy" />}<div><small>{item.date || '日期未详'} · 俊宁</small><h2>{item.title} ↗</h2><p>{item.description}</p></div></Link>)}</div>{!list.length && <div className="empty">暂无匹配的公开文章。<br />试试其他关键词。</div>}</>;
}
