import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveTwinEvidence, historicalCutoff } from '../lib/twin-retrieval.mjs';
import { buildConversationKnowledge } from '../lib/twin-knowledge.mjs';

const ask = content => [{ role: 'user', content }];
const source = (id, text, extras = {}) => ({ id, title: id, kind: 'blog', text, searchTitle: id, url: '/blog/' + id, rawUrl: '/api/blog/' + id, date: null, sha256: text, relatedIds: [], tags: [], ...extras });

test('截止日期只识别明确时间约束，非法日期不制造历史事实', () => {
  assert.equal(historicalCutoff(ask('截至2026年10月29日，已决定吗？')), '2026-10-29');
  assert.equal(historicalCutoff(ask('as of 2026-10-29')), '2026-10-29');
  assert.equal(historicalCutoff(ask('截至2026年13月29日')), null);
  assert.equal(historicalCutoff(ask('这篇2026-10-29的文章讲什么？')), null);
  assert.equal(historicalCutoff([...ask('截至2026-10-29'), ...ask('那现在呢？')]), null);
  assert.equal(historicalCutoff([...ask('截至2026-10-29'), ...ask('具体说说当时的选择')]), '2026-10-29');
});

test('只把可见端点的显式关系写入索引，不制造“改变了判断”关系', () => {
  const record = { id: 'record-a', kind: 'change', title: '边界变化', visibility: 'shared', date: '2026-10-29', recordedAt: '2026-10-29', text: '独立记录', context: '', before: '依附文章', after: '独立记录', reason: '保存没有文章的判断', subjectId: 'private-b', projectId: null, relatedIds: ['private-b'], sources: [{ kind: 'article', articleId: 'article-a' }], articleId: 'article-a' };
  const doc = { id: 'article-a', title: '数字分身边界', date: null, summary: '', tags: ['数字分身'], url: '/blog/article-a', rawUrl: '/api/blog/article-a', sha256: 'a', rawContent: '个人判断应有独立记录，也应保留变化前后的明确证据，不能仅靠文章差异猜测本人改变了观点。' };
  const index = buildConversationKnowledge([record, { ...record, id: 'private-b', visibility: 'private' }], [doc], {});
  assert.deepEqual(index.relationships, [{ from: '/records/record-a', to: doc.url, type: 'record-article' }]);
  assert.ok(!JSON.stringify(index).includes('/records/private-b'));
  assert.ok(!index.relationships.some(link => link.type === 'revises'));
});

test('本地文件检索：中文、英文、跨文章、变化关联、历史约束和资料撤回', { timeout: 60000 }, async t => {
  const old = source('old', 'AnyUse initially requires comparing implementation routes.', { kind: 'record', recordKind: 'judgment', date: '2026-10-28', recordedAt: '2026-10-28' });
  const changed = source('change', 'AnyUse 明确变化：之前为比较方案，之后选定 Redroid；原因是明确的验证记录。', { kind: 'record', recordKind: 'change', date: '2026-10-30', recordedAt: '2026-10-30' });
  const first = source('network', 'Network Service separates transport responsibility from navigation commit.', { tags: ['Browser'] });
  const second = source('permissions', '系统文件访问需要宿主审核；这条边界和页面提交的职责不同。', { tags: ['Browser'] });
  const zh = source('zh', '数字分身保存个人经历和判断，不能从文章的技术比较推断本人已经改变观点。');
  const decoys = Array.from({ length: 4 }, (_, i) => source('calendar-' + i, '2026年10月29日，录入时间2026-10-29：已经决定采用其他方案；这些记录与当前询问的项目没有关系。', { kind: 'record', recordKind: 'judgment', date: '2026-10-29', recordedAt: '2026-10-29' }));
  const index = { entries: [old, changed, first, second, zh, ...decoys], relationships: [{ from: old.url, to: changed.url, type: 'change-subject' }, { from: first.url, to: second.url, type: 'references' }] };
  await t.test('实际英文索引与图谱能找到未命中关键词的引用文章', async () => {
    const found = await retrieveTwinEvidence(index, ask('Network transport boundary?'));
    assert.ok(found.some(item => item.id === first.id));
    assert.ok(found.some(item => item.id === second.id));
    assert.ok(found.every(item => index.entries.includes(item)));
    assert.ok(!found.some(item => item.kind === 'concept'));
    const followup = await retrieveTwinEvidence(index, [...ask('Network transport boundary?'), { role: 'assistant', content: '这是不作为事实来源的历史回答。' }, ...ask('这个呢？')]);
    assert.ok(followup.some(item => item.id === first.id));
  });
  await t.test('中文原文可检索，相关变化与原判断一起返回', async () => {
    assert.ok((await retrieveTwinEvidence(index, ask('数字分身应该保留什么判断？'))).some(item => item.id === zh.id));
    const found = await retrieveTwinEvidence(index, ask('AnyUse Redroid 后来发生什么变化？'));
    assert.ok(found.some(item => item.id === changed.id));
    assert.ok(found.some(item => item.id === old.id));
  });
  await t.test('截至某日的查询排除未来选择和日期未知的文章', async () => {
    const found = await retrieveTwinEvidence(index, ask('截至2026年10月29日，AnyUse 已选 Redroid 吗？'));
    assert.ok(found.some(item => item.id === old.id));
    assert.ok(found.every(item => item.id === old.id));
    const latest = await retrieveTwinEvidence(index, [...ask('截至2026年10月29日，AnyUse 已选 Redroid 吗？'), { role: 'assistant', content: '当时尚在比较。' }, ...ask('那现在呢？')]);
    assert.ok(latest.some(item => item.id === changed.id));
  });
  await t.test('内容或共享范围变化后重建，撤回资料不再返回', async () => {
    const withdrawn = { ...index, entries: [first, second, zh], relationships: index.relationships.slice(1) };
    const found = await retrieveTwinEvidence(withdrawn, ask('AnyUse Redroid'));
    assert.deepEqual(found, []);
    const aborted = new AbortController(); aborted.abort();
    assert.throws(() => retrieveTwinEvidence(withdrawn, ask('Network'), { signal: aborted.signal }));
  });
});
