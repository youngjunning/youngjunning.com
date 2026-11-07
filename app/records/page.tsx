import { getSiteTheme } from '@/lib/site-theme';
import { StatechartRecords } from '@/components/statechart/pages';
import Shell from '@/components/shell';
import PersonalRecordFeed from '@/components/lucian/personal-record-feed';
import { getRecords } from '@/lib/records';
import { recordKinds } from '@/lib/record-kinds';
import Link from 'next/link';

export const metadata = { title: '个人记录' };
export default async function RecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const initialKind = recordKinds.find((kind) => kind.id === params.kind)?.id || 'all';
  if (await getSiteTheme() === 'statechart') return <StatechartRecords kind={initialKind} />;
  const records = getRecords();
  return <Shell active="records">
    <section className="page-intro record-intro"><div className="eyebrow">LIFE, IN CONTEXT</div><h1>留下经历与判断，<span>也留下变化的原因。</span></h1><p>经历记录发生过什么，项目记录目标与参与，判断保留当时的依据，变化连接之前和之后。每条记录独立存在，需要展开时再关联手记。</p></section>
    <section className="record-page-content"><PersonalRecordFeed key={initialKind} records={records} initialKind={initialKind} /><aside className="record-page-aside"><span className="eyebrow">A CONTINUOUS MEMORY</span><h2>让记录彼此有联系。</h2><p>{records.length} 条已分享记录。点击标题查看来源、录入时间及相关项目；变化记录保留原有信息，不用新结论抹掉过去。</p><p>尚未记录的结果和日期保持未知。本站只展示允许分享的内容。</p><Link className="text-link" href="/blog">阅读手记 ↗</Link></aside></section>
  </Shell>;
}
