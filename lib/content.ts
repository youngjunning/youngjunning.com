import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { validateRecords, validateFavorites } from './model.mjs';
import recordStore from '@/content/records.json';
import favoriteStore from '@/content/favorites.json';
import migration from '@/content/blog-migration-2026-11-01.json';
import { assertArticleText } from './article-validation.mjs';
export type { PersonalRecord as RecordItem } from './record-types';
export type { Favorite } from './favorite-types';
import type { PersonalRecord as RecordItem } from './record-types';
import type { Favorite } from './favorite-types';
export type Post = { id: string; title: string; description: string; date: string | null; topic: string; tags: string[]; body: string; cover?: string; source?: string; updated?: string; migrationNote?: string; migrationReport?: string; assets?: Record<string, string>; unavailableAssets?: string[] };
export function getContent(): { records: RecordItem[]; favorites: Favorite[]; posts: Post[] } {
  const directory = path.join(process.cwd(), 'content/posts');
  const posts: Post[] = [];
  const ids = new Set<string>();
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(directory, file), 'utf8');
    const { data, content } = matter(raw);
    assertArticleText(raw, data, content, migration.entries);
    if (!/^[a-f0-9]{16}$/.test(data.id) || ids.has(data.id)) throw new Error('Invalid or duplicate article ID');
    ids.add(data.id);
    if (typeof data.title !== 'string' || !data.title.trim() || typeof data.description !== 'string' || !data.description.trim() || !['principles','architecture','engineering','diagnostics','reflections'].includes(data.topic) || !Array.isArray(data.tags) || data.tags.some((tag: unknown) => typeof tag !== 'string') || !content.trim()) throw new Error('Invalid article metadata');
    if (data.date !== null && (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0,10) !== data.date)) throw new Error('Invalid article date; quote YYYY-MM-DD');
    if (data.draft === true) continue;
    posts.push({ id: data.id, title: data.title, description: data.description, date: data.date, topic: data.topic, tags: data.tags, body: content, cover: data.cover, source: data.source, updated: data.updated, migrationNote: data.migrationNote, migrationReport: data.migrationReport, assets: data.assets, unavailableAssets: data.unavailableAssets });
  }
  const visibleIds = new Set(posts.map(post => post.id));
  return { records: validateRecords(recordStore, visibleIds), favorites: validateFavorites(favoriteStore), posts: posts.sort((a,b) => (b.date || '').localeCompare(a.date || '')) };
}
