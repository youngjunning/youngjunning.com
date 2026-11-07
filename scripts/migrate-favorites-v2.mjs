import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// The caller supplies reviewed decisions by stable identity; no keyword classifier
// decides authorship, personal adoption or the final content type.
export function migrateFavoritesV2(store, decisions) {
  if (store?.version !== 1 || !Array.isArray(store.favorites)) throw new Error('Migration requires a v1 source');
  const byId = new Map(decisions.map(item => [item.id, item]));
  if (byId.size !== store.favorites.length) throw new Error('Every source identity requires one reviewed decision');
  const favorites = store.favorites.map(old => {
    const decision = byId.get(old.id);
    if (!decision?.reason || !decision.subjects?.length || !decision.attribution || !decision.type) throw new Error('Missing reviewed migration decision');
    const { kind, card, priority: _priority, adoption: _adoption, usages, ...common } = old;
    const item = { ...common, kind: kind === 'card' ? 'note' : 'resource', type: decision.type, subjects: decision.subjects, attribution: decision.attribution };
    if (card) item.note = { body: card.understanding, context: card.context, example: card.example, boundary: card.distinction, date: card.date, recordedAt: card.recordedAt };
    if (usages?.length) item.usages = usages;
    return item;
  });
  return { version: 2, favorites };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const archive = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify(migrateFavoritesV2(archive.source, archive.decisions), null, 2));
}
