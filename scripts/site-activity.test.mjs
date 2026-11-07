import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSiteActivity, siteWeek, activityHighlights } from '../lib/site-activity.mjs';
import { siteProfile } from '../lib/site-profile.mjs';

test('site week follows Shanghai Monday boundaries', () => {
  assert.deepEqual(siteWeek(new Date('2026-11-01T16:30:00Z')), { start: '2026-11-02', end: '2026-11-08', today: '2026-11-02' });
});
test('this week uses real write/save dates and keeps each content class visible', () => {
  const article = { id: 'a', title: '旧文章新修订', summary: '摘要', url: '/docs/a', date: '2025-01-01', updatedAt: '2026-11-03', tags: [] };
  const activity = buildSiteActivity({ documents: [article, { ...article, id: 'unknown', date: null, updatedAt: null }, { ...article, id: 'future', updatedAt: '2026-11-08' }], records: [{ id: 'r', title: '历史经历', text: '正文', date: '2026-11-07', recordedAt: '2025-01-01' }, { id: 'r2', title: '录入历史经历', text: '正文', date: '2017-01-01', recordedAt: '2026-11-05' }], favorites: [{ id: 'f', title: '方法', summary: '方法摘要', savedAt: '2026-11-04' }], research: [{ id: 'q', title: '问题', question: '问题正文', updatedAt: '2026-11-06' }], excerpts: [{ id: 'e', title: '摘录', context: '上下文', savedAt: '2026-11-02' }] }, new Date('2026-11-07T10:00:00Z'));
  assert.deepEqual(activity.counts, { article: 1, favorite: 1, record: 1, research: 1, excerpt: 1 });
  assert.ok(activity.entries.some(item => item.id === 'record:r2' && item.timeLabel === '记录录入'));
  assert.equal(activity.entries.find(item => item.id === 'article:a').timeLabel, '文章修订');
  assert.equal(new Set(activityHighlights(activity).map(item => item.kind)).size, 5);
});
test('weekly issue uses the real series tag and never selects a future issue', () => {
  const base = { summary: '周刊', updatedAt: null, tags: [siteProfile.weeklyTags[0]] };
  const result = buildSiteActivity({ documents: [{ ...base, id: '1', title: '第一期', date: '2026-11-07', url: '/docs/1' }, { ...base, id: '2', title: '第二期', date: '2026-11-14', url: '/docs/2' }, { ...base, id: '3', title: '普通文章', tags: [], date: '2026-11-07', url: '/docs/3' }] }, new Date('2026-11-07T10:00:00Z'));
  assert.equal(result.weekly.id, '1');
});
