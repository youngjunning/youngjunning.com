import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationKnowledge } from '../lib/twin-knowledge.mjs';
import { retrieveTwinEvidence, knowledgeFingerprint } from '../lib/twin-retrieval.mjs';
import { validateGroundedReply } from '../lib/twin-chat.mjs';
import { correctionContext } from '../lib/conversation-feedback.mjs';

const note = { id: '1111111111111111', kind: 'note', type: 'method', title: '业务调研合作方法', summary: '先观察实际运营流程', reason: '回看方法', subjects: ['business'], tags: ['业务调研'], attribution: 'ai', selection: 'discovered', visibility: 'shared', savedAt: '2026-11-07', url: null, sources: [{ label: '资料整理' }], note: { body: '讨论合作之前先观察实际运营流程，再核对当前问题。', date: null, recordedAt: '2026-11-07' } };
const snapshot = { generatedAt: '2026-11-07', revision: 'fixture' };
const build = favorites => buildConversationKnowledge([], [], snapshot, [], { favorites });

test('笔记正文可检索，最小笔记保留归属及共享边界，来源能读取单条', () => {
  const index = build([note, { ...note, id: '2222222222222222', visibility: 'private', title: 'PRIVATE_NOTE' }]);
  assert.equal(index.entries.length, 1);
  assert.ok(!JSON.stringify(index).includes('PRIVATE_NOTE'));
  const found = retrieveTwinEvidence(index, [{ role: 'user', content: '找业务调研合作方法' }]);
  assert.equal(found[0].kind, 'note');
  assert.equal(found[0].attribution, 'ai');
  assert.equal(found[0].url, '/favorites#' + note.id);
  assert.equal(found[0].rawUrl, '/api/favorites/' + note.id);
  assert.ok(found[0].text.includes(note.note.body));
  const code = { ...index.entries[0], id: 'code-unrelated', kind: 'code', title: '业务方法实现', searchTitle: '业务方法实现', url: '/code/unrelated', codeMeta: { repository: 'other/project', symbolName: 'handleRequest', qualified: 'other::handleRequest', edges: [] } };
  assert.ok(retrieveTwinEvidence({ ...index, entries: [...index.entries, code] }, [{ role: 'user', content: '业务调研方法怎么理解' }]).every(entry => entry.kind !== 'code'));
});

test('笔记仅支持内容解释，不单独支撑本人判断；纠正与撤回改变快照', () => {
  const index = build([note]);
  const id = index.entries[0].id;
  const answer = text => ({ insufficient: false, paragraphs: [{ text, sourceIds: [id] }] });
  assert.throws(() => validateGroundedReply(answer('我认为合作必须从运营调研开始。'), index.entries, index), /本人立场/);
  const reply = validateGroundedReply(answer('这则 AI 整理的方法笔记建议先观察运营流程。'), index.entries, index);
  assert.equal(reply.paragraphs[0].claimType, 'reference');
  assert.equal(reply.sources[0].attribution, 'ai');
  const corrected = build([{ ...note, note: { ...note.note, body: '已纠正方法的适用条件。' } }]);
  assert.notEqual(knowledgeFingerprint(index), knowledgeFingerprint(corrected));
  const removed = build([]);
  assert.deepEqual(retrieveTwinEvidence(removed, [{ role: 'user', content: '业务调研' }]), []);
  assert.throws(() => validateGroundedReply(answer('旧回答'), removed.entries, removed), /引用/);
});

test('资源摘要和实际使用证据分开，不能据收藏推断全部采用', () => {
  const resource = { ...note, kind: 'resource', type: 'tool', note: undefined, attribution: 'source', url: 'https://example.test/tool', usages: [{ project: 'A', projectUrl: 'https://example.test/a', stage: 'trial', purpose: '局部试用', evidence: '原型依赖' }] };
  const [entry] = build([resource]).entries;
  assert.ok(entry.text.includes('不能声称已读取外部全文'));
  assert.ok(entry.text.includes('A · trial'));
  assert.equal(entry.personalJudgment, false);
});

test('纠错导出只包含当前问题、回答与来源身份，不自动写回或导出全会话', () => {
  const data = correctionContext('当前问题', { paragraphs: [{ text: '回答', sourceIds: ['a'] }], sources: [{ id: 'a', kind: 'note', title: '笔记', url: '/favorites#a', sha256: 'hash', attribution: 'ai', unexpectedPrivateField: 'not included' }], snapshot });
  assert.equal(data.correction, '');
  assert.ok(!JSON.stringify(data).includes('not included'));
  assert.equal(data.sources[0].sha256, 'hash');
});
