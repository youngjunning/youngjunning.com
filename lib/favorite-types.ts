export type Favorite = { priority?: 'lead'|'evaluate'|'reference'; adoption?: 'unknown'|'not_selected'|'trial'|'adopted'|'retired'; usages?: {project:string;projectUrl:string;stage:'trial'|'adopted'|'retired';purpose:string;evidence:string}[];
  id: string; kind: 'project' | 'knowledge' | 'card'; title: string; url: string | null;
  card?: { date: string | null; recordedAt: string; context: string; understanding: string; example: string; distinction: string };
  summary: string; reason: string; tags: string[]; savedAt: string;
  selection: 'explicit' | 'discovered'; visibility: 'shared' | 'private';
  sources: { label: string }[];
};
export type FavoriteStore = { version: 1; favorites: Favorite[] };
