/** Validate article-local explanations without coupling them to knowledge notes. */
export function prepareGlossary(store, documents) {
  if (!store || store.version !== 2 || !Array.isArray(store.entries)) throw new Error('Invalid article glossary');
  const articles = new Map(documents.map(item => [item.id, item]));
  const identities = new Set();
  const entries = store.entries.map(entry => {
    if (!entry || Object.keys(entry).some(key => !['term','definition','articleId'].includes(key)) || typeof entry.term !== 'string' || !entry.term.trim() || typeof entry.definition !== 'string' || !entry.definition.trim() || !Object.hasOwn(entry, 'articleId')) throw new Error('Glossary term needs a direct definition');
    if (entry.articleId !== null && typeof entry.articleId !== 'string') throw new Error('Invalid glossary article ID');
    if (entry.articleId !== null) {
      const article = articles.get(entry.articleId);
      if (!article || !(article.content ?? article.rawContent ?? '').includes(entry.term)) throw new Error(`Glossary article or term is missing: ${entry.articleId} / ${entry.term}`);
    }
    const identity = `${entry.articleId ?? '*'}:${entry.term}`;
    if (identities.has(identity)) throw new Error('Duplicate glossary term in article scope');
    identities.add(identity);
    return { ...entry };
  });
  return { version: 2, entries };
}
