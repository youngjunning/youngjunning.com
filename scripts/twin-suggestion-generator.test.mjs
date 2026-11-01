import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSuggestionSources, validateSuggestionCandidates } from '../lib/twin-suggestion-generator.mjs';
const source = {
  id: 'record-unseen-topic', title: '雾桥任务队列', kind: 'record', recordKind: 'judgment', date: '2026-11-01',
  text: '雾桥任务队列先写入可回放事件，再确认执行成功，避免进程中断后重复提交。早期只用内存状态，重启后无法确认订单是否已经提交。',
  searchTitle: '雾桥任务队列 判断', url: '/records/unseen', sha256: 'fixture-sha', relatedIds: [],
};
const knowledge = entries => ({ version: 1, revision: 'same-revision', generatedAt: '2026-11-01', entries });
const index = knowledge([source]);
const candidate = {
  question: '雾桥任务队列为什么先写入可回放事件再确认成功，这对中断后的重复提交意味着什么？', angle: 'tradeoff',
  answerOutline: '先记录可回放事件能够保留执行证据，避免进程中断后因内存状态丢失而重复提交。',
  evidence: [{ sourceId: source.id, quote: '雾桥任务队列先写入可回放事件，再确认执行成功，避免进程中断后重复提交。' }],
};

test('工程机制可生成深度题，代码不支撑本人偏好或判断变化问题', () => {
  const code = { ...source, id: 'code-evidence', kind: 'code', recordKind: undefined, date: null, reviewedEngineering: true, personalJudgment: false };
  const engineering = { ...candidate, evidence: [{ ...candidate.evidence[0], sourceId: code.id }] };
  const options = { skipRetrieval: true };
  assert.equal(validateSuggestionCandidates({ questions: [engineering] }, [code], knowledge([code]), 180, options).length, 1);
  for (const unsafe of [
    { ...engineering, question: '雾桥任务队列中你为什么选择可回放事件，这反映了怎样的个人架构偏好？' },
    { ...engineering, angle: 'evolution' },
    { ...engineering, answerOutline: '我偏好可回放事件，因为这符合个人的架构理念和长期技术选择。' },
  ]) assert.equal(validateSuggestionCandidates({ questions: [unsafe] }, [code], knowledge([code]), 180, options).length, 0);
});
const provider = output => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] });

test('跨文章问题需要关系边和双方原文，不能把主题相同当作本人立场变化', () => {
  const second = { ...source, id: 'blog-other', kind: 'blog', recordKind: undefined, title: '事件回放校验', url: '/blog/other', text: '事件回放只恢复已确认的事件，不能用执行成功的计划替代实际提交证据，因此需要独立确认回执。' };
  const cross = { ...candidate, evidence: [...candidate.evidence, { sourceId: second.id, quote: second.text }] };
  const linked = { ...knowledge([source, second]), relationships: [{ from: source.url, to: second.url, type: 'record-article' }] };
  const options = { crossDocument: true, skipRetrieval: true };
  assert.equal(validateSuggestionCandidates({ questions: [cross] }, linked.entries, linked, 180, options).length, 1);
  assert.equal(validateSuggestionCandidates({ questions: [cross] }, linked.entries, { ...linked, relationships: [] }, 180, options).length, 0);
  assert.equal(validateSuggestionCandidates({ questions: [{ ...cross, angle: 'evolution' }] }, linked.entries, linked, 180, options).length, 0);
});

test('拒绝伪造摘录、来源、浅显题和当前问答检索找不回的证据', () => {
  const validate = (item, corpus = index) => validateSuggestionCandidates({ questions: [item] }, [source], corpus);
  assert.equal(validate(candidate).length, 1);
  assert.equal(validate({ ...candidate, evidence: [{ sourceId: source.id, quote: '原文中不存在的实验结果证明了该机制能达到百分之百成功。' }] }).length, 0);
  assert.equal(validate({ ...candidate, evidence: [{ ...candidate.evidence[0], sourceId: 'hidden-source' }] }).length, 0);
  assert.equal(validate({ ...candidate, question: '雾桥任务队列这篇文章主要讲什么，介绍一下核心内容是什么？' }).length, 0);
  assert.equal(validate(candidate, knowledge([])).length, 0);
  assert.equal(validateSuggestionCandidates({ questions: [candidate, candidate] }, [source], index).length, 1);
});

test('同题不能把不同来源拼成未经证实的矛盾', () => {
  const other = { ...source, id: 'record-other', url: '/records/other' };
  const combined = { ...candidate, evidence: [...candidate.evidence, { sourceId: other.id, quote: candidate.evidence[0].quote }] };
  assert.equal(validateSuggestionCandidates({ questions: [combined] }, [source, other], knowledge([source, other])).length, 0);
});
