import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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


test('opposite directions require separate recipient reviews and preserve independent target edits', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-bidirectional-'));
  const companyRoot = path.join(root, 'company'), publicRoot = path.join(root, 'public');
  for (const dir of [companyRoot, publicRoot]) fs.mkdirSync(path.join(dir, 'content/posts'), { recursive: true });
  const companyFile = path.join(companyRoot, 'content/posts/同步测试.md');
  const publicFile = path.join(publicRoot, 'content/posts/同步测试.md');
  const companyText = article('公司读者版本：包含只适用于该读者的上下文。');
  const publicText = article('公开读者版本：保留可公开的技术判断。');
  fs.writeFileSync(companyFile, companyText);
  const ledger = { version: 1, reviews: [] };
  const forward = { sourceRoot: companyRoot, targetRoot: publicRoot, audience: 'public', ledger };
  try {
    const first = articleSyncPlan(forward)[0];
    const review = { sourceId: first.id, sourceSha256: first.sourceSha256, audience: 'public', decision: 'redacted', reason: '已独立审核公开读者版本及其资源。', reviewer: 'test-fixture', reviewedAt: '2026-11-07T00:00:00Z', targetText: publicText, targetSha256: digest(publicText) };
    ledger.reviews.push(review);
    assert.equal(articleSyncPlan(forward)[0].state, 'ready');
    fs.writeFileSync(publicFile, publicText);
    const reverse = { sourceRoot: publicRoot, targetRoot: companyRoot, audience: 'company', ledger };
    const pending = articleSyncPlan(reverse)[0];
    assert.equal(pending.audience, 'company');
    assert.equal(pending.state, 'review-required', 'the public recipient approval cannot authorize a company recipient');
    const companyUpdate = article('公司读者重新审核版本：只包含本次核准的技术判断。');
    ledger.reviews.push({ sourceId: pending.id, sourceSha256: pending.sourceSha256, audience: 'company', decision: 'redacted', reason: '已针对公司读者重新审核正文、来源及个人敏感信息。', reviewer: 'test-fixture', reviewedAt: '2026-11-07T01:00:00Z', targetText: companyUpdate, targetSha256: digest(companyUpdate) });
    assert.equal(articleSyncPlan(reverse)[0].state, 'target-conflict');
    assert.equal(fs.readFileSync(companyFile, 'utf8'), companyText, 'the planner does not overwrite the existing recipient version');
    ledger.reviews[1].previousTargetSha256 = digest(companyText);
    const ready = articleSyncPlan(reverse)[0];
    assert.equal(ready.state, 'ready');
    assert.equal(ready.targetText, companyUpdate, 'the planner uses only the independently reviewed recipient text');
    assert.equal(articleSyncPlan(forward)[0].audience, 'public');
    fs.appendFileSync(companyFile, '公司站独立修订。\n');
    assert.equal(articleSyncPlan(reverse)[0].state, 'target-conflict');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('company-bound CLI produces a reviewed preview, with private source content kept out of default output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-company-cli-'));
  const sourceRoot = path.join(root, 'source'), targetRoot = path.join(root, 'target');
  for (const dir of [sourceRoot, targetRoot]) fs.mkdirSync(path.join(dir, 'content/posts'), { recursive: true });
  const source = path.join(sourceRoot, 'content/posts/同步测试.md'), target = path.join(targetRoot, 'content/posts/同步测试.md');
  const sourceText = article('我正在准备面试。公开发布也不代表获准向公司传播。');
  fs.writeFileSync(source, sourceText);
  const ledger = { version: 1, reviews: [] }, options = { sourceRoot, targetRoot, ledger, audience: 'company' };
  const ledgerFile = path.join(root, 'private-review.json');
  const cli = fileURLToPath(new URL('./article-sync.mjs', import.meta.url));
  const run = extra => spawnSync(process.execPath, [cli, '--source', sourceRoot, '--target', targetRoot, '--ledger', ledgerFile, '--audience', 'company', ...extra], { encoding: 'utf8' });
  try {
    const first = articleSyncPlan(options)[0];
    const targetText = article('面向公司读者审核后的技术方法。');
    ledger.reviews.push({ sourceId: first.id, sourceSha256: first.sourceSha256, audience: 'company', decision: 'redacted', reason: '逐项排除不适合公司读者的个人敏感信息；公开状态未作为传播授权。', reviewer: 'test-fixture', reviewedAt: '2026-11-07T00:00:00Z', targetText, targetSha256: digest(targetText) });
    fs.writeFileSync(ledgerFile, JSON.stringify(ledger));
    const result = run([]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { audience: 'company', counts: { ready: 1 } });
    assert.doesNotMatch(result.stdout, /面试|sourceSha256|同步测试|private-review/);
    const patch = run(['--patch']);
    assert.equal(patch.status, 0, patch.stderr);
    assert.match(patch.stdout, /面向公司读者审核后的技术方法/);
    assert.doesNotMatch(patch.stdout, /面试|公开发布也不代表/);
    assert.equal(fs.existsSync(target), false, 'preview must not write the recipient');
    assert.equal(fs.readFileSync(source, 'utf8'), sourceText, 'preview must not modify the source');
    fs.writeFileSync(target, article('接收方独立版本。'));
    const conflict = run([]);
    assert.equal(conflict.status, 1);
    assert.deepEqual(JSON.parse(conflict.stdout), { audience: 'company', counts: { 'target-conflict': 1 } });
    for (const repository of [sourceRoot, targetRoot]) {
      const ledgerInsideRepository = path.join(repository, 'private-review.json');
      fs.writeFileSync(ledgerInsideRepository, JSON.stringify(ledger));
      const rejected = spawnSync(process.execPath, [cli, '--source', sourceRoot, '--target', targetRoot, '--ledger', ledgerInsideRepository, '--audience', 'company'], { encoding: 'utf8' });
      assert.notEqual(rejected.status, 0);
      assert.match(rejected.stderr, /Review ledger must be outside both repositories/);
      assert.equal(rejected.stdout, '');
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});


test('public-bound CLI requires its own reviewed text and rejects invalid recipient audiences', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'article-public-cli-'));
  const sourceRoot = path.join(root, 'source'), targetRoot = path.join(root, 'target');
  for (const dir of [sourceRoot, targetRoot]) fs.mkdirSync(path.join(dir, 'content/posts'), { recursive: true });
  const source = path.join(sourceRoot, 'content/posts/同步测试.md');
  fs.writeFileSync(source, article('公司来源内容。'));
  const ledger = { version: 1, reviews: [] }, options = { sourceRoot, targetRoot, ledger, audience: 'public' };
  const ledgerFile = path.join(root, 'private-review.json');
  const cli = fileURLToPath(new URL('./article-sync.mjs', import.meta.url));
  const run = audience => spawnSync(process.execPath, [cli, '--source', sourceRoot, '--target', targetRoot, '--ledger', ledgerFile, '--audience', audience], { encoding: 'utf8' });
  try {
    const first = articleSyncPlan(options)[0], targetText = article('公开读者已审核版本。');
    ledger.reviews.push({ sourceId: first.id, sourceSha256: first.sourceSha256, audience: 'company', decision: 'approved', reason: '此审批仅授权公司读者。', reviewer: 'test-fixture', reviewedAt: '2026-11-07T00:00:00Z', targetText, targetSha256: digest(targetText) });
    fs.writeFileSync(ledgerFile, JSON.stringify(ledger));
    const pending = run('public');
    assert.equal(pending.status, 0, pending.stderr);
    assert.deepEqual(JSON.parse(pending.stdout), { audience: 'public', counts: { 'review-required': 1 } });
    ledger.reviews.push({ ...ledger.reviews[0], audience: 'public', reason: '本次另外审核了公开读者、元数据和资源。' });
    fs.writeFileSync(ledgerFile, JSON.stringify(ledger));
    const approved = run('public');
    assert.equal(approved.status, 0, approved.stderr);
    assert.deepEqual(JSON.parse(approved.stdout), { audience: 'public', counts: { ready: 1 } });
    assert.equal(fs.readdirSync(path.join(targetRoot, 'content/posts')).length, 0);
    const invalid = run('private');
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /receiving audience \(public\|company\)/);
    assert.equal(invalid.stdout, '');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
