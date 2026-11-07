import { topicIds } from './topics.mjs';

/** @param {Record<string, string | string[] | undefined>} params */
export function articleFilters(params) {
  const topic = typeof params.topic === 'string' && topicIds.includes(params.topic) ? params.topic : 'all';
  /** @type {'created' | 'updated'} */
  const sort = params.sort === 'created' ? 'created' : 'updated';
  return { topic, query: typeof params.q === 'string' ? params.q.slice(0, 500) : '', tag: typeof params.tag === 'string' ? params.tag.trim().slice(0, 100) : '', sort };
}

/** @param {{ topic?: string; query?: string; tag?: string; sort?: string }} filters */
export function articleHref({ topic = 'all', query = '', tag = '', sort = 'updated' } = {}) {
  const params = new URLSearchParams();
  if (topic !== 'all') params.set('topic', topic);
  if (tag) params.set('tag', tag);
  if (query) params.set('q', query);
  if (sort === 'created') params.set('sort', sort);
  return '/blog' + (params.size ? '?' + params.toString() : '');
}

/** @param {Array<{ tags: string[] }>} documents */
export function articleTagCounts(documents) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const doc of documents) for (const tag of new Set(doc.tags.filter(Boolean))) counts.set(tag, (counts.get(tag) || 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}
