import test from 'node:test';
import { articleDraft } from '../lib/article-draft.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadArticles, articleReferences, validateArticleMetadata } from '../lib/article-model.mjs';
const meta = { id: '1111111111111111', title: '测试文章', description: '测试共享文章协议。', date: null, topic: 'engineering', tags: [] };

test('generated draft templates load without a summary, remain hidden, and require a summary before publication', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-draft-roundtrip-')), dir = path.join(root, 'content/posts'); fs.mkdirSync(dir, { recursive: true });
  try {
    const draft = articleDraft({ title: '草稿往返验证', topic: 'engineering', collection: 'docs', id: 'abcdef0123456789', date: '2026-11-02' });
    const file = path.join(dir, draft.filename); fs.writeFileSync(file, draft.content);
    assert.equal(loadArticles(root).length, 0);
    assert.equal(loadArticles(root, { includeDrafts: true })[0].description, '');
    fs.writeFileSync(file, draft.content.replace('draft: true', 'draft: false'));
    assert.throws(() => loadArticles(root), /description/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('shared article model reads isolated HTML, excludes drafts and rejects duplicate IDs or invented publication', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-store-')), dir = path.join(root, 'content/posts'); fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(path.join(dir, '测试文章.html'), '<h1>测试文章</h1><p>独立 HTML 内容。</p>'); fs.writeFileSync(path.join(dir, '测试文章.meta.json'), JSON.stringify(meta));
    assert.equal(loadArticles(root)[0].kind, 'html');
    fs.writeFileSync(path.join(dir, '测试文章.meta.json'), JSON.stringify({ ...meta, draft: true })); assert.equal(loadArticles(root).length, 0); assert.equal(loadArticles(root, { includeDrafts: true }).length, 1);
    assert.throws(() => validateArticleMetadata({ ...meta, publication: { status: 'published' } }));
    assert.throws(() => validateArticleMetadata({ ...meta, date: '2026-02-30' }));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('article references identify explicit encoded filename and route links, not common tags or images', () => {
  const posts = [{ ...meta, file: '测试文章.md', body: '[下一篇](另一篇%20文章.md)\n![图片](另一篇%20文章.md)', kind: 'markdown' }, { ...meta, id: '2222222222222222', title: '另一篇 文章', file: '另一篇 文章.md', body: '[前文](/blog/1111111111111111)' }];
  const refs = articleReferences(posts); assert.equal(refs.length, 2); assert.equal(refs[0].evidence.line, 1); assert.equal(refs[0].target, posts[1].id);
});
