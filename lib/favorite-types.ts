export type FavoriteUsage = { project: string; projectUrl: string; stage: 'trial' | 'adopted' | 'retired'; purpose: string; evidence: string };
export type Favorite = {
  id: string; kind: 'resource' | 'note'; type: 'tool' | 'reference' | 'concept' | 'method';
  title: string; url: string | null; summary: string; reason: string; tags: string[]; subjects: string[];
  attribution: 'user' | 'source' | 'ai' | 'mixed';
  savedAt: string; updatedAt?: string; selection: 'explicit' | 'discovered'; visibility: 'shared' | 'private';
  sources: { label: string; url?: string | null }[];
  note?: { body: string; context?: string; example?: string; boundary?: string; date: string | null; recordedAt: string };
  usages?: FavoriteUsage[]; relatedIds?: string[];
};
export type FavoriteStore = { version: 2; favorites: Favorite[] };
