import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { articleSyncPlan, articleSyncPatch } from '../lib/article-sync.mjs';
const digest = text => createHash('sha256').update(text).digest('hex');
const article = body => '---\nid: "1111111111111111"\ntitle: "同步测试"\ndescription: "测试版本与受众。"\ndate: null\ntopic: engineering\ntags: []\n---\n' + body + '\n';
test('only reviewed versions produce patches, and resources, source changes and target edits invalidate approval', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-sync-')), sourceRoot = path.join(root, 'source'), targetRoot = path.join(root, 'target');
  for (const dir of [sourceRoot, targetRoot]) fs.mkdirSync(path.join(dir, 'content/posts'), { recursive: true });
  const source = path.join(sourceRoot, 'content/posts/同步测试.md'), target = path.join(targetRoot, 'content/posts/同步测试.md');
  fs.writeFileSync(source, article('原始技术内容。'));
  const ledger = { version: 1, reviews: [] }, options = { sourceRoot, targetRoot, ledger, audience: 'public' };
  try {
    const initial = articleSyncPlan(options)[0]; assert.equal(initial.state, 'review-required');
    const targetText = article('公开技术内容。');
    const review = { sourceId: initial.id, sourceSha256: initial.sourceSha256, audience: 'public', decision: 'redacted', reason: '已按接收方核对正文、元数据和资源。', reviewer: 'test-fixture', reviewedAt: '2026-11-01T00:00:00Z', targetText, targetSha256: digest(targetText), resources: [] };
    ledger.reviews.push(review);
    assert.equal(articleSyncPlan(options)[0].state, 'ready');
    assert.match(articleSyncPatch(articleSyncPlan(options), targetRoot), /\*\*\* Add File:/);
    assert.equal(fs.existsSync(target), false);
    fs.writeFileSync(target, targetText); assert.equal(articleSyncPlan(options)[0].state, 'synced');
    fs.appendFileSync(target, '目标独立修订。\n'); assert.equal(articleSyncPlan(options)[0].state, 'target-conflict');
    review.previousTargetSha256 = digest(fs.readFileSync(target)); assert.equal(articleSyncPlan(options)[0].state, 'ready');
    fs.writeFileSync(path.join(sourceRoot, 'resource.txt'), 'original'); review.resources = [{ file: 'resource.txt', sha256: digest('original') }];
    fs.writeFileSync(path.join(sourceRoot, 'resource.txt'), 'changed'); assert.equal(articleSyncPlan(options)[0].state, 'resource-review-stale');
    fs.appendFileSync(source, '源稿修订。\n'); assert.equal(articleSyncPlan(options)[0].state, 'review-stale');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('receiving audience and reviewed target are mandatory even when a ledger claims approval', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-audience-')), sourceRoot = path.join(root, 'source'), targetRoot = path.join(root, 'target');
  for (const dir of [sourceRoot, targetRoot]) fs.mkdirSync(path.join(dir, 'content/posts'), { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, 'content/posts/同步测试.md'), article('原始内容。'));
  const ledger = { version: 1, reviews: [] }, options = { sourceRoot, targetRoot, ledger, audience: 'company' };
  try {
    const first = articleSyncPlan(options)[0], targetText = article('我正在准备面试。');
    ledger.reviews.push({ sourceId: first.id, sourceSha256: first.sourceSha256, audience: 'company', decision: 'approved', reason: '测试不合格的审核。', reviewer: 'test-fixture', reviewedAt: '2026-11-01T00:00:00Z', targetText, targetSha256: digest(targetText) });
    assert.throws(() => articleSyncPlan(options), /personal sensitive/);
    ledger.reviews[0].decision = 'skipped'; assert.equal(articleSyncPlan(options)[0].state, 'skipped');
    assert.throws(() => articleSyncPlan({ ...options, audience: undefined }), /audience/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('HTML pairs, image snapshots, independent metadata edits, renames and withdrawals remain reviewable', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-html-')), sourceRoot = path.join(root, 'source'), targetRoot = path.join(root, 'target');
  for (const dir of [sourceRoot, targetRoot]) fs.mkdirSync(path.join(dir, 'content/posts'), { recursive: true });
  const source = path.join(sourceRoot, 'content/posts/同步测试.md'); fs.writeFileSync(source, article('原始技术内容。'));
  const asset = path.join(targetRoot, 'diagram.svg'); fs.writeFileSync(asset, '<svg/>');
  const ledger = { version: 1, scopeIds: ['1111111111111111'], reviews: [] }, options = { sourceRoot, targetRoot, ledger, audience: 'public' };
  try {
    const first = articleSyncPlan(options)[0], targetText = '<h1>同步测试</h1><img src="/diagram.svg">\n';
    const metadata = { id: first.id, title: '同步测试', description: '公开版本', date: null, topic: 'engineering', tags: [] };
    const review = { sourceId: first.id, sourceSha256: first.sourceSha256, audience: 'public', decision: 'redacted', reason: 'Fixture review', reviewer: 'test-fixture', reviewedAt: '2026-11-01T00:00:00Z', targetKind: 'html', targetText, targetSha256: digest(targetText), targetMetadataText: JSON.stringify(metadata) + '\n', targetResources: [{ file: 'diagram.svg', sha256: digest('<svg/>'), url: '/diagram.svg' }] };
    review.targetMetadataSha256 = digest(review.targetMetadataText); ledger.reviews.push(review);
    const plan = articleSyncPlan(options); assert.equal(plan[0].state, 'ready');
    assert.match(articleSyncPatch(plan, targetRoot), /同步测试\.html/); assert.match(articleSyncPatch(plan, targetRoot), /同步测试\.meta\.json/);
    const html = path.join(targetRoot, 'content/posts/同步测试.html'), meta = path.join(targetRoot, 'content/posts/同步测试.meta.json');
    fs.writeFileSync(html, targetText); fs.writeFileSync(meta, review.targetMetadataText);
    assert.equal(articleSyncPlan(options)[0].state, 'synced');
    fs.writeFileSync(meta, JSON.stringify({ ...metadata, description: '目标独立修订' }) + '\n');
    assert.equal(articleSyncPlan(options)[0].state, 'target-conflict');
    review.previousTargetSha256 = digest(targetText); review.previousTargetMetadataSha256 = digest(fs.readFileSync(meta));
    review.targetMetadataText = JSON.stringify({ ...metadata, title: '更名后的同步测试' }) + '\n'; review.targetMetadataSha256 = digest(review.targetMetadataText);
    const rename = articleSyncPatch(articleSyncPlan(options), targetRoot);
    assert.match(rename, /Delete File: .*同步测试\.html/); assert.match(rename, /Delete File: .*同步测试\.meta\.json/); assert.match(rename, /Add File: .*更名后的同步测试\.meta\.json/);
    fs.writeFileSync(asset, '<svg>changed</svg>'); assert.equal(articleSyncPlan(options)[0].state, 'target-resource-review-stale');
    fs.unlinkSync(source); assert.equal(articleSyncPlan(options)[0].state, 'source-withdrawn');
    assert.doesNotMatch(articleSyncPatch(articleSyncPlan(options), targetRoot), /Delete File/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
