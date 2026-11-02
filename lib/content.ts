import { readPublicContent } from './content-store.mjs';
import type { PersonalRecord } from './record-types';
import type { Favorite } from './favorite-types';
export type { PersonalRecord as RecordItem } from './record-types';
export type { Favorite } from './favorite-types';
export type Post = {
  id: string; title: string; description: string; date: string | null; topic: string; tags: string[];
  body: string; file: string; sha256: string; kind: 'markdown' | 'html'; collection: 'docs' | 'ata';
  publication?: { status: 'unknown' | 'draft' | 'ready' | 'published'; url?: string; publishedAt?: string };
  cover?: string; source?: string; updated?: string; migrationNote?: string; migrationReport?: string;
  assets?: Record<string, string>; unavailableAssets?: string[];
};
export function getContent(): { records: PersonalRecord[]; favorites: Favorite[]; posts: Post[] } { return readPublicContent(); }
