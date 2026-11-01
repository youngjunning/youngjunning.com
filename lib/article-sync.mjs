import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { loadArticles, validateArticleMetadata } from './article-model.mjs';
import { assertContentAudience } from './audience-policy.mjs';
import { embeddedArticleResources } from './article-resources.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function check(ok, message) { if (!ok) throw new Error('Article sync: ' + message); }
function inside(root, relative) {
  check(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative), 'relative resource path required');
  const base = fs.realpathSync(root), file = fs.realpathSync(path.resolve(base, relative));
  check(file.startsWith(base + path.sep) && fs.lstatSync(file).isFile(), 'resource outside source root');
  return file;
}
export function articleSyncPlan({ sourceRoot, targetRoot, ledger, audience }) {
  check(['public', 'company'].includes(audience), 'explicit audience required');
  check(fs.realpathSync(sourceRoot) !== fs.realpathSync(targetRoot), 'distinct repositories required');
  check(ledger?.version === 1 && Array.isArray(ledger.reviews), 'review ledger required');
  const source = loadArticles(sourceRoot, { includeDrafts: true }), target = loadArticles(targetRoot, { includeDrafts: true });
  const targetIds = new Map(target.map(post => [post.id, post])), reviewIds = new Set();
  for (const review of ledger.reviews) {
    const key = review.sourceId + ':' + review.audience;
    check(!reviewIds.has(key), 'duplicate review'); reviewIds.add(key);
  }
  const scopeIds = ledger.scopeIds ? new Set(ledger.scopeIds) : null;
  if (scopeIds) check(scopeIds.size === ledger.scopeIds.length && [...scopeIds].every(id => /^[a-f0-9]{16}$/.test(id)), 'unique stable scope IDs required');
  const plan = source.filter(post => !scopeIds || scopeIds.has(post.id)).map(post => {
    const review = ledger.reviews.find(item => item.sourceId === post.id && item.audience === audience);
    const sourceSha256 = hash(JSON.stringify(post));
    const result = { id: post.id, title: post.title, sourceSha256, state: 'review-required' };
    if (!review) return result;
    check(typeof review.reason === 'string' && review.reason.trim() && typeof review.reviewer === 'string' && review.reviewer.trim() && Number.isFinite(Date.parse(review.reviewedAt)), 'review provenance required');
    if (review.sourceSha256 !== sourceSha256) return { ...result, state: 'review-stale' };
    const resourcesMatch = (root, resources) => resources.every(resource => {
      try { return hash(fs.readFileSync(inside(root, resource.file))) === resource.sha256; } catch { return false; }
    });
    if (!resourcesMatch(sourceRoot, review.resources || [])) return { ...result, state: 'resource-review-stale' };
    if (review.decision === 'skipped') return { ...result, state: 'skipped', reason: review.reason };
    if (review.decision === 'equivalent') {
      const existing = targetIds.get(review.targetId);
      check(existing, 'reviewed equivalent target is missing');
      return { ...result, targetId: existing.id, state: existing.sha256 === review.targetSha256 && (existing.kind !== 'html' || existing.metadataSha256 === review.targetMetadataSha256) ? 'equivalent' : 'equivalent-stale', reason: review.reason };
    }
    check(['approved', 'redacted'].includes(review.decision), 'invalid review decision');
    if (post.draft === true) return { ...result, state: 'source-draft' };
    check(typeof review.targetText === 'string' && review.targetText.endsWith('\n') && hash(review.targetText) === review.targetSha256, 'reviewed target version required');
    assertContentAudience(review.targetText, audience);
    const kind = review.targetKind || 'markdown';
    check(['markdown', 'html'].includes(kind), 'invalid target kind');
    if (kind === 'html') {
      check(typeof review.targetMetadataText === 'string' && review.targetMetadataText.endsWith('\n') && hash(review.targetMetadataText) === review.targetMetadataSha256, 'reviewed HTML metadata required');
      assertContentAudience(review.targetMetadataText, audience);
    }
    const parsed = kind === 'html' ? { data: JSON.parse(review.targetMetadataText), content: review.targetText } : matter(review.targetText);
    validateArticleMetadata(parsed.data);
    const targetResources = review.targetResources || [];
    if (!resourcesMatch(targetRoot, targetResources)) return { ...result, state: 'target-resource-review-stale' };
    const resources = [parsed.data.cover, ...Object.values(parsed.data.assets || {}), ...embeddedArticleResources(parsed.content, kind)].filter(Boolean);
    check(resources.every(url => url.startsWith('data:') || targetResources.some(resource => resource.url === url)), 'every embedded target resource needs a reviewed local snapshot and URL binding: ' + post.id);
    check(parsed.data.id === post.id, 'stable source ID must be preserved');
    const filename = parsed.data.title + (kind === 'html' ? '.html' : '.md');
    check(!/[\/\\\x00-\x1f]/.test(filename) && filename.length <= 220, 'invalid target filename');
    const current = targetIds.get(post.id);
    if (current?.kind === kind && current.sha256 === review.targetSha256 && (kind !== 'html' || current.metadataSha256 === review.targetMetadataSha256)) return { ...result, state: 'synced', reason: review.reason };
    if (current && (current.sha256 !== review.previousTargetSha256 || (current.kind === 'html' && current.metadataSha256 !== review.previousTargetMetadataSha256))) return { ...result, state: 'target-conflict' };
    const destination = filename;
    const file = path.join(targetRoot, 'content/posts', destination);
    if ((!current || current.file !== destination) && fs.existsSync(file)) return { ...result, state: 'filename-conflict' };
    const metadataDestination = kind === 'html' ? filename.replace(/\.html$/, '.meta.json') : null;
    const previousMetadataDestination = current?.kind === 'html' ? current.file.replace(/\.html$/, '.meta.json') : null;
    if (metadataDestination && metadataDestination !== previousMetadataDestination && fs.existsSync(path.join(targetRoot, 'content/posts', metadataDestination))) return { ...result, state: 'filename-conflict' };
    return { ...result, state: 'ready', destination, previousDestination: current?.file || null, targetText: review.targetText, reason: review.reason, previousText: current ? fs.readFileSync(path.join(targetRoot, 'content/posts', current.file), 'utf8') : null, metadataDestination, previousMetadataDestination, targetMetadataText: kind === 'html' ? review.targetMetadataText : null, previousMetadataText: previousMetadataDestination ? fs.readFileSync(path.join(targetRoot, 'content/posts', previousMetadataDestination), 'utf8') : null };
  });
  if (scopeIds) for (const id of scopeIds) if (!source.some(post => post.id === id)) plan.push({ id, state: 'source-withdrawn' });
  return plan;
}
export function articleSyncPatch(plan, targetRoot) {
  // This is a preview only. The owning agent applies reviewed text through its
  // normal patch tool; the planner never writes into either content repository.
  const lines = ['*** Begin Patch'];
  const sourceLines = value => (value.endsWith('\n') ? value.slice(0, -1) : value).split('\n');
  const write = (name, text, previous) => {
    lines.push((previous === null ? '*** Add File: ' : '*** Update File: ') + path.join(targetRoot, 'content/posts', name));
    if (previous !== null) { lines.push('@@'); lines.push(...sourceLines(previous).map(line => '-' + line)); }
    lines.push(...sourceLines(text).map(line => '+' + line));
  };
  for (const item of plan.filter(item => item.state === 'ready')) {
    if (item.previousDestination && item.previousDestination !== item.destination) {
      lines.push('*** Delete File: ' + path.join(targetRoot, 'content/posts', item.previousDestination));
    }
    if (item.previousMetadataDestination && item.previousMetadataDestination !== item.metadataDestination) lines.push('*** Delete File: ' + path.join(targetRoot, 'content/posts', item.previousMetadataDestination));
    write(item.destination, item.targetText, item.previousDestination === item.destination ? item.previousText : null);
    if (item.metadataDestination) write(item.metadataDestination, item.targetMetadataText, item.previousMetadataDestination === item.metadataDestination ? item.previousMetadataText : null);
  }
  lines.push('*** End Patch'); return lines.join('\n') + '\n';
}
