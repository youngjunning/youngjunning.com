import Link from 'next/link';
import { Suspense } from 'react';
import { getSiteTheme } from '@/lib/site-theme';
import { getCatalog } from '@/lib/content';
import { getIndustryFeed, type IndustryFeed } from '@/lib/industry-feed';
import { siteProfile } from '@/lib/site-profile.mjs';
import Shell from '@/components/shell';
import StatechartShell from '@/components/statechart/shell';
import IndustryTimeline from '@/components/lucian/industry-timeline';
import './industry.css';

export const metadata = { title: '行业动态' };
const description = '按自己关注的信源追踪动态，再把值得展开的变化写进本站周刊。';

function feedStatus(feed: IndustryFeed) {
  return feed.state === 'unconfigured' ? '自建资讯源尚未接入。接入后，你设置的关注信源会出现在这里。' : feed.state === 'unavailable' ? '资讯源暂时无法读取，请稍后再试。' : '最近 7 天暂无精选动态。可以在自建资讯源后台调整信源和精选规则。';
}

async function StatechartFeed() {
  const feed = await getIndustryFeed();
  return <>{feed.items.length ? <div className="industry-sc-feed">{feed.items.map(item => <article className="industry-sc-item" key={item.id}><small>{item.source} · {item.publishedAt?.slice(0, 10) || '时间未标注'}</small><h3><a href={item.itemUrl} target="_blank" rel="noopener noreferrer">{item.title} ↗</a></h3>{item.summary && <p>{item.summary}</p>}{item.originalUrl && <a href={item.originalUrl} target="_blank" rel="noopener noreferrer">原始来源 ↗</a>}</article>)}</div> : <p className="industry-empty">{feedStatus(feed)}</p>}{feed.homeUrl && <p className="industry-feed-home"><a href={feed.homeUrl} target="_blank" rel="noopener noreferrer">打开我的资讯源 ↗</a></p>}</>;
}

async function ClassicFeed() {
  const feed = await getIndustryFeed();
  return <>{feed.items.length ? <IndustryTimeline items={feed.items} /> : <p className="industry-empty">{feedStatus(feed)}</p>}{feed.homeUrl && <a className="industry-feed-home" href={feed.homeUrl} target="_blank" rel="noopener noreferrer">打开我的资讯源 ↗</a>}</>;
}

export default async function AIHOTPage() {
  const theme = await getSiteTheme();
  const weeklies = getCatalog().documents
    .filter((doc): doc is typeof doc & { date: string } => Boolean(doc.date && doc.tags?.some(tag => siteProfile.weeklyTags.includes(tag))))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  if (theme === 'statechart') return <StatechartShell active="/aihot" title="行业动态" subtitle={description}>
    <section className="sc-section industry-statechart"><header><span className="sc-kicker">YOUR SOURCES / LATEST</span><h2>我的关注</h2></header>
      <Suspense fallback={<p className="industry-empty" role="status">正在读取关注源…</p>}><StatechartFeed /></Suspense>
    </section>
    <section className="sc-section industry-statechart"><header><span className="sc-kicker">EDITORIAL / WEEKLY</span><h2>本站周刊</h2></header>{weeklies.length ? <div className="sc-notes-row">{weeklies.map(doc => <Link className="sc-note" href={doc.url} key={doc.id}><small>{doc.date.slice(0, 10)} · 已核对来源</small><h3>{doc.title}</h3><p>{doc.summary}</p><span>阅读本期 →</span></Link>)}</div> : <p>本站尚未发布行业周刊。<Link href="/blog">先浏览手记 →</Link></p>}</section>
    <section className="sc-section industry-statechart-source"><header><span className="sc-kicker">HOW IT WORKS</span><h2>资讯从哪里来</h2></header><p>本站动态读取你自己部署的资讯源；关注的信源和精选规则由你在该服务后台维护。周刊是本站另行核对原始来源后写成的文章。<a href="https://github.com/KKKKhazix/AIHOT" target="_blank" rel="noopener noreferrer">了解所用的开源引擎 ↗</a></p></section>
  </StatechartShell>;

  return <Shell active="industry"><div className="industry-page">
    <section className="page-intro"><div className="eyebrow">INDUSTRY / YOUR SOURCES</div><h1>行业动态</h1><p>{description}</p></section>
    <div className="industry-layout"><section className="industry-main"><div className="industry-section-heading"><span>01 / MY FEED</span><h2>我的关注</h2><p>由自建资讯源采集、归并和精选；点击条目可查看详情与原始来源。</p></div>
      <Suspense fallback={<p className="industry-empty" role="status">正在读取关注源…</p>}><ClassicFeed /></Suspense>
    </section><aside className="industry-side"><section className="industry-side-block"><span>02 / WEEKLY</span><h2>本站周刊</h2><p>基于原始来源写下变化、影响和判断。</p>{weeklies.length ? <div className="industry-weeklies">{weeklies.map(doc => <Link href={doc.url} key={doc.id}><small>{doc.date.slice(0, 10)}</small><strong>{doc.title}</strong><span>阅读本期 →</span></Link>)}</div> : <p className="industry-side-empty">尚未发布周刊。<Link href="/blog">浏览手记 →</Link></p>}</section>
      <section className="industry-side-block"><span>03 / SOURCE</span><h2>接入关系</h2><p>这里读取你自己部署的资讯源，关注规则由你维护。<a href="https://aihot.news" target="_blank" rel="noopener noreferrer">aihot.news</a> 是上游运营站，不是本站的数据入口。</p></section></aside></div>
  </div></Shell>;
}
