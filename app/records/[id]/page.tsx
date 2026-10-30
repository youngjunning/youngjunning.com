import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/content';
import { SourceLabel } from '@/components/source-label';
export function generateStaticParams() { return getContent().records.map(item => ({ id: item.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return { title: getContent().records.find(item => item.id === id)?.title || '记录' }; }
export default async function RecordDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getContent().records.find(item => item.id === id);
  if (!item) notFound();
  return <article className="detail"><Link className="back-link" href="/records">← 返回个人记录</Link><h1>{item.title}</h1><span className="eyebrow">发生：{item.date || item.period || '未详'} · 录入：{item.recordedAt}</span><p>{item.text}</p><h2>当时的背景</h2><p>{item.context}</p>{item.basis && <><h2>判断依据</h2><p>{item.basis}</p><p>结果：{item.outcome || '尚无已核验结果。'}</p></>}{item.role && <><h2>参与范围</h2><p>{item.role}</p><p>{item.goal}</p>{item.outcomes?.map(text => <p key={text}>{text}</p>)}</>}{item.before && <><h2>变化</h2><p>此前：{item.before}</p><p>此后：{item.after}</p><p>{item.reason}</p><Link href={'/records/' + item.subjectId}>查看原记录</Link></>}<div className="source-box">来源<br />{item.sources.map((source,i) => <div key={i}><SourceLabel label={source.label} /></div>)}</div></article>;
}
