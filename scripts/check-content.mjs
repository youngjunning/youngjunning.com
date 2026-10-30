import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { assertPublicText, validateRecords, validateFavorites } from '../lib/model.mjs';
const directory = path.resolve('content');
function scan(root) { for (const entry of fs.readdirSync(root, { withFileTypes: true })) { const file = path.join(root,entry.name); assertPublicText(entry.name); if (entry.isDirectory()) scan(file); else if (/\.(json|md|txt|svg)$/.test(entry.name)) assertPublicText(fs.readFileSync(file,'utf8')); } }
scan(directory);
if (fs.existsSync('public/media')) scan(path.resolve('public/media'));
const ids = new Set(), visibleIds = new Set();
let articles = 0;
for (const file of fs.readdirSync(path.join(directory,'posts')).filter(file => file.endsWith('.md'))) {
  const { data, content } = matter(fs.readFileSync(path.join(directory,'posts',file),'utf8'));
  if (!/^[a-f0-9]{16}$/.test(data.id) || ids.has(data.id)) throw new Error('Invalid or duplicate article ID: ' + file);
  if (!data.title?.trim() || !data.description?.trim() || !content.trim() || !['principles','architecture','engineering','diagnostics','reflections'].includes(data.topic) || !Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error('Invalid metadata: ' + file);
  if (data.date !== null && (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0,10) !== data.date)) throw new Error('Invalid article date: ' + file);
  ids.add(data.id);
  if (typeof data.cover !== 'string' || !data.cover.startsWith('/media/') || !fs.existsSync(path.resolve('public',data.cover.slice(1)))) throw new Error('Missing local cover: ' + file);
  for (const match of content.matchAll(/!\[[^\]]*\]\((\/media\/[^)]+)\)/g)) if (!fs.existsSync(path.resolve('public',match[1].slice(1)))) throw new Error('Missing article image: ' + file);
  if (data.source && !/^https:\/\/github\.com\/youngjunning\/blog\.zisheng\.pro\/blob\/[a-f0-9]{40}\//.test(data.source)) throw new Error('Invalid imported article provenance: ' + file);
  if (data.draft !== true) { visibleIds.add(data.id); articles++; }
}
const records = validateRecords(JSON.parse(fs.readFileSync(path.join(directory,'records.json'),'utf8')),visibleIds);
const favorites = validateFavorites(JSON.parse(fs.readFileSync(path.join(directory,'favorites.json'),'utf8')));
console.log(`Public content valid: ${records.length} records, ${favorites.length} favorites, ${articles} articles.`);
