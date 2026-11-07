import { validateTracking } from './favorite-tracking.mjs';
import { validContentTime } from './content-time.mjs';
import { contentSubjects } from './content-subjects.mjs';

export function canonicalFavoriteUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Favorite URL must be HTTP(S) without credentials');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}
const text = value => typeof value === 'string' && value.trim().length > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && validContentTime(value);
const ids = values => Array.isArray(values) && values.every(value => typeof value === 'string' && /^[a-f0-9]{16}$/.test(value)) && new Set(values).size === values.length;

export function prepareFavorites(store) {
  if (!store || store.version !== 2 || !Array.isArray(store.favorites)) throw new Error('Invalid favorite store: version 2 required');
  const identities = new Map(), urls = new Set();
  const subjectIds = new Set(contentSubjects.map(subject => subject.id));
  const favorites = store.favorites.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid favorite');
    const allowed = ['id','kind','type','title','url','summary','reason','tags','subjects','attribution','savedAt','updatedAt','selection','visibility','sources','note','usages','relatedIds'];
    if (Object.keys(item).some(key => !allowed.includes(key))) throw new Error('Unknown favorite field');
    for (const key of ['id','title','summary','reason','savedAt']) if (!text(item[key])) throw new Error('Missing favorite ' + key);
    if (!/^[a-f0-9]{16}$/.test(item.id) || identities.has(item.id)) throw new Error('Invalid or duplicate favorite id');
    identities.set(item.id, item);
    if (!['resource','note'].includes(item.kind) || !(item.kind === 'resource' ? ['tool','reference'] : ['concept','method']).includes(item.type)) throw new Error('Invalid favorite classification');
    if (!['user','source','ai','mixed'].includes(item.attribution)) throw new Error('Invalid favorite attribution');
    if (!['explicit','discovered'].includes(item.selection) || !['shared','private'].includes(item.visibility)) throw new Error('Invalid favorite provenance');
    if (!validContentTime(item.savedAt) || item.updatedAt !== undefined && !validContentTime(item.updatedAt)) throw new Error('Invalid favorite save time');
    if (!Array.isArray(item.tags) || item.tags.some(tag => !text(tag))) throw new Error('Invalid favorite tags');
    if (!Array.isArray(item.subjects) || !item.subjects.length || item.subjects.some(subject => !subjectIds.has(subject)) || new Set(item.subjects).size !== item.subjects.length) throw new Error('Invalid favorite subjects');
    if (!Array.isArray(item.sources) || !item.sources.length || item.sources.some(source => !source || Object.keys(source).some(key => !['label','url'].includes(key)) || !text(source.label))) throw new Error('Favorite source required');
    for (const source of item.sources) if (source.url != null) canonicalFavoriteUrl(source.url);
    if (item.url !== null) canonicalFavoriteUrl(item.url);
    if (item.kind === 'resource') {
      if (!text(item.url) || item.note !== undefined) throw new Error('Resource URL required');
      const canonical = canonicalFavoriteUrl(item.url);
      if (urls.has(canonical)) throw new Error('Duplicate favorite URL');
      urls.add(canonical);
    } else {
      const note = item.note;
      if (!note || !text(note.body) || !Object.hasOwn(note, 'date') || !date(note.recordedAt) || note.date !== null && !date(note.date)) throw new Error('Knowledge note needs body and original dates');
      if (Object.keys(note).some(key => !['body','context','example','boundary','date','recordedAt'].includes(key)) || ['context','example','boundary'].some(key => note[key] !== undefined && !text(note[key]))) throw new Error('Invalid knowledge note field');
      if (item.usages?.length) throw new Error('Project use belongs to resources');
    }
    if (item.relatedIds !== undefined && !ids(item.relatedIds)) throw new Error('Invalid favorite relations');
    validateTracking(item);
    return { ...item, tags: [...new Set(item.tags)] };
  });
  for (const item of favorites) for (const id of item.relatedIds || []) {
    const related = identities.get(id);
    if (id === item.id || !related) throw new Error('Missing or self favorite relation');
    if (item.visibility === 'shared' && related.visibility !== 'shared') throw new Error('Shared favorite cannot link private favorite');
  }
  return { version: 2, favorites: favorites.filter(item => item.visibility === 'shared').sort((a,b) => b.savedAt.localeCompare(a.savedAt)) };
}
