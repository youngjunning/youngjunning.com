import test from 'node:test';
import assert from 'node:assert/strict';
import { compileWiki, planWiki, projectWiki, validateWikiParagraphs, wikiContext, wikiRelationships } from '../lib/twin-wiki.mjs';
import { retrieveTwinEvidence, knowledgeFingerprint } from '../lib/twin-retrieval.mjs';
import { createConversationHandler } from '../lib/twin-chat.mjs';

const source = (id, text, extra = {}) => ({ id, text, title: id, kind: 'blog', url: '/docs/' + id, rawUrl: '/raw/' + id, sha256: 'hash-' + id, date: '2020-01-01', tags: ['Runtime'], searchTitle: id, relatedIds: [], ...extra });
const first = source('first', 'Explicit permission checks keep file access inside the host authority boundary.');
const second = source('second', 'Transport ownership and navigation commit have separate lifecycle responsibilities.');
const index = { version: 1, entries: [first, second], relationships: [] };
const paragraph = { kind: 'comparison', text: 'Continuity：两份资料分别说明文件权限与页面提交的职责边界，不能据此推断个人稳定偏好。', evidence: [first, second].map(entry => ({ sourceId: entry.id, quote: entry.text })) };
const fakeModel = async (system, data) => data.candidates ? { acceptedIds: data.candidates.map(candidate => candidate.id) } : { paragraphs: [paragraph] };

test('Wiki 生成、独立审核、增量复用与失败降级；模型失败不保留受影响的旧页', async () => {
  let calls = 0;
  const request = (...args) => { calls++; return fakeModel(...args); };
  const artifact = await compileWiki(index, { modelKey: 'fixture', request });
  assert.equal(calls, 2);
  assert.equal(artifact.stats.generated, 1);
  assert.equal(projectWiki(index, artifact).pages.length, 1);
  const reused = await compileWiki(index, { previous: artifact, modelKey: 'fixture', request: () => { throw new Error('must not call'); } });
  assert.equal(reused.stats.reused, 1);
  const changed = { ...index, entries: [{ ...first, sha256: 'new-version' }, second] };
  assert.equal(projectWiki(changed, artifact).pages.length, 0);
  const failed = await compileWiki(changed, { previous: artifact, modelKey: 'fixture', request: () => { throw new Error('offline'); } });
  assert.equal(failed.stats.failed, 1);
  assert.equal(failed.pages.length, 0);
  const rejected = await compileWiki(index, { modelKey: 'fixture', request: async (_, data) => data.candidates ? { acceptedIds: [] } : { paragraphs: [paragraph] } });
  assert.equal(projectWiki(index, rejected).pages.length, 0);
  const invalidReview = await compileWiki(index, { modelKey: 'fixture', request: async (_, data) => data.candidates ? { acceptedIds: ['invented-id'] } : { paragraphs: [paragraph] } });
  assert.equal(invalidReview.stats.failed, 1);
  const partiallyValid = await compileWiki(index, { modelKey: 'fixture', request: async (_, data) => data.candidates ? { acceptedIds: data.candidates.map(candidate => candidate.id) } : { paragraphs: [paragraph, { ...paragraph, kind: 'documented-change' }] } });
  assert.equal(partiallyValid.stats.rejected, 1);
  assert.equal(partiallyValid.pages[0].paragraphs.length, 1);
});

test('来源撤回、分组改变、凭空摘录、个人变化和代码资料不能绕过 Wiki 边界', async () => {
  const artifact = await compileWiki(index, { modelKey: 'fixture', request: fakeModel });
  assert.equal(projectWiki({ ...index, entries: [first] }, artifact).pages.length, 0);
  assert.equal(projectWiki({ ...index, entries: [{ ...first, tags: [] }, second] }, artifact).pages.length, 0);
  assert.throws(() => planWiki({ entries: [{ ...first, kind: 'code' }] }, 'fixture'), /shared record\/blog/);
  assert.throws(() => validateWikiParagraphs([{ ...paragraph, evidence: [{ sourceId: first.id, quote: 'This quotation was invented by the model.' }] }], index.entries), /quotation/);
  assert.throws(() => validateWikiParagraphs([{ ...paragraph, kind: 'documented-change' }], index.entries), /explicit change/);
  assert.throws(() => validateWikiParagraphs([{ ...paragraph, evidence: [{ sourceId: first.id, sha256: 'stale', quote: first.text }] }], index.entries), /version/);
  const spaced = { ...first, text: first.text.replace('file access', 'file\n  access') };
  const canonical = validateWikiParagraphs([paragraph], [spaced, second]);
  assert.equal(canonical[0].evidence[0].quote, spaced.text);
  assert.deepEqual(validateWikiParagraphs(canonical, [spaced, second]), canonical);
  const wiki = projectWiki(index, artifact);
  assert.equal(wikiContext({ ...index, wiki }, [first]).length, 0);
  assert.equal(wikiContext({ ...index, wiki }, index.entries).length, 1);
  assert.deepEqual(wikiContext({ ...index, wiki }, index.entries, { historical: true }), []);
  assert.deepEqual(wikiRelationships({ ...index, wiki }), [{ from: first.url, to: second.url, type: 'wiki-comparison-navigation' }]);
  assert.deepEqual(wikiRelationships({ ...index, entries: [first], wiki }), []);
});

test('本地检索从综合文本找到原文证据，历史查询和撤回不使用当前 Wiki', { timeout: 60000 }, async t => {
  const artifact = await compileWiki(index, { modelKey: 'fixture', request: fakeModel });
  const knowledge = { ...index, wiki: projectWiki(index, artifact) };
  assert.notEqual(knowledgeFingerprint(index), knowledgeFingerprint(knowledge));
  const ask = text => [{ role: 'user', content: text }];
  const found = await retrieveTwinEvidence(knowledge, ask('Continuity'));
  assert.deepEqual(new Set(found.map(entry => entry.id)), new Set(['first', 'second']));
  assert.ok(found.every(entry => index.entries.includes(entry)));
  assert.deepEqual(await retrieveTwinEvidence(knowledge, ask('截至2021年01月01日 Continuity')), []);
  const withdrawn = { ...knowledge, entries: [first] };
  assert.deepEqual(await retrieveTwinEvidence(withdrawn, ask('Continuity')), []);
});

test('聊天读取已准备的综合但引用原文，历史提问不发送当前综合', async () => {
  const artifact = await compileWiki(index, { modelKey: 'fixture', request: fakeModel });
  const knowledge = { ...index, wiki: projectWiki(index, artifact) };
  let body;
  const handler = createConversationHandler({ loadKnowledge: () => knowledge, env: { DEEPSEEK_API_KEY: 'fixture-only' }, retrieve: async () => index.entries, fetcher: async (_, options) => {
    body = JSON.parse(options.body);
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ insufficient: false, paragraphs: [{ text: '资料分别说明两类职责边界。', sourceIds: ['first', 'second'] }] }) } }] });
  } });
  const request = content => new Request('https://fixture.example/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content }] }) });
  const reply = await handler(request('Continuity'));
  assert.equal(reply.status, 200);
  assert.ok(body.messages.some(message => message.content.includes('维护阶段整理')));
  assert.ok((await reply.json()).sources.every(source => ['first', 'second'].includes(source.id)));
  await handler(request('截至2021年01月01日 Continuity'));
  assert.ok(!body.messages.some(message => message.content.includes('维护阶段整理')));
});
