import fs from 'node:fs';
import path from 'node:path';

type Article = { id: string; title: string; summary?: string; headings?: string[]; tags?: string[]; content?: string; url: string };
export type GlossaryEntry = { term: string; title: string; summary: string; related: { title: string; url: string }[] };
type TermDefinition = { term: string; definition: string; articleId: string | null };

export function glossaryForArticle(article: Article, articles: Article[]): GlossaryEntry[] {
  const store = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.content/glossary.json'), 'utf8')) as { entries: TermDefinition[] };
  // Specific article relations override deliberately curated global aliases.
  const aliases = new Map(store.entries.filter(entry => entry.articleId === null).map(entry => [entry.term, entry.definition]));
  for (const entry of store.entries) if (entry.articleId === article.id) aliases.set(entry.term, entry.definition);
  return [...aliases].flatMap(([term, definition]) => {
    if (!article.content?.includes(term)) return [];
    const related = articles.filter(item => item.id !== article.id && [item.title, item.summary, ...(item.headings || []), ...(item.tags || [])].some(value => value?.includes(term)))
      .sort((a, b) => Number(b.title.includes(term)) - Number(a.title.includes(term)))
      .slice(0, 3).map(item => ({ title: item.title, url: item.url }));
    return [{ term, title: term, summary: definition, related }];
  });
}
