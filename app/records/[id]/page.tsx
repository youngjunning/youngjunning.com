import { getSiteTheme } from '@/lib/site-theme';
import { StatechartRecord } from '@/components/statechart/pages';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Shell from '@/components/shell';
import PersonalRecordFeed from '@/components/lucian/personal-record-feed';
import { getRecord, getRecords } from '@/lib/records';

export function generateStaticParams() { return getRecords().map(({ id }) => ({ id })); }
export const dynamicParams = true;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: getRecord((await params).id)?.title || '记录未找到' };
}
export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const theme = await getSiteTheme();
  const record = getRecord((await params).id);
  if (!record) notFound();
  if (theme === 'statechart') return <StatechartRecord record={record} />;
  const records = getRecords();
  const related = records.filter((item) => item.id !== record.id && (item.projectId === record.id || (item.kind === 'change' && item.subjectId === record.id) || item.relatedIds.includes(record.id)));
  return <Shell active="records"><section className="memory-record-detail"><div className="reader-top"><Link className="back-link" href="/records">← 返回个人记录</Link><a href={`/api/records/${record.id}`}>结构化记录 ↗</a></div><h1>{record.title}</h1><div className="reader-layout"><PersonalRecordFeed records={[record]} allRecords={records} detail /><aside className="reader-aside"><div className="eyebrow">CONNECTED RECORDS</div><h3>后续与关联</h3>{related.length ? related.map((item) => <Link href={`/records/${item.id}`} key={item.id}>{item.title}<span>↗</span></Link>) : <p className="muted">暂未记录后续变化或关联事项。</p>}</aside></div></section></Shell>;
}
