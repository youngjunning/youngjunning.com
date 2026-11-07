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
import { prepareGlossary } from './article-glossary-model.mjs';
import { contentSubjects, inferSubjects } from './content-subjects.mjs';
import { topics } from './topics.mjs';
import { publicArticleUrlMap } from './article-url-map.mjs';
import { countArticleCharacters } from './article-reading.mjs';

const read = (root, file, fallback) => fs.existsSync(path.join(root, file)) ? JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) : fallback;
export function readPublicContent(root = process.cwd()) {
  const migration = read(root, 'content/blog-migration-2026-11-01.json', { entries: [] });
  const posts = loadArticles(root, { validate({ raw, data, body, file }) { assertArticleText(raw, data, body, migration.entries); assertPublicText(file); assertPublicText(JSON.stringify(data)); } }).map(post => ({ ...post, collection: post.collection || 'docs' }));
  const records = validateRecords(read(root, 'content/records.json'), new Set(posts.map(post => post.id)));
  const favorites = validateFavorites(read(root, 'content/favorites.json'));
  const glossaryStore = read(root, 'content/article-glossary.json', { version: 1, entries: [] });
  assertPublicText(JSON.stringify(glossaryStore));
  const glossary = prepareGlossary(glossaryStore, favorites, posts.map(post => ({ ...post, content: post.body })));
  return { records, favorites, posts, glossary };
}

export function buildPublicSnapshot(root = process.cwd()) {
  const content = readPublicContent(root), { records, favorites, posts, glossary } = content;
  const revision = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  const generatedAt = new Date().toISOString();
  const documents = posts.map(post => ({ id: post.id, title: post.title, date: post.date, updatedAt: post.updatedAt || null, tags: post.tags, sourcePath: 'posts/' + post.file, kind: post.kind, collection: post.collection, publication: post.publication || null, source: post.source, cover: post.cover, updated: post.updated, migrationNote: post.migrationNote, migrationReport: post.migrationReport, assets: post.assets, unavailableAssets: post.unavailableAssets, topic: post.topic, classification: 'frontmatter', summary: post.description, headings: [...post.body.matchAll(/^#{2,3}\s+(.+)$/gm)].map(match => match[1]), words: countArticleCharacters(post.body), sha256: post.sha256, url: '/blog/' + post.id, rawUrl: '/raw/' + post.id }));
  const knowledgeDocuments = documents.map(doc => ({ ...doc, rawContent: fs.readFileSync(path.join(root, 'content', doc.sourcePath), 'utf8') }));
  const referenceOptions = { aliases: read(root, 'content/blog-legacy-links.json', {}), origins: ['https://youngjunning.com', 'https://blog.zisheng.pro'] };
  const knowledge = buildConversationKnowledge(records, knowledgeDocuments, { revision, generatedAt }, articleReferences(posts, referenceOptions), { favorites, glossary: glossary.entries });
  const engineeringStore = read(root, 'content/engineering.json', { version: 1, visibility: 'public', claims: [] });
  assertPublicText(JSON.stringify(engineeringStore));
  const engineering = projectEngineering(engineeringStore, read(root, 'config/code-project-scope.json', { version: 1, criterion: 'user-led', repositories: [] }), records, knowledgeDocuments);
  knowledge.entries.push(...engineering.entries); knowledge.relationships.push(...engineering.relationships); knowledge.engineeringPages = engineering.pages;
  const codeBrain = read(root, 'content/code-brain.json');
  if (codeBrain?.files?.length) throw new Error('Public site does not accept native code indexes');
  knowledge.wiki = projectWiki(knowledge, read(root, 'content/wiki.json'));
  const suggestions = read(root, 'content/suggestions.json');
  if (suggestions) { assertPublicText(JSON.stringify(suggestions)); knowledge.preparedSuggestions = suggestions; }
  const resources = favoriteGraph(favorites, documents), articles = articleGraph(posts, referenceOptions);
  const source = { revision, dirty: false, root: 'content' };
  const nodes = [...articles.nodes, ...resources.nodes], edges = [...articles.edges, ...resources.edges.map(edge => ({ ...edge, evidence: { sourcePath: 'favorites.json', basis: edge.evidence } }))];
  const nodeIds = new Set(nodes.map(node => node.id));
  for (const subject of contentSubjects) {
    const id = 'subject:' + subject.id;
    if (!nodeIds.has(id)) { nodes.push({ id, label: subject.label, type: 'topic', topic: subject.id }); nodeIds.add(id); }
  }
  for (const doc of documents) for (const subject of inferSubjects(doc)) edges.push({ source: doc.id, target: 'subject:' + subject, type: 'tagged', evidence: { sourcePath: doc.sourcePath, basis: '文章主题阅读关联，不表示采用或因果' } });
  for (const entry of glossary.entries) for (const post of posts) if ((entry.articleId === null || entry.articleId === post.id) && post.body.includes(entry.term)) edges.push({ source: post.id, target: 'favorite:' + entry.favoriteId, type: 'explains', evidence: { sourcePath: 'article-glossary.json', basis: '显式维护的文章术语与知识笔记关系：' + entry.term } });
  const graph = { schemaVersion: 1, generatedAt, source, topics, nodes, edges };
  const catalog = { schemaVersion: 1, generatedAt, source, topics, documents };
  const okrStore = read(root, 'content/okr.json'); assertPublicText(JSON.stringify(okrStore));
  const okr = validateOkr(okrStore);
  const usage = read(root, 'content/skill-usage.json'); assertPublicText(JSON.stringify(usage)); validateSkillUsage(usage, 'external');
  const skills = read(root, 'content/skills.json'); assertPublicText(JSON.stringify(skills));
  const publicSkillNames = new Set(skills.skills.map(skill => skill.name));
  if (usage.skills.some(skill => !publicSkillNames.has(skill.name))) throw new Error('Usage contains an unreviewed public skill name');
  return { content, knowledge, graph, catalog, okr, usage, skills };
}

export function preparePublicContent(root = process.cwd()) {
  const snapshot = buildPublicSnapshot(root), directory = path.join(root, '.content');
  fs.mkdirSync(directory, { recursive: true });
  for (const file of ['research.json', 'excerpts.json']) fs.rmSync(path.join(directory, file), { force: true });
  const { records, favorites, glossary } = snapshot.content;
  const outputs = { conversation: snapshot.knowledge, graph: snapshot.graph, catalog: snapshot.catalog, 'public-content': snapshot.content, records: { version: 2, records }, favorites: { version: 2, favorites }, glossary, okr: snapshot.okr, 'skill-usage': snapshot.usage, skills: snapshot.skills, search: snapshot.content.posts.map(post => ({ id: post.id, text: post.body.replace(/<[^>]*>/g, ' ').toLowerCase() })) };
  for (const [file, value] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(directory, file + '.json.pending'), JSON.stringify(value));
    fs.renameSync(path.join(directory, file + '.json.pending'), path.join(directory, file + '.json'));
  }
  for (const post of snapshot.content.posts) {
    const doc = snapshot.catalog.documents.find(item => item.id === post.id);
    const rawContent = fs.readFileSync(path.join(root, 'content/posts', post.file), 'utf8');
    const urls = publicArticleUrlMap(post, snapshot.content.posts, read(root, 'content/blog-legacy-links.json', {}));
    fs.writeFileSync(path.join(directory, post.id + '.json'), JSON.stringify({ ...post, ...doc, content: post.body, rawContent, urls, ...(post.kind === 'html' ? { html: post.body } : {}) }));
  }
  return snapshot;
}
