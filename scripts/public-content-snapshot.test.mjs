import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readPublicContent, buildPublicSnapshot } from '../lib/content-store.mjs';
import { publicArticleUrlMap } from '../lib/article-url-map.mjs';

const note = { id: '1111111111111111', kind: 'note', type: 'concept', title: '边界', url: null, summary: '概念解释。', reason: '回查。', subjects: ['engineering'], tags: [], attribution: 'ai', savedAt: '2026-11-07', selection: 'discovered', visibility: 'shared', sources: [{ label: '公开资料整理。' }], note: { body: '解释概念的适用边界。', date: null, recordedAt: '2026-11-07' } };

test('public curation rejects private entries before projection, even with otherwise valid metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-curation-'));
  try {
    fs.mkdirSync(path.join(root, 'content/posts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content/records.json'), JSON.stringify({version:2,records:[]}));
    fs.writeFileSync(path.join(root, 'content/favorites.json'), JSON.stringify({version:2,favorites:[note]}));
    fs.writeFileSync(path.join(root, 'content/research.json'), JSON.stringify({version:1,items:[{visibility:'private'}]}));
    assert.throws(() => readPublicContent(root), /private research/);
    fs.writeFileSync(path.join(root, 'content/research.json'), JSON.stringify({version:1,items:[]}));
    fs.writeFileSync(path.join(root, 'content/excerpts.json'), JSON.stringify({version:1,items:[{visibility:'private'}]}));
    assert.throws(() => readPublicContent(root), /private excerpts/);
    fs.writeFileSync(path.join(root, 'content/excerpts.json'), JSON.stringify({version:1,items:[]}));
    fs.writeFileSync(path.join(root, 'content/article-glossary.json'), JSON.stringify({version:1,entries:[{term:'边界',favoriteId:note.id,articleId:'2222222222222222'}]}));
    assert.throws(() => readPublicContent(root), /article or term is missing/);
  } finally { fs.rmSync(root, {recursive:true,force:true}); }
});

test('public snapshots join actual note bodies, attribution and glossary while preserving legacy article provenance', () => {
  const snapshot = buildPublicSnapshot();
  const { content, knowledge, catalog, graph } = snapshot;
  assert.equal(content.favorites.length,103);
  for (const favorite of content.favorites) assert.ok(knowledge.entries.some(source => source.id === 'favorite-' + favorite.id && source.attribution === favorite.attribution && source.personalJudgment === false));
  assert.ok(graph.edges.some(edge => edge.type === 'explains'));
  assert.ok(graph.edges.every(edge => graph.nodes.some(node => node.id === edge.source) && graph.nodes.some(node => node.id === edge.target)));
  for (const post of content.posts) {
    const doc = catalog.documents.find(item => item.id === post.id);
    for (const key of ['source','cover','updated','migrationNote','migrationReport','assets','unavailableAssets']) assert.deepEqual(doc[key],post[key]);
    assert.equal(doc.updatedAt,post.updatedAt || null);
    assert.equal(doc.url,'/blog/'+post.id);
  }
});

test('public reader retains encoded relative links, actual media mapping and historical destinations', () => {
  const target = { id:'2222222222222222', file:'另一篇 文章.md' };
  const post = { kind:'markdown', assets:{'/images/a.png':'/media/a.png'}, body:'[相对](另一篇%20文章.md#章节) [旧址](/posts/old/#原段) [兼容](/docs/2222222222222222#章节) ![配图](/images/a.png)' };
  const urls = Object.fromEntries(Object.entries(publicArticleUrlMap(post,[target],{'/posts/old/':'/blog/'+target.id})).map(([from,to])=>[decodeURI(from),decodeURI(to)]));
  assert.equal(urls['另一篇 文章.md#章节'],'/blog/'+target.id+'#章节');
  assert.equal(urls['/posts/old/#原段'],'/blog/'+target.id+'#原段');
  assert.equal(urls['/docs/'+target.id+'#章节'],'/blog/'+target.id+'#章节');
  assert.equal(urls['/images/a.png'],'/media/a.png');
});
