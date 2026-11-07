import { validContentTime } from './content-time.mjs';
import { siteProfile } from './site-profile.mjs';

/** @param {Date} now */
export function siteWeek(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const date = new Date(today + 'T00:00:00Z');
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  return { start, end: date.toISOString().slice(0, 10), today };
}

/**
 * Combine actual publication/save/recording/update dates; never event dates.
 * @param {{ documents?: import('./types').Document[], records?: import('./record-types').PersonalRecord[], favorites?: import('./favorite-types').Favorite[], research?: import('./curation-types').ResearchItem[], excerpts?: import('./curation-types').ExcerptItem[] }} input
 * @param {Date} now
 * @returns {{start:string,end:string,today:string,entries:{id:string,kind:string,label:string,title:string,summary:string,time:string,timeLabel:string,href:string}[],weekly:import('./types').Document|null,counts:Record<string,number>}}
 */
export function buildSiteActivity({ documents = [], records = [], favorites = [], research = [], excerpts = [] }, now = new Date()) {
  const week = siteWeek(now);
  const candidates = [
    ...documents.map(item => ({ id: 'article:' + item.id, kind: 'article', label: '手记', title: item.title, summary: item.summary, time: item.updatedAt || item.date, timeLabel: item.updatedAt ? '文章修订' : '文章发布', href: item.url })),
    ...favorites.map(item => ({ id: 'favorite:' + item.id, kind: 'favorite', label: '百宝箱', title: item.title, summary: item.summary, time: item.updatedAt || item.savedAt, timeLabel: item.updatedAt ? '条目更新' : '收藏入库', href: '/favorites#' + item.id })),
    ...records.map(item => ({ id: 'record:' + item.id, kind: 'record', label: '个人记录', title: item.title, summary: item.text, time: item.recordedAt, timeLabel: '记录录入', href: '/records/' + item.id })),
    ...research.map(item => ({ id: 'research:' + item.id, kind: 'research', label: '探索清单', title: item.title, summary: item.question, time: item.updatedAt, timeLabel: '探索更新', href: '/research#' + item.id })),
    ...excerpts.map(item => ({ id: 'excerpt:' + item.id, kind: 'excerpt', label: '对话摘录', title: item.title, summary: item.context, time: item.savedAt, timeLabel: '摘录保存', href: '/excerpts#' + item.id })),
  ];
  const entries = candidates.filter(item => validContentTime(item.time) && item.time.slice(0, 10) >= week.start && item.time.slice(0, 10) <= week.today)
    .sort((a, b) => b.time.localeCompare(a.time) || a.id.localeCompare(b.id));
  const weekly = documents.filter(item => item.tags?.some(tag => siteProfile.weeklyTags.includes(tag)) && validContentTime(item.date) && item.date.slice(0, 10) <= week.today)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  return { ...week, entries, weekly, counts: Object.fromEntries(['article', 'favorite', 'record', 'research', 'excerpt'].map(kind => [kind, entries.filter(item => item.kind === kind).length])) };
}

/** @param {{entries:{id:string,kind:string,label:string,title:string,summary:string,time:string,timeLabel:string,href:string}[]}} activity */
export function activityHighlights(activity) {
  return ['article', 'favorite', 'record', 'research', 'excerpt'].flatMap(kind => activity.entries.filter(item => item.kind === kind).slice(0, 2));
}
