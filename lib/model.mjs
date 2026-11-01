import {validateTracking} from './favorite-tracking.mjs';
const kinds = ['experience', 'project', 'judgment', 'change', 'thought'];
const idPattern = /^[a-f0-9]{16}$/;
function check(ok, message) { if (!ok) throw new Error(message); }
function nonempty(value) { return typeof value === 'string' && value.trim().length > 0; }
function strings(value) { return Array.isArray(value) && value.every(nonempty); }
function date(value, partial = false) {
  if (typeof value !== 'string' || !(partial ? /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/ : /^\d{4}-\d{2}-\d{2}$/).test(value)) return false;
  const full = value.length === 4 ? value + '-01-01' : value.length === 7 ? value + '-01' : value;
  return !Number.isNaN(Date.parse(full)) && new Date(full).toISOString().slice(0, 10) === full;
}
export function assertPublicText(text) {
  check(!/(?:alibaba-inc\.com|atatech\.org|cdn\.fliggy\.com|\/(?:Users|home)\/[^\s"'<>]+|[A-Z]:\\Users\\|(?:sk|ghp|gho)[_-][A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9_.-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(text), 'Public content contains an internal locator, local path, or credential');
  const outsideUrls = text.replace(/https?:\/\/[^\s"'<>]+/g, '');
  check(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(outsideUrls), 'Public content contains a raw session identifier');
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    const url = new URL(match[0]);
    check(!url.username && !url.password, 'Credential-bearing URL');
    check(!/^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname), 'Private network URL');
    check(![...url.searchParams.keys()].some(key => /^(?:token|access_token|api_key|secret|password)$/i.test(key)), 'Sensitive URL parameter');
  }
}
export function validateRecords(store, articleIds = new Set()) {
  check(store?.version === 2 && Array.isArray(store.records), 'Expected records version 2');
  const ids = new Map();
  const base = ['id','kind','title','text','context','date','recordedAt','visibility','articleId','projectId','relatedIds','sources'];
  const extras = { experience: ['period','start','end','ongoing'], project: ['label','role','tags','status','goal','outcomes'], judgment: ['basis','alternatives','outcome'], change: ['subjectId','before','after','reason'], thought: [] };
  for (const item of store.records) {
    check(item && idPattern.test(item.id) && !ids.has(item.id), 'Invalid or duplicate record ID');
    check(kinds.includes(item.kind), 'Invalid record kind');
    check(Object.keys(item).every(key => [...base, ...extras[item.kind]].includes(key)), 'Unknown record field');
    check(['title','text','context'].every(key => nonempty(item[key])), 'Record needs standalone text and context');
    check(item.visibility === 'shared', 'Public repository cannot store private records');
    check((item.date === null || date(item.date)) && date(item.recordedAt), 'Invalid record date');
    check(item.articleId === null || articleIds.has(item.articleId), 'Unknown article');
    check(item.projectId === null || idPattern.test(item.projectId), 'Invalid project ID');
    check(Array.isArray(item.relatedIds) && item.relatedIds.every(id => idPattern.test(id)), 'Invalid relations');
    check(Array.isArray(item.sources) && item.sources.length > 0, 'Record needs sources');
    for (const source of item.sources) {
      check(source && ['statement','archive','article'].includes(source.kind) && nonempty(source.label), 'Invalid source');
      check(Object.keys(source).every(key => ['kind','label','articleId'].includes(key)), 'Unknown source field');
      check(source.kind === 'article' ? articleIds.has(source.articleId) : source.articleId === undefined, 'Invalid article source');
    }
    if (item.kind === 'experience') {
      check(nonempty(item.period) && typeof item.ongoing === 'boolean', 'Experience needs original period');
      check([item.start,item.end].every(d => d === null || date(d, true)), 'Invalid partial date');
      check(!item.ongoing || item.end === null, 'Ongoing experience cannot have an end date');
      check(item.start === null || item.end === null || item.start <= item.end || item.start.startsWith(item.end), 'Reversed experience dates');
    }
    if (item.kind === 'project') check(['label','role','goal'].every(key => nonempty(item[key])) && strings(item.tags) && strings(item.outcomes) && ['ongoing','completed','paused','unknown'].includes(item.status), 'Invalid project');
    if (item.kind === 'judgment') check(nonempty(item.basis) && strings(item.alternatives) && (item.outcome === null || nonempty(item.outcome)), 'Invalid judgment');
    if (item.kind === 'change') check(['subjectId','before','after','reason'].every(key => nonempty(item[key])) && item.before !== item.after, 'Invalid change');
    assertPublicText(JSON.stringify(item));
    ids.set(item.id, item);
  }
  for (const item of store.records) {
    for (const id of [...item.relatedIds, ...(item.projectId ? [item.projectId] : []), ...(item.kind === 'change' ? [item.subjectId] : [])]) check(id !== item.id && ids.has(id), 'Dangling or self relation');
    check(!item.projectId || ids.get(item.projectId).kind === 'project', 'Project relation must point to a project');
  }
  return [...store.records].sort((a,b) => (b.date || b.start || '').localeCompare(a.date || a.start || '') || b.recordedAt.localeCompare(a.recordedAt));
}
export function canonicalUrl(value) {
  const url = new URL(value);
  check(['https:','http:'].includes(url.protocol) && !url.username && !url.password, 'Invalid resource URL');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}
export function validateFavorites(store) {
  check(store?.version === 1 && Array.isArray(store.favorites), 'Expected favorites version 1');
  const ids = new Set(), urls = new Set();
  for (const item of store.favorites) {
    check(item && idPattern.test(item.id) && !ids.has(item.id), 'Invalid or duplicate favorite ID'); ids.add(item.id);
    check(Object.keys(item).every(key => ['id','kind','title','url','summary','reason','tags','savedAt','selection','visibility','sources','card','priority','adoption','usages'].includes(key)), 'Unknown favorite field');
    check(['project','knowledge','card'].includes(item.kind) && ['explicit','discovered'].includes(item.selection), 'Invalid favorite classification');
    check(['title','summary','reason'].every(key => nonempty(item[key])) && strings(item.tags) && date(item.savedAt), 'Invalid favorite fields');
    check(item.visibility === 'shared', 'Public repository cannot store private favorites');
    check(Array.isArray(item.sources) && item.sources.length > 0 && item.sources.every(source => nonempty(source.label) && Object.keys(source).every(key => key === 'label')), 'Favorite needs sources');
    if (item.kind === 'card') {
      const card = item.card;
      check(item.url === null && card && (card.date === null || date(card.date)) && date(card.recordedAt) && ['context','understanding','example','distinction'].every(key => nonempty(card[key])), 'Invalid knowledge card');
      check(Object.keys(card).every(key => ['date','recordedAt','context','understanding','example','distinction'].includes(key)), 'Unknown card field');
    } else {
      check(item.card === undefined, 'Resource cannot carry a knowledge card');
      const url = canonicalUrl(item.url); check(!urls.has(url), 'Duplicate favorite URL'); urls.add(url);
    }
    validateTracking(item);
    assertPublicText(JSON.stringify(item));
  }
  return [...store.favorites].sort((a,b) => b.savedAt.localeCompare(a.savedAt));
}
