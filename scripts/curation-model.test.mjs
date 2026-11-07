import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareResearch, prepareExcerpts } from '../lib/curation-model.mjs';

const research = (changes = {}) => ({
  id: '1234567890abcdef', title: '验证问题', question: '如何验证？', context: '当前尚未验证', reason: '值得回看',
  nextStep: '运行一个最小实验', nextStepSource: 'suggested', status: 'todo', blocker: null, result: null,
  relatedFavoriteIds: [], createdAt: '2026-11-02', updatedAt: '2026-11-02', visibility: 'shared',
  sources: [{ label: '本人提出，2026-11-02' }], ...changes,
});
const excerpt = (changes = {}) => ({
  id: 'abcdef1234567890', title: '一次判断', context: '讨论背景', reason: '值得重读',
  selection: 'explicit', format: 'verbatim', messages: [{ role: 'user', text: '先验证。' }, { role: 'assistant', text: '可先做最小实验。' }],
  source: { label: '原会话' }, date: '2026-11-02', savedAt: '2026-11-02', visibility: 'shared', ...changes,
});

test('research requires evidence and real completion; private entries stay out of the snapshot', () => {
  const result = prepareResearch({ version: 1, items: [research(), research({ id: '2234567890abcdef', visibility: 'private' })] });
  assert.equal(result.items.length, 1);
  assert.throws(() => prepareResearch({ version: 1, items: [research({ status: 'completed' })] }), /result/);
  assert.throws(() => prepareResearch({ version: 1, items: [research({ status: 'paused' })] }), /blocker/);
  assert.throws(() => prepareResearch({ version: 1, items: [research({ relatedFavoriteIds: ['2234567890abcdef'] })] }), /related favorite/);
});

test('excerpts keep attribution and only expose shared entries', () => {
  assert.equal(prepareExcerpts({ version: 1, items: [excerpt(), excerpt({ id: '2234567890abcdef', visibility: 'private' })] }).items.length, 1);
  assert.throws(() => prepareExcerpts({ version: 1, items: [excerpt({ messages: [{ role: 'system', text: 'hidden' }] })] }), /message/);
  assert.throws(() => prepareExcerpts({ version: 1, items: [excerpt({ source: { label: '' } })] }), /source label/);
});

test('shared research does not disclose private favorite identities; private source links remain valid', () => {
  const id = '2234567890abcdef';
  const all = new Set([id]), shared = new Set();
  assert.throws(() => prepareResearch({ version: 1, items: [research({ relatedFavoriteIds: [id] })] }, all, shared), /private favorite/);
  assert.deepEqual(prepareResearch({ version: 1, items: [research({ relatedFavoriteIds: [id], visibility: 'private' })] }, all, shared).items, []);
});
