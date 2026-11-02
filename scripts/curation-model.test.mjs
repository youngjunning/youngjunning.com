import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResearch, validateExcerpts } from '../lib/model.mjs';

const research = (changes = {}) => ({
  id: '1234567890abcdef', title: '验证问题', question: '如何验证？', context: '当前尚未验证', reason: '值得回看',
  nextStep: '运行最小实验', nextStepSource: 'suggested', status: 'todo', blocker: null, result: null,
  relatedFavoriteIds: [], createdAt: '2026-11-02', updatedAt: '2026-11-02', visibility: 'shared',
  sources: [{ label: '本人公开陈述，2026-11-02' }], ...changes,
});
const excerpt = (changes = {}) => ({
  id: 'abcdef1234567890', title: '一次判断', context: '公开讨论背景', reason: '值得重读',
  selection: 'explicit', format: 'verbatim', messages: [{ role: 'user', text: '先验证。' }],
  source: { label: '公开原会话', url: 'https://example.com/conversation' },
  date: '2026-11-02', savedAt: '2026-11-02', visibility: 'shared', ...changes,
});

test('public research rejects private entries and local paths', () => {
  assert.equal(validateResearch({ version: 1, items: [research()] }, new Set()).length, 1);
  assert.throws(() => validateResearch({ version: 1, items: [research({ visibility: 'private' })] }, new Set()), /private research/);
  assert.throws(() => validateResearch({ version: 1, items: [research({ context: '/Users/me/private' })] }, new Set()), /Public content/);
});

test('public excerpts need explicit selection and a public source', () => {
  assert.equal(validateExcerpts({ version: 1, items: [excerpt()] }).length, 1);
  assert.throws(() => validateExcerpts({ version: 1, items: [excerpt({ selection: 'discovered' })] }), /explicit selection/);
  assert.throws(() => validateExcerpts({ version: 1, items: [excerpt({ source: { label: 'private' } })] }), /source URL/);
});
