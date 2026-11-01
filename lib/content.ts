import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { assertPublicText, validateRecords, validateFavorites } from './model.mjs';
import recordStore from '@/content/records.json';
import favoriteStore from '@/content/favorites.json';
export type RecordItem = { id: string; kind: string; title: string; text: string; context: string; date: string | null; recordedAt: string; sources: { kind: string; label: string }[]; basis?: string; outcome?: string | null; role?: string; goal?: string; outcomes?: string[]; period?: string; before?: string; after?: string; reason?: string; subjectId?: string };
export type Favorite = { priority?: 'lead'|'evaluate'|'reference'; adoption?: 'unknown'|'not_selected'|'trial'|'adopted'|'retired'; usages?: {project:string;projectUrl:string;stage:'trial'|'adopted'|'retired';purpose:string;evidence:string}[];  id: string; title: string; kind: string; url: string | null; summary: string; reason: string; selection: string; tags: string[]; savedAt: string; sources: { label: string }[]; card?: { understanding: string; example: string; distinction: string } };
export type Post = { id: string; title: string; description: string; date: string | null; topic: string; tags: string[]; body: string; cover?: string; source?: string };
export function getContent(): { records: RecordItem[]; favorites: Favorite[]; posts: Post[] } {
  const directory = path.join(process.cwd(), 'content/posts');
  const posts: Post[] = [];
  const ids = new Set<string>();
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(directory, file), 'utf8');
    assertPublicText(raw);
    const { data, content } = matter(raw);
    if (!/^[a-f0-9]{16}$/.test(data.id) || ids.has(data.id)) throw new Error('Invalid or duplicate article ID');
    ids.add(data.id);
    if (typeof data.title !== 'string' || !data.title.trim() || typeof data.description !== 'string' || !data.description.trim() || !['principles','architecture','engineering','diagnostics','reflections'].includes(data.topic) || !Array.isArray(data.tags) || data.tags.some((tag: unknown) => typeof tag !== 'string') || !content.trim()) throw new Error('Invalid article metadata');
    if (data.date !== null && (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0,10) !== data.date)) throw new Error('Invalid article date; quote YYYY-MM-DD');
    if (data.draft === true) continue;
    posts.push({ id: data.id, title: data.title, description: data.description, date: data.date, topic: data.topic, tags: data.tags, body: content, cover: data.cover, source: data.source });
  }
  const visibleIds = new Set(posts.map(post => post.id));
  return { records: validateRecords(recordStore, visibleIds), favorites: validateFavorites(favoriteStore), posts: posts.sort((a,b) => (b.date || '').localeCompare(a.date || '')) };
}
