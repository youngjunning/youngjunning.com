import {validateTracking} from './favorite-tracking.mjs';
// Favorites are resources to revisit, not evidence of personal experience.
export function canonicalFavoriteUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Favorite URL must be HTTP(S) without credentials');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}
export function prepareFavorites(store) {
  if (!store || store.version !== 1 || !Array.isArray(store.favorites)) throw new Error('Invalid favorite store');
  const ids = new Set(), urls = new Set();
  const favorites = store.favorites.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid favorite');
    const allowed = ['id','kind','title','url','summary','reason','tags','savedAt','selection','visibility','sources','card','priority','adoption','usages'];
    if (Object.keys(item).some((key) => !allowed.includes(key))) throw new Error('Unknown favorite field');
    for (const key of ['id','title','summary','reason','savedAt']) if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error('Missing favorite ' + key);
    if (!/^[a-f0-9]{16}$/.test(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate favorite id');
    ids.add(item.id);
    if (item.kind === 'card') {
      const fields = ['date','recordedAt','context','understanding','example','distinction'];
      if (item.url !== null || !item.card || Object.keys(item.card).length !== fields.length || fields.some(key => !Object.hasOwn(item.card, key))) throw new Error('Invalid knowledge card');
      for (const key of fields.filter(key => key !== 'date')) if (typeof item.card[key] !== 'string' || !item.card[key].trim()) throw new Error('Missing card ' + key);
      for (const value of [item.card.date, item.card.recordedAt]) if (value !== null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error('Invalid card date');
    } else {
      if (item.card !== undefined || typeof item.url !== 'string') throw new Error('Resource URL required');
      const canonical = canonicalFavoriteUrl(item.url);
      if (urls.has(canonical)) throw new Error('Duplicate favorite URL');
      urls.add(canonical);
    }
    if (!['project','knowledge','card'].includes(item.kind) || !['explicit','discovered'].includes(item.selection) || !['shared','private'].includes(item.visibility)) throw new Error('Invalid favorite classification');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.savedAt) || Number.isNaN(Date.parse(item.savedAt)) || new Date(item.savedAt).toISOString().slice(0,10) !== item.savedAt) throw new Error('Invalid favorite date');
    if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) throw new Error('Invalid favorite tags');
    if (!Array.isArray(item.sources) || !item.sources.length || item.sources.some((source) => !source || Object.keys(source).some((key) => key !== 'label') || typeof source.label !== 'string' || !source.label.trim())) throw new Error('Favorite source required');
    validateTracking(item);
    return { ...item, tags: [...new Set(item.tags)] };
  });
  return { version: 1, favorites: favorites.filter((item) => item.visibility === 'shared').sort((a,b) => b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id)) };
}
