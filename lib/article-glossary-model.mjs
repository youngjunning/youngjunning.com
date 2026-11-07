/** Validate explicit term-note relations against visible, current sources. */
export function prepareGlossary(store, favorites, documents) {
  if (!store || store.version !== 1 || !Array.isArray(store.entries)) throw new Error('Invalid article glossary');
  const notes = new Map(favorites.filter(item => item.kind === 'note' && item.visibility === 'shared').map(item => [item.id, item]));
  const articles = new Map(documents.map(item => [item.id, item]));
  const identities = new Set();
  const entries = store.entries.map(entry => {
    if (!entry || Object.keys(entry).some(key => !['term','favoriteId','articleId'].includes(key)) || typeof entry.term !== 'string' || !entry.term.trim() || !notes.has(entry.favoriteId) || !Object.hasOwn(entry, 'articleId')) throw new Error('Glossary term needs a shared knowledge note');
    if (entry.articleId !== null) {
      const article = articles.get(entry.articleId);
      if (!article || !(article.content ?? article.rawContent ?? '').includes(entry.term)) throw new Error('Glossary article or term is missing');
    }
    const identity = `${entry.articleId ?? '*'}:${entry.term}`;
    if (identities.has(identity)) throw new Error('Duplicate glossary term in article scope');
    identities.add(identity);
    return { ...entry };
  });
  return { version: 1, entries };
}
