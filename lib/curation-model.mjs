const idPattern = /^[a-f0-9]{16}$/;

function check(ok, message) { if (!ok) throw new Error(message); }
function date(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function text(value) { return typeof value === 'string' && Boolean(value.trim()); }
function fields(item, allowed, label) {
  check(item && typeof item === 'object' && !Array.isArray(item), `Invalid ${label}`);
  check(Object.keys(item).every(key => allowed.includes(key)), `Unknown ${label} field`);
}
function identity(item, ids, label) {
  check(idPattern.test(item.id) && !ids.has(item.id), `Invalid or duplicate ${label} id`);
  ids.add(item.id);
}
function sources(value, label) {
  check(Array.isArray(value) && value.length > 0, `${label} source required`);
  for (const source of value) {
    fields(source, ['label', 'url'], `${label} source`);
    check(text(source.label), `${label} source label required`);
    if (source.url !== undefined && source.url !== null) {
      check(text(source.url), `Invalid ${label} source URL`);
      const url = new URL(source.url);
      check(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password, `Invalid ${label} source URL`);
    }
  }
}

export function prepareResearch(store, favoriteIds = new Set()) {
  check(store?.version === 1 && Array.isArray(store.items), 'Invalid research store');
  const ids = new Set();
  for (const item of store.items) {
    fields(item, ['id', 'title', 'question', 'context', 'reason', 'nextStep', 'nextStepSource', 'status', 'blocker', 'result', 'relatedFavoriteIds', 'createdAt', 'updatedAt', 'visibility', 'sources'], 'research item');
    identity(item, ids, 'research');
    for (const key of ['title', 'question', 'context', 'reason', 'nextStep']) check(text(item[key]), `Missing research ${key}`);
    check(['user', 'suggested'].includes(item.nextStepSource), 'Invalid research next step source');
    check(['todo', 'in_progress', 'paused', 'completed', 'dropped'].includes(item.status), 'Invalid research status');
    check(item.blocker === null || text(item.blocker), 'Invalid research blocker');
    check(item.result === null || text(item.result), 'Invalid research result');
    if (item.status === 'paused') check(text(item.blocker), 'Paused research needs a blocker');
    if (item.status === 'completed') check(text(item.result), 'Completed research needs a result');
    check(Array.isArray(item.relatedFavoriteIds) && new Set(item.relatedFavoriteIds).size === item.relatedFavoriteIds.length && item.relatedFavoriteIds.every(id => idPattern.test(id) && favoriteIds.has(id)), 'Invalid related favorite');
    check(date(item.createdAt) && date(item.updatedAt) && item.updatedAt >= item.createdAt, 'Invalid research dates');
    check(['shared', 'private'].includes(item.visibility), 'Invalid research visibility');
    sources(item.sources, 'Research');
  }
  return { version: 1, items: store.items.filter(item => item.visibility === 'shared').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)) };
}

export function prepareExcerpts(store) {
  check(store?.version === 1 && Array.isArray(store.items), 'Invalid excerpt store');
  const ids = new Set();
  for (const item of store.items) {
    fields(item, ['id', 'title', 'context', 'reason', 'selection', 'format', 'messages', 'source', 'date', 'savedAt', 'visibility'], 'excerpt');
    identity(item, ids, 'excerpt');
    for (const key of ['title', 'context', 'reason']) check(text(item[key]), `Missing excerpt ${key}`);
    check(['explicit', 'discovered'].includes(item.selection), 'Invalid excerpt selection');
    check(['verbatim', 'summary'].includes(item.format), 'Invalid excerpt format');
    check(Array.isArray(item.messages) && item.messages.length > 0 && item.messages.length <= 8, 'Excerpt needs 1–8 messages');
    for (const message of item.messages) {
      fields(message, ['role', 'text'], 'excerpt message');
      check(['user', 'assistant'].includes(message.role) && text(message.text) && message.text.length <= 1200, 'Invalid excerpt message');
    }
    sources([item.source], 'Excerpt');
    check(item.date === null || date(item.date), 'Invalid excerpt date');
    check(date(item.savedAt), 'Invalid excerpt savedAt');
    check(['shared', 'private'].includes(item.visibility), 'Invalid excerpt visibility');
  }
  return { version: 1, items: store.items.filter(item => item.visibility === 'shared').sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id)) };
}
