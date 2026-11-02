import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadArticles, articleReferences, articleGraph } from './article-model.mjs';
import { validateRecords, validateFavorites, assertPublicText } from './model.mjs';
import { assertArticleText } from './article-validation.mjs';
import { favoriteGraph } from './favorite-tracking.mjs';
import { buildConversationKnowledge } from './twin-knowledge.mjs';
import { projectWiki } from './twin-wiki.mjs';
import { projectEngineering } from './engineering-knowledge.mjs';
import { validateOkr } from './okr-model.mjs';
import { validateSkillUsage } from './skill-usage.mjs';
import { topics } from './topics.mjs';
import { countArticleCharacters } from './article-reading.mjs';

const read = (root, file, fallback) => fs.existsSync(path.join(root, file)) ? JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) : fallback;
export function readPublicContent(root = process.cwd()) {
  const migration = read(root, 'content/blog-migration-2026-11-01.json', { entries: [] });
  const posts = loadArticles(root, { validate({ raw, data, body, file }) { assertArticleText(raw, data, body, migration.entries); assertPublicText(file); assertPublicText(JSON.stringify(data)); } });
  const records = validateRecords(read(root, 'content/records.json'), new Set(posts.map(post => post.id)));
  const favorites = validateFavorites(read(root, 'content/favorites.json'));
  return { records, favorites, posts };
}

export function buildPublicSnapshot(root = process.cwd()) {
  const { records, favorites, posts } = readPublicContent(root);
  const revision = createHash('sha256').update(JSON.stringify([records, favorites, posts])).digest('hex');
  const generatedAt = new Date().toISOString();
  const documents = posts.map(post => ({ id: post.id, title: post.title, date: post.date, summary: post.description, tags: post.tags, url: '/blog/' + post.id, rawUrl: '/raw/' + post.id, sha256: post.sha256, rawContent: fs.readFileSync(path.join(root, 'content/posts', post.file), 'utf8') }));
  const referenceOptions = { aliases: read(root, 'content/blog-legacy-links.json', {}), origins: ['https://youngjunning.com', 'https://blog.zisheng.pro'] };
  const knowledge = buildConversationKnowledge(records, documents, { revision, generatedAt }, articleReferences(posts, referenceOptions));
  const engineering = projectEngineering(read(root, 'content/engineering.json', { version: 1, visibility: 'public', claims: [] }), read(root, 'config/code-project-scope.json', { version: 1, criterion: 'user-led', repositories: [] }), records, documents);
  knowledge.entries.push(...engineering.entries); knowledge.relationships.push(...engineering.relationships); knowledge.engineeringPages = engineering.pages;
  const codeBrain = read(root, 'content/code-brain.json');
  if (codeBrain?.files?.length) throw new Error('Public site does not accept native code indexes');
  knowledge.wiki = projectWiki(knowledge, read(root, 'content/wiki.json'));
  const suggestions = read(root, 'content/suggestions.json');
  if (suggestions) { assertPublicText(JSON.stringify(suggestions)); knowledge.preparedSuggestions = suggestions; }
  const resources = favoriteGraph(favorites), articles = articleGraph(posts, referenceOptions);
  const source = { revision, dirty: false, root: 'content' };
  const graph = { schemaVersion: 1, generatedAt, source, topics, nodes: [...articles.nodes, ...resources.nodes], edges: [...articles.edges, ...resources.edges.map(edge => ({ ...edge, evidence: { sourcePath: 'favorites.json', basis: edge.evidence } }))] };
  const catalog = { schemaVersion: 1, generatedAt, source, topics, documents: posts.map(post => ({ id: post.id, title: post.title, date: post.date, tags: post.tags, sourcePath: 'posts/' + post.file, kind: post.kind, collection: post.collection, publication: post.publication || null, topic: post.topic, classification: 'frontmatter', summary: post.description, headings: [...post.body.matchAll(/^#{2,3}\s+(.+)$/gm)].map(match => match[1]), words: countArticleCharacters(post.body), sha256: post.sha256, url: '/blog/' + post.id, rawUrl: '/raw/' + post.id })) };
  const okr = validateOkr(read(root, 'content/okr.json'));
  const usage = read(root, 'content/skill-usage.json'); assertPublicText(JSON.stringify(usage)); validateSkillUsage(usage, 'external');
  const publicSkillNames = new Set(read(root, 'content/skills.json').skills.map(skill => skill.name));
  if (usage.skills.some(skill => !publicSkillNames.has(skill.name))) throw new Error('Usage contains an unreviewed public skill name');
  return { knowledge, graph, catalog, okr, usage };
}

export function preparePublicContent(root = process.cwd()) {
  const snapshot = buildPublicSnapshot(root), directory = path.join(root, '.content');
  fs.mkdirSync(directory, { recursive: true });
  for (const [file, value] of Object.entries({ conversation: snapshot.knowledge, graph: snapshot.graph, catalog: snapshot.catalog })) {
    fs.writeFileSync(path.join(directory, file + '.json.pending'), JSON.stringify(value));
    fs.renameSync(path.join(directory, file + '.json.pending'), path.join(directory, file + '.json'));
  }
  return snapshot;
}
