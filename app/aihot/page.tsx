import Link from 'next/link';
import { getSiteTheme } from '@/lib/site-theme';
import { getCatalog } from '@/lib/content';
import { siteProfile } from '@/lib/site-profile.mjs';
import Shell from '@/components/shell';
import StatechartShell from '@/components/statechart/shell';
import ResourceCards from '@/components/lucian/resource-cards';
import './industry.css';

export const metadata = { title: '行业动态' };

const aihotUrl = 'https://aihot.news/';
const description = '本站的行业观察按周刊发布。AIHOT（aihot.news）是外部线索来源；每期核对原始发布后，再写下本站的判断。';

export default async function AIHOTPage() {
  const weeklies = getCatalog().documents
    .filter((doc): doc is typeof doc & { date: string } => Boolean(doc.date && doc.tags?.some(tag => siteProfile.weeklyTags.includes(tag))))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  if (await getSiteTheme() === 'statechart') {
    return <StatechartShell active="/aihot" title="行业动态" subtitle={description}>
      <section className="sc-section industry-statechart">
        <header><span className="sc-kicker">SITE / WEEKLY REVIEW</span><h2>本站周刊</h2></header>
        {weeklies.length ? <div className="sc-notes-row">{weeklies.map(doc => <Link className="sc-note" href={doc.url} key={doc.id}><small>{doc.date.slice(0, 10)} · 已核对来源</small><h3>{doc.title}</h3><p>{doc.summary}</p><span>阅读本期 →</span></Link>)}</div> : <p>本站尚未发布行业周刊。<Link href="/blog">先浏览手记 →</Link></p>}
      </section>
      <section className="sc-section industry-statechart-source"><header><span className="sc-kicker">SOURCE / EDITORIAL PROCESS</span><h2>AIHOT 在这里做什么</h2></header><p>维护周刊时，AIHOT 提供候选线索；编辑逐条打开原始来源，核对发布时间、实际变化与适用范围，再决定是否写入本站。AIHOT 的精选不代表本站认可。</p><p><a href={aihotUrl} target="_blank" rel="noopener noreferrer">访问 aihot.news ↗</a></p></section>
    </StatechartShell>;
  }

  const areas = weeklies.map(doc => ({
    id: doc.id,
    title: doc.title,
    description: doc.summary,
    status: `${doc.date.slice(0, 10)} · 本站周刊`,
    details: [],
    href: doc.url,
    linkLabel: '阅读本期',
  }));

  return <Shell active="industry"><div className="industry-page">
    <section className="page-intro"><div className="eyebrow">INDUSTRY / WEEKLY REVIEW</div><h1>行业动态</h1><p>{description}</p></section>
    <div className="industry-layout">
      <section className="industry-issues" aria-labelledby="industry-issues-title"><div className="industry-section-heading"><span>01 / PUBLISHED</span><h2 id="industry-issues-title">本站周刊</h2><p>每期保留时间范围、原始来源与适用边界。</p></div>{areas.length ? <ResourceCards ariaLabel="行业周刊" areas={areas} /> : <p className="industry-empty">本站尚未发布行业周刊。<Link href="/blog">先浏览手记 →</Link></p>}</section>
      <aside className="industry-source" aria-labelledby="industry-source-title"><span>02 / SOURCE</span><h2 id="industry-source-title">AIHOT 在这里做什么</h2><p>AIHOT 是独立的外部资讯站。我们在维护周刊时用它发现候选，再回到原始来源核对事实；入选与判断由本站完成。</p><a href={aihotUrl} target="_blank" rel="noopener noreferrer">访问 aihot.news ↗</a></aside>
    </div>
  </div></Shell>;
}
