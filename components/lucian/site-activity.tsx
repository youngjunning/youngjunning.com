import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import ResourceCards from './resource-cards';
import { displayContentTime } from '@/lib/content-time.mjs';
import { activityHighlights } from '@/lib/site-activity.mjs';
import './site-activity.css';

export type SiteActivityEntry = { id: string; kind: string; label: string; title: string; summary: string; time: string; timeLabel: string; href: string };
export type SiteActivityData = { start: string; end: string; today: string; entries: SiteActivityEntry[]; counts: Record<string, number>; weekly: { title: string; summary: string; url: string } | null };
export default function SiteActivity({ activity }: { activity: SiteActivityData }) {
  const highlights = activityHighlights(activity);
  return <div className="site-activity"><p className="site-activity-period">{activity.start} — {activity.today} · 文章 {activity.counts.article} · 百宝箱 {activity.counts.favorite} · 记录 {activity.counts.record}</p>{activity.weekly && <div className="site-weekly-issue"><ResourceCards ariaLabel={`最新一期${siteProfile.siteName}周刊`} areas={[{ id: 'latest-weekly', title: activity.weekly.title, description: activity.weekly.summary, status: `最新一期 / ${siteProfile.siteName}周刊`, details: [], href: activity.weekly.url, linkLabel: '打开本期' }]} /></div>}{highlights.length ? <ResourceCards ariaLabel="本周整站更新" areas={highlights.map((item: SiteActivityEntry) => ({ id: 'activity-' + item.id, title: item.title, description: item.summary.slice(0, 200), status: `${item.label} · ${item.timeLabel} ${displayContentTime(item.time)}`, details: [], href: item.href, linkLabel: '阅读内容' }))} /> : <p>本周还没有新入库或修订的内容。可以从手记、个人记录和百宝箱继续翻阅。</p>}<Link className="text-link" href="/topics">沿关注主题继续读 ↗</Link></div>;
}
