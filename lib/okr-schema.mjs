const text = value => typeof value === 'string' && value.trim().length > 0;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function ensure(ok, message) { if (!ok) throw new Error('Invalid OKR: ' + message); }
function fields(value, allowed) { ensure(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key)), 'unknown fields'); }
export function validateOkr(store, { allowImage = () => true } = {}) {
  fields(store, ['version', 'period', 'owner', 'recordedAt', 'principle', 'source', 'objectives', 'materials']);
  ensure(store.version === 1 && ['period', 'owner', 'principle', 'source'].every(key => text(store[key])) && day(store.recordedAt), 'period metadata');
  ensure(Array.isArray(store.objectives) && Array.isArray(store.materials), 'objectives and materials required');
  const ids = new Set(), materials = new Set(); let weight = 0;
  for (const objective of store.objectives) {
    fields(objective, ['id', 'title', 'description', 'weight', 'keyResults']);
    ensure(/^O[1-9]\d*$/.test(objective.id) && !ids.has(objective.id) && text(objective.title) && text(objective.description), 'objective'); ids.add(objective.id);
    ensure(Number.isFinite(objective.weight) && objective.weight > 0 && objective.weight <= 100, 'weight'); weight += objective.weight;
    ensure(Array.isArray(objective.keyResults) && objective.keyResults.length > 0, 'key results required');
    for (const kr of objective.keyResults) {
      fields(kr, ['id', 'title', 'description', 'openQuestions']);
      ensure(new RegExp(`^${objective.id}-KR[1-9]\\d*$`).test(kr.id) && !ids.has(kr.id) && text(kr.title) && text(kr.description), 'unique parent-scoped key result'); ids.add(kr.id);
      ensure(kr.openQuestions === undefined || (Array.isArray(kr.openQuestions) && kr.openQuestions.every(text)), 'open questions');
    }
  }
  ensure(Math.abs(weight - (store.objectives.length ? 100 : 0)) < 0.001, 'investment weights must total 100');
  for (const material of store.materials) {
    fields(material, ['id', 'month', 'recordedAt', 'keyResultId', 'title', 'summary', 'source', 'evidenceNote', 'images']);
    ensure(/^[a-z0-9-]+$/.test(material.id) && !materials.has(material.id), 'unique material ID'); materials.add(material.id);
    ensure(/^\d{4}-(0[1-9]|1[0-2])$/.test(material.month) && day(material.recordedAt), 'report month and recorded date');
    ensure(ids.has(material.keyResultId) && material.keyResultId.includes('-KR'), 'material must reference an existing KR');
    ensure(['title', 'summary', 'source', 'evidenceNote'].every(key => text(material[key])) && Array.isArray(material.images) && material.images.length > 0, 'material content and evidence images');
    for (const image of material.images) {
      fields(image, ['url', 'alt', 'sha256', 'width', 'height']);
      const url = new URL(image.url);
      ensure(url.protocol === 'https:' && !url.username && !url.password && allowImage(url), 'verified image URL');
      ensure(text(image.alt) && /^[a-f0-9]{64}$/.test(image.sha256), 'image description and digest');
      ensure(Number.isInteger(image.width) && image.width > 0 && Number.isInteger(image.height) && image.height > 0, 'image dimensions');
    }
  }
  return store;
}
