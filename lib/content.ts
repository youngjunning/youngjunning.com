import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { PersonalRecord } from './record-types';
import type { Favorite } from './favorite-types';
import type { Catalog, Document, Graph } from './types';
export type { PersonalRecord as RecordItem } from './record-types';
export type { Favorite } from './favorite-types';
export type Post = {
  id: string; title: string; description: string; date: string | null; topic: string; tags: string[];
  body: string; file: string; sha256: string; kind: 'markdown' | 'html'; collection: 'docs' | 'ata';
  publication?: { status: 'unknown' | 'draft' | 'ready' | 'published'; url?: string; publishedAt?: string };
  cover?: string; source?: string; updated?: string; updatedAt?: string; migrationNote?: string; migrationReport?: string;
  assets?: Record<string, string>; unavailableAssets?: string[];
};
const root = path.join(process.cwd(), '.content');
function read<T>(file: string): T { return JSON.parse(fs.readFileSync(path.join(root, file + '.json'), 'utf8')); }
export function getContent(): { records: PersonalRecord[]; favorites: Favorite[]; posts: Post[] } { return read('public-content'); }
export function getCatalog(): Catalog { return read('catalog'); }
export function getGraph(): Graph { return read('graph'); }
export function getSearch() { return fs.readFileSync(path.join(root, 'search.json'), 'utf8'); }
export function getDocument(id: string): (Document & { content: string; rawContent: string; urls: Record<string, string>; html?: string }) | null {
  if (!/^[a-f0-9]{16}$/.test(id) || !getCatalog().documents.some(doc => doc.id === id)) return null;
  return read(id);
}
