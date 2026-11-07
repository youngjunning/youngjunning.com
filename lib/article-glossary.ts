import fs from 'node:fs';
import path from 'node:path';
import type { Favorite } from './favorite-types';

type Article = { id: string; title: string; summary?: string; headings?: string[]; tags?: string[]; content?: string; url: string };
export type GlossaryEntry = { term: string; title: string; summary: string; favoriteId: string; related: { title: string; url: string }[] };
type TermRelation = { term: string; favoriteId: string; articleId: string | null };

export function glossaryForArticle(article: Article, articles: Article[], favorites: Favorite[]): GlossaryEntry[] {
  const notes = new Map(favorites.filter(item => item.kind === 'note' && item.note).map(item => [item.id, item]));
  const store = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.content/glossary.json'), 'utf8')) as { entries: TermRelation[] };
  // Specific article relations override deliberately curated global aliases.
  const aliases = new Map(store.entries.filter(entry => entry.articleId === null).map(entry => [entry.term, entry.favoriteId]));
  for (const entry of store.entries) if (entry.articleId === article.id) aliases.set(entry.term, entry.favoriteId);
  return [...aliases].flatMap(([term, id]) => {
    const note = notes.get(id);
    if (!note || !article.content?.includes(term)) return [];
    const related = articles.filter(item => item.id !== article.id && [item.title, item.summary, ...(item.headings || []), ...(item.tags || [])].some(value => value?.includes(term)))
      .sort((a, b) => Number(b.title.includes(term)) - Number(a.title.includes(term)))
      .slice(0, 3).map(item => ({ title: item.title, url: item.url }));
    return [{ term, title: note.title, summary: note.note!.body, favoriteId: id, related }];
  });
}
