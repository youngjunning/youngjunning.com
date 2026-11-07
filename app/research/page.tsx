import { getSiteTheme } from '@/lib/site-theme';
import { StatechartResearch } from '@/components/statechart/pages';
import Link from 'next/link';
import Shell from '@/components/shell';
import CurationAccordion from '@/components/lucian/curation-accordion';
import { getResearch } from '@/lib/curation';

export const metadata = { title: '探索清单' };
const statuses = [
  { id: 'todo', label: '待探索' }, { id: 'in_progress', label: '探索中' },
  { id: 'paused', label: '暂缓' },
  { id: 'completed', label: '已完成' }, { id: 'dropped', label: '已放弃' },
] as const;
const statusLabel: Record<string, string> = { todo: '待探索', in_progress: '探索中', paused: '暂缓', completed: '已完成', dropped: '已放弃' };

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: requested } = await searchParams;
  if (await getSiteTheme() === 'statechart') return <StatechartResearch status={requested} />;
  const research = getResearch();
  const visibleStatuses = statuses.filter(entry => research.some(item => item.status === entry.id));
  const status = visibleStatuses.some(item => item.id === requested) ? requested! : visibleStatuses[0]?.id ?? 'todo';
  const items = research.filter(item => item.status === status);
  return <Shell active="research"><div className="curation-page"><section className="page-intro curation-intro"><div className="curation-intro-inner"><div className="eyebrow">EXPLORATION / 01</div><h1>探索清单<span> / 值得继续追的问题</span></h1><p>把尚未弄清的事留在这里：为什么值得追、下一步怎么验证，都能回头查证。</p></div></section>
    <div className="curation-layout"><aside className="curation-aside"><span className="curation-kicker">正在浏览</span><strong>{statuses.find(entry => entry.id === status)?.label}</strong><p>{items.length} 条线索</p><div className="curation-aside-rule" /><p>收藏资料只是线索；完成状态以实际研究结果为准。</p></aside><section className="curation-main" aria-label="探索清单">{visibleStatuses.length > 1 && <nav className="curation-tabs" aria-label="探索状态">{visibleStatuses.map(entry => <Link key={entry.id} href={`/research?status=${entry.id}`} aria-current={entry.id === status ? 'page' : undefined}>{entry.label}</Link>)}</nav>}
    <CurationAccordion key={status} empty="这里还没有已分享的探索项。值得追的问题会保留来源和下一步。" panels={items.map(item => ({ id: item.id, title: item.title, meta: `${statusLabel[item.status]} · ${item.updatedAt}`, preview: item.question, body: <>
      <span className="curation-body-label">要弄清的问题</span><p>{item.question}</p><span className="curation-body-label">背景与理由</span><p>{item.context} {item.reason}</p>
      <span className="curation-body-label">下一步{item.nextStepSource === 'suggested' ? ' · AI 建议' : ''}</span><p>{item.nextStep}</p>
      {item.blocker && <p>暂缓原因：{item.blocker}</p>}{item.result && <p>研究结果：{item.result}</p>}
      {item.relatedFavoriteIds.length > 0 && <p>关联资料：{item.relatedFavoriteIds.map(id => <Link key={id} href={`/favorites#${id}`}>{id} ↗ </Link>)}</p>}
      <p>来源：{item.sources.map((source, index) => <span key={index}>{index > 0 ? '；' : ''}{source.url ? <a href={source.url}>{source.label} ↗</a> : source.label}</span>)}</p>
    </> }))} /></section></div></div>
  </Shell>;
}
