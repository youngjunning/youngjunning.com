import { createHash } from 'node:crypto';
import { containsCredential } from './source-credentials.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const accepted = new Set(['accepted', 'accepted-with-narrowing']);
const sensitive = value => typeof value === 'string' ? containsCredential(value) : value && typeof value === 'object' ? Object.values(value).some(sensitive) : false;
export const engineeringDigest = claim => hash([claim.id, claim.kind, claim.title, claim.text, claim.projectIds, claim.articleIds, claim.tags, claim.evidence]);
export const personalInferenceFromEngineering = text => /(?:我(?:们)?|你|本人|紫升|俊宁|作者|设计者|主导者).{0,35}(?:认为|偏好|主张|坚持|看重|更重视|理念|动机|决定|选择|判断框架|改变了判断|主导|负责|开发了|设计了|实现了|完成了|发布了|采用了)|(?:我的|你的|本人的|紫升的|俊宁的).{0,12}(?:判断|偏好|动机|理念|取舍)/s.test(text);

export function projectEngineering(store, scope, records, documents, { visibility, matchLeadProject, repositoryIdentity, allowedRepository }) {
  if (store?.version !== 1 || store.visibility !== visibility || !Array.isArray(store.claims)) throw new Error('Invalid engineering store');
  const recordMap = new Map(records.filter(record => record.visibility === 'shared').map(record => [record.id, record]));
  const documentMap = new Map(documents.map(document => [document.id, document]));
  const entries = new Map(), relationships = [], pages = [], seen = new Set();
  for (const claim of store.claims) {
    if (seen.has(claim.id)) throw new Error('Duplicate engineering claim');
    seen.add(claim.id);
    if (!accepted.has(claim.review?.decision)) continue;
    if (!/^[a-f0-9]{16}$/.test(claim.id) || !['documentation-claim', 'manifest-declaration', 'source-observation', 'documentation-inconsistency'].includes(claim.kind) || typeof claim.title !== 'string' || typeof claim.text !== 'string' || claim.personalJudgment !== false || personalInferenceFromEngineering(claim.text) || claim.review.contentSha256 !== engineeringDigest(claim) || !Array.isArray(claim.evidence) || !claim.evidence.length || claim.evidence.length > 8 || sensitive(claim)) throw new Error('Engineering review or provenance is invalid');
    // Scope withdrawal removes the derivation, without destroying its archive.
    if (claim.evidence.some(ref => { try { matchLeadProject(scope, ref.repositoryUrl); return false; } catch { return true; } })) continue;
    const linkedRecords = claim.projectIds.map(id => recordMap.get(id)).filter(record => record?.kind === 'project');
    const linkedDocuments = claim.articleIds.map(id => documentMap.get(id)).filter(Boolean);
    if (linkedRecords.length !== claim.projectIds.length || linkedDocuments.length !== claim.articleIds.length) continue;
    const evidence = claim.evidence.map(ref => {
      const repository = new URL(ref.repositoryUrl);
      if (!allowedRepository(repository) || repository.username || repository.password) throw new Error('Invalid engineering repository');
      repositoryIdentity(ref.repositoryUrl);
      if (!/^[a-f0-9]{40,64}$/.test(ref.commit) || !/^[a-f0-9]{64}$/.test(ref.sha256) || typeof ref.file !== 'string' || !ref.file || ref.file.startsWith('/') || ref.file.split('/').some(part => !part || part === '..' || part === '.') || /[\x00-\x1f\x7f]/.test(ref.file) || typeof ref.quote !== 'string' || ref.quote.length < 20 || ref.quote.length > 1200 || !Number.isInteger(ref.lineStart) || ref.lineStart < 1 || ref.lineEnd !== ref.lineStart + ref.quote.split('\n').length - 1) throw new Error('Invalid reviewed engineering excerpt');
      const encodedPath = ref.file.split('/').map(encodeURIComponent).join('/');
      const url = `${ref.repositoryUrl}/blob/${ref.commit}/${encodedPath}`;
      const id = `code-${hash(repositoryIdentity(ref.repositoryUrl)).slice(0,16)}-${hash([ref.file, ref.commit, ref.quote]).slice(0,20)}`;
      const tags = [...new Set([...claim.tags, ...linkedRecords.flatMap(record => record.tags)])];
      entries.set(id, { id, kind: 'code', title: repositoryIdentity(ref.repositoryUrl).slice(1) + ' · ' + ref.file, url, rawUrl: `${ref.repositoryUrl}/raw/${ref.commit}/${encodedPath}`, date: null, text: ref.quote, excerpt: ref.quote, sha256: ref.sha256, lineStart: ref.lineStart, lineEnd: ref.lineEnd, searchTitle: `${repositoryIdentity(ref.repositoryUrl).slice(1)} ${ref.file} ${claim.title}`, tags, relatedIds: linkedRecords.map(record => 'record-' + record.id), commit: ref.commit, engineeringKind: claim.kind, reviewedEngineering: true, personalJudgment: false });
      for (const record of linkedRecords) relationships.push({ from: url, to: '/records/' + record.id, type: 'engineering-project-navigation' });
      for (const document of linkedDocuments) relationships.push({ from: url, to: document.url, type: 'engineering-article-navigation' });
      return { sourceId: id, sha256: ref.sha256, quote: ref.quote };
    });
    pages.push({ id: 'engineering-' + claim.id, key: claim.review.contentSha256, title: claim.title, type: 'engineering', coverage: { totalSources: new Set(evidence.map(ref => entries.get(ref.sourceId).url)).size, sampledSources: new Set(evidence.map(ref => entries.get(ref.sourceId).url)).size, totalEntries: evidence.length, sampledEntries: evidence.length, complete: false }, paragraphs: [{ id: claim.id, kind: new Set(evidence.map(ref => entries.get(ref.sourceId).url)).size > 1 ? 'comparison' : 'synthesis', text: claim.text, attribution: 'model-synthesis', evidence }] });
  }
  return { entries: [...entries.values()], relationships: [...new Map(relationships.map(edge => [JSON.stringify(edge), edge])).values()], pages };
}
