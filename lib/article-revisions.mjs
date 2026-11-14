import revisionData from '../content/article-revisions.json' with { type: 'json' };

const id = value => typeof value === 'string' && /^[a-f0-9]{16}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

export function validateArticleRevisions(data, articleIds) {
  if (data?.version !== 1 || !Array.isArray(data.articles)) throw new Error('Invalid article revision store');
  const seen = new Set();
  for (const article of data.articles) {
    if (!id(article.id) || !articleIds.has(article.id) || seen.has(article.id) || !Array.isArray(article.revisions) || !article.revisions.length) throw new Error('Invalid article revision target');
    seen.add(article.id);
    const labels = new Set(), commits = new Set();
    for (const revision of article.revisions) {
      if (typeof revision.label !== 'string' || !revision.label.trim() || !day(revision.date) || typeof revision.summary !== 'string' || !revision.summary.trim() || !commit(revision.commit) || typeof revision.preview !== 'string' || !revision.preview.includes('@@') || labels.has(revision.label) || commits.has(revision.commit)) throw new Error('Invalid article revision entry: ' + article.id);
      labels.add(revision.label); commits.add(revision.commit);
    }
  }
  return data;
}

export function articleRevisions(articleId) {
  return revisionData.articles.find(article => article.id === articleId)?.revisions || [];
}
