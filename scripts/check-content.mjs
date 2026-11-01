import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createHash } from 'node:crypto';
import { assertPublicText, validateRecords, validateFavorites } from '../lib/model.mjs';
import { assertArticleText } from '../lib/article-validation.mjs';
const migration = JSON.parse(fs.readFileSync('content/blog-migration-2026-11-01.json', 'utf8'));
const directory = path.resolve('content');
function scan(root) { for (const entry of fs.readdirSync(root, { withFileTypes: true })) { const file = path.join(root,entry.name); assertPublicText(entry.name); if (entry.isDirectory()) { if (file !== path.join(directory, 'posts')) scan(file); } else if (/\.(json|md|txt|svg)$/.test(entry.name)) assertPublicText(fs.readFileSync(file,'utf8')); } }
scan(directory);
if (fs.existsSync('public/media')) scan(path.resolve('public/media'));
const ids = new Set(), visibleIds = new Set();
let articles = 0;
for (const file of fs.readdirSync(path.join(directory,'posts')).filter(file => file.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(directory,'posts',file),'utf8');
  const { data, content } = matter(raw);
  assertArticleText(raw, data, content, migration.entries);
  if (!/^[a-f0-9]{16}$/.test(data.id) || ids.has(data.id)) throw new Error('Invalid or duplicate article ID: ' + file);
  if (!data.title?.trim() || !data.description?.trim() || !content.trim() || !['principles','architecture','engineering','diagnostics','reflections'].includes(data.topic) || !Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error('Invalid metadata: ' + file);
  if (data.date !== null && (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0,10) !== data.date)) throw new Error('Invalid article date: ' + file);
  ids.add(data.id);
  if (typeof data.cover !== 'string' || !data.cover.startsWith('/media/') || !fs.existsSync(path.resolve('public',data.cover.slice(1)))) throw new Error('Missing local cover: ' + file);
  for (const asset of Object.values(data.assets || {})) if (typeof asset !== 'string' || !asset.startsWith('/media/') || asset.includes('..') || !fs.existsSync(path.resolve('public', asset.slice(1)))) throw new Error('Missing imported asset: ' + file);
  for (const match of content.matchAll(/!\[[^\]]*\]\((\/media\/[^)]+)\)/g)) if (!fs.existsSync(path.resolve('public',match[1].slice(1)))) throw new Error('Missing article image: ' + file);
  if (data.source && !/^https:\/\/github\.com\/youngjunning\/blog\.zisheng\.pro\/blob\/[a-f0-9]{40}\//.test(data.source)) throw new Error('Invalid imported article provenance: ' + file);
  if (data.migrationReport && data.migrationReport !== '/blog/website-migration') throw new Error('Invalid migration report: ' + file);
  if (data.draft !== true) { visibleIds.add(data.id); articles++; }
}
const records = validateRecords(JSON.parse(fs.readFileSync(path.join(directory,'records.json'),'utf8')),visibleIds);
const favorites = validateFavorites(JSON.parse(fs.readFileSync(path.join(directory,'favorites.json'),'utf8')));
if (migration.entries.length !== migration.counts.reviewed || new Set(migration.entries.map(item => item.sourceFile)).size !== migration.entries.length) throw new Error('Incomplete migration inventory');
for (const entry of migration.entries) {
  if (!entry.reason?.trim()) throw new Error('Missing migration reason');
  if (entry.status !== 'excluded' && !visibleIds.has(entry.id)) throw new Error('Missing migrated article: ' + entry.title);
}
for (const status of ['migrated', 'updated', 'excluded']) if (migration.entries.filter(entry => entry.status === status).length !== migration.counts[status]) throw new Error('Incorrect migration count: ' + status);
const resources = JSON.parse(fs.readFileSync('content/blog-migration-assets-2026-11-01.json', 'utf8')).resources;
for (const asset of Object.values(resources)) {
  if (asset.status !== 'local') continue;
  const bytes = fs.readFileSync(path.resolve('public', asset.path.slice(1)));
  if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Imported asset changed: ' + asset.path);
}
for (const destination of Object.values(JSON.parse(fs.readFileSync('content/blog-legacy-links.json', 'utf8')))) if (!visibleIds.has(destination.replace('/blog/', ''))) throw new Error('Broken legacy article mapping: ' + destination);
const websiteMigration = JSON.parse(fs.readFileSync('content/website-migration-2026-11-01.json', 'utf8'));
if (websiteMigration.entries.length !== websiteMigration.counts.reviewed || new Set(websiteMigration.entries.map(item => item.sourceKey)).size !== websiteMigration.entries.length) throw new Error('Incomplete website migration inventory');
for (const status of ['imported', 'reference', 'excluded']) if (websiteMigration.entries.filter(entry => entry.status === status).length !== websiteMigration.counts[status]) throw new Error('Incorrect website migration count: ' + status);
for (const entry of websiteMigration.entries) {
  if (!entry.title?.trim() || !entry.reason?.trim() || !/^[a-f0-9]{16}$/.test(entry.sourceKey) || !['imported','reference','excluded'].includes(entry.status)) throw new Error('Invalid website migration decision');
  if (entry.status !== 'imported') continue;
  if (!visibleIds.has(entry.id) || !entry.file.startsWith('content/posts/') || entry.file.includes('..')) throw new Error('Missing website article: ' + entry.title);
  const raw = fs.readFileSync(entry.file, 'utf8');
  const { data, content } = matter(raw);
  if (data.id !== entry.id || createHash('sha256').update(raw).digest('hex') !== entry.importedSha256 || createHash('sha256').update(content).digest('hex') !== entry.bodySha256) throw new Error('Website migration content changed: ' + entry.title);
}
const websiteAssets = JSON.parse(fs.readFileSync('content/website-migration-assets-2026-11-01.json', 'utf8'));
for (const asset of [websiteAssets.cover, ...Object.values(websiteAssets.resources).filter(item => item.status === 'local')]) {
  if (!asset.path.startsWith('/media/') || asset.path.includes('..')) throw new Error('Invalid website asset path');
  const bytes = fs.readFileSync(path.resolve('public', asset.path.slice(1)));
  if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Website asset changed: ' + asset.path);
}
console.log(`Public content valid: ${records.length} records, ${favorites.length} favorites, ${articles} articles.`);
