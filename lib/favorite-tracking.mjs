import { subjectLabel } from './content-subjects.mjs';

export const adoptionLabels = { trial: '试用中', adopted: '已选用', retired: '已停用' };
export function validateTracking(item) {
  if (!Array.isArray(item.usages ?? [])) throw new Error('Invalid usages');
  for (const usage of item.usages ?? []) {
    if (!usage || Object.keys(usage).some(key => !['project','projectUrl','stage','purpose','evidence'].includes(key))
      || !Object.hasOwn(adoptionLabels, usage.stage) || ['project','purpose','evidence'].some(key => typeof usage[key] !== 'string' || !usage[key].trim())) throw new Error('Usage needs project, stage, purpose and evidence');
    const url = new URL(usage.projectUrl);
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid project URL');
  }
}

export function favoriteGraph(favorites, documents = []) {
  const nodes = [], edges = [], seen = new Set(), identities = new Set(favorites.map(item => item.id));
  const add = node => { if (!seen.has(node.id)) { nodes.push(node); seen.add(node.id); } };
  for (const favorite of favorites) {
    const id = 'favorite:' + favorite.id;
    add({ id, label: favorite.title, type: 'favorite', url: '/favorites#' + favorite.id });
    for (const subject of favorite.subjects || []) {
      const target = 'subject:' + subject;
      add({ id: target, label: subjectLabel(subject), type: 'topic' });
      edges.push({ source: id, target, type: 'tagged', evidence: '已审阅的关注主题，不表示采用或因果' });
    }
    for (const tag of favorite.tags) {
      const target = 'tag:' + tag;
      add({ id: target, label: tag, type: 'tag' });
      edges.push({ source: id, target, type: 'tagged', evidence: '收藏标签，不表示使用关系' });
    }
    for (const usage of favorite.usages ?? []) {
      const target = 'project:' + usage.projectUrl;
      add({ id: target, label: usage.project, type: 'project', url: usage.projectUrl });
      edges.push({ source: target, target: id, type: 'uses', stage: usage.stage, evidence: usage.evidence, purpose: usage.purpose });
    }
    for (const related of favorite.relatedIds || []) if (identities.has(related)) edges.push({ source: id, target: 'favorite:' + related, type: 'related', evidence: '内容中显式维护的资料或笔记关联，不表示因果' });
  }
  for (const doc of documents) for (const tag of new Set(doc.tags)) {
    const target = 'tag:' + tag;
    if (seen.has(target)) edges.push({ source: doc.id, target, type: 'tagged', sourcePath: doc.sourcePath, evidence: `文章元数据标签：${tag}；与百宝箱同标签，不表示使用关系` });
  }
  return { nodes, edges };
}

