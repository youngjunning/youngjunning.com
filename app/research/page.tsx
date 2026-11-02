import Link from 'next/link';
import { getContent } from '@/lib/content';

export const metadata = { title: '探索清单' };
const statuses = [
  { id: 'active', label: '待探索' }, { id: 'todo', label: '待研究' },
  { id: 'in_progress', label: '研究中' }, { id: 'paused', label: '暂缓' },
  { id: 'completed', label: '已完成' }, { id: 'dropped', label: '已放弃' },
] as const;
const statusLabel: Record<string, string> = { todo: '待研究', in_progress: '研究中', paused: '暂缓', completed: '已完成', dropped: '已放弃' };

export default async function Research({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: requested } = await searchParams;
  const status = statuses.some(item => item.id === requested) ? requested! : 'active';
  const items = getContent().research.filter(item => status === 'active' ? ['todo', 'in_progress', 'paused'].includes(item.status) : item.status === status);
  return <><header className="page-head"><span className="eyebrow">QUESTIONS WORTH RETURNING TO</span><h1>探索清单。</h1><p>留住值得继续研究的问题、保留理由和下一步。完成状态以实际结果为准。</p></header>
    <section className="page-body"><nav className="curation-tabs" aria-label="探索状态">{statuses.map(entry => <Link key={entry.id} href={`/research?status=${entry.id}`} aria-current={entry.id === status ? 'page' : undefined}>{entry.label}</Link>)}</nav>
      <div className="curation-list">{items.map(item => <article className="curation-card" id={item.id} key={item.id}><div className="curation-meta">{statusLabel[item.status]} · 更新于 {item.updatedAt}</div><h2>{item.title}</h2><p className="curation-question">{item.question}</p><p>{item.context} {item.reason}</p><div className="curation-next"><strong>下一步{item.nextStepSource === 'suggested' ? ' · AI 建议' : ''}</strong><p>{item.nextStep}</p></div>
        {item.blocker && <p>暂缓原因：{item.blocker}</p>}{item.result && <p>研究结果：{item.result}</p>}
        {item.relatedFavoriteIds.length > 0 && <p>关联资料：{item.relatedFavoriteIds.map(id => <Link key={id} href={`/favorites#${id}`}>{id} ↗ </Link>)}</p>}
        <small>来源：{item.sources.map((source, index) => <span key={index}>{index > 0 ? '；' : ''}{source.url ? <a href={source.url}>{source.label} ↗</a> : source.label}</span>)}</small>
      </article>)}{!items.length && <div className="empty">这里还没有已公开的探索项。<br />值得追的问题会保留来源和下一步。</div>}</div>
    </section></>;
}
