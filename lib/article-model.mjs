import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { topicIds } from './topics.mjs';

const id = value => typeof value === 'string' && /^[a-f0-9]{16}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const check = (ok, message) => { if (!ok) throw new Error('Article: ' + message); };
export function validateArticleMetadata(data) {
  check(id(data.id) && text(data.title) && (text(data.description) || (data.draft === true && typeof data.description === 'string')), 'stable ID, title and description required');
  check(data.date === null || day(data.date), 'real quoted date or null required');
  check(topicIds.includes(data.topic) && Array.isArray(data.tags) && data.tags.every(text), 'topic and tags required');
  check(data.collection === undefined || ['docs', 'ata'].includes(data.collection), 'invalid collection');
  check(data.draft === undefined || typeof data.draft === 'boolean', 'invalid draft');
  if (data.publication !== undefined) {
    const p = data.publication;
    check(p && ['unknown', 'draft', 'ready', 'published'].includes(p.status), 'invalid publication');
    check(p.publishedAt === undefined || p.publishedAt === null || day(p.publishedAt), 'invalid publication date');
    if (p.status === 'published') {
      const url = new URL(p.url);
      check(url.protocol === 'https:' && !url.username && !url.password, 'published status requires a real HTTPS source');
    }
  }
  return data;
}

export function loadArticles(root, { validate = () => {}, includeDrafts = false } = {}) {
  const directory = path.join(root, 'content/posts');
  const ids = new Set(), posts = [];
  for (const file of fs.readdirSync(directory).sort()) {
    if (!/\.(md|html)$/.test(file)) continue;
    const filename = path.join(directory, file);
    check(fs.lstatSync(filename).isFile(), 'source must be a regular file');
    const raw = fs.readFileSync(filename, 'utf8');
    let parsed, metadataSha256;
    if (file.endsWith('.md')) parsed = matter(raw);
    else {
      const metadataFile = filename.replace(/\.html$/, '.meta.json');
      check(fs.lstatSync(metadataFile).isFile(), 'HTML metadata must be a regular file');
      const metadata = fs.readFileSync(metadataFile, 'utf8');
      metadataSha256 = createHash('sha256').update(metadata).digest('hex');
      parsed = { data: JSON.parse(metadata), content: raw };
    }
    const data = validateArticleMetadata(parsed.data);
    check(!ids.has(data.id), 'duplicate ID including drafts'); ids.add(data.id);
    check(text(parsed.content), 'empty body');
    validate({ raw, data, body: parsed.content, file });
    if (data.draft === true && !includeDrafts) continue;
    const bodyStartLine = file.endsWith('.html') ? 1 : raw.slice(0, raw.length - parsed.content.length).split('\n').length;
    posts.push({ ...data, kind: file.endsWith('.html') ? 'html' : 'markdown', collection: data.collection || 'docs', body: parsed.content, bodyStartLine, file, sha256: createHash('sha256').update(raw).digest('hex'), ...(metadataSha256 ? { metadataSha256 } : {}) });
  }
  return posts.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));
}

/** @param {{id:string,file:string,body:string,bodyStartLine?:number}[]} posts
 * @param {{aliases?:Record<string,string>,origins?:string[]}} [options] */
export function articleReferences(posts, { aliases = {}, origins = [] } = {}) {
  const files = new Map(posts.map(post => [post.file, post.id]));
  const ids = new Set(posts.map(post => post.id)), refs = [], seen = new Set();
  for (const post of posts) {
   let fence = null;
   for (const [index, line] of post.body.split('\n').entries()) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1]?.[0];
    if (marker) { fence = fence === marker ? null : fence || marker; continue; }
    if (fence) continue;
    const links = [...line.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)|\bhref=["']([^"']+)["']/g)];
    for (const match of links) {
      let target = (match[1] || match[2]).trim().replace(/^<|>$/g, '').split(/[?#]/)[0];
      try { target = decodeURIComponent(target); } catch { continue; }
      if (/^https?:\/\//.test(target)) {
        let url; try { url = new URL(target); } catch { continue; }
        if (!origins.includes(url.origin) && !aliases[target] && !aliases[url.pathname]) continue;
        target = aliases[target] || aliases[url.pathname] || url.pathname;
      }
      target = aliases[target] || aliases[target.replace(/\/$/, '') + '/'] || target;
      const route = target.match(/^\/(?:blog|docs)\/([a-f0-9]{16})$/);
      const targetId = route ? route[1] : files.get(path.posix.basename(target));
      if (!targetId || !ids.has(targetId) || targetId === post.id || seen.has(post.id + ':' + targetId)) continue;
      seen.add(post.id + ':' + targetId);
      refs.push({ source: post.id, target: targetId, type: 'references', evidence: { sourcePath: 'posts/' + post.file, line: index + (post.bodyStartLine || 1), target } });
    }
   }
  }
  return refs;
}

export function articleGraph(posts, options) {
  const nodes = [], edges = [], topics = new Set();
  for (const post of posts) {
    nodes.push({ id: post.id, type: 'document', label: post.title, topic: post.topic, url: '/blog/' + post.id, publication: post.publication || null });
    if (!topics.has(post.topic)) { topics.add(post.topic); nodes.push({ id: 'topic:' + post.topic, type: 'topic', label: post.topic, topic: post.topic }); }
    edges.push({ source: post.id, target: 'topic:' + post.topic, type: 'belongs_to', evidence: { sourcePath: 'posts/' + post.file, basis: 'topic metadata' } });
  }
  return { nodes, edges: [...edges, ...articleReferences(posts, options)] };
}
