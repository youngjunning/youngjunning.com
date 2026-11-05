import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { markdownEmphasisIssues } from '../lib/markdown-validation.mjs';

test('rejects punctuation boundaries left literal by CommonMark, including inline children', () => {
  for (const source of [
    '**第一，解决复杂系统问题。**不能只完成局部功能',
    '正文**“重点”**后文',
    '**重点 `API`。**后文',
    '**[重点](https://example.com)。**后文',
    '__重点。__后文',
    '> **重点！**后文',
    '- **重点？**后文',
    '| 标题 |\n| --- |\n| **重点。**后文 |',
  ]) assert.equal(markdownEmphasisIssues(source).length, 1, source);
  assert.deepEqual(markdownEmphasisIssues('正常段落\n\n**重点。**后文'), [{ line: 3, column: 6 }]);
});

test('does not reject parsed emphasis, code, escapes, HTML attributes or link destinations', () => {
  for (const source of [
    '**重点**。后文', '**重点。** 后文', '**重点。**', '“**重点**”后文',
    '***重点***。后文', '**正文 `API`**。后文', '2 ** 3 + 4 ** 5',
    '`**重点。**后文`', '```md\n**重点。**后文\n```', '    **重点。**后文',
    String.raw`\*\*重点。\*\*后文`, String.raw`\**重点。**后文`,
    '[链接](https://example.com/**重点。**后文)', '<a title="**重点。**后文">链接</a>',
    '&#42;&#42;重点。&#42;&#42;后文',
  ]) assert.deepEqual(markdownEmphasisIssues(source), [], source);
});

test('the career article renders each repaired bold span with punctuation outside', () => {
  const filename = 'content/posts/AI 工程与产品实践：我的职业发展思考.md';
  const { content } = matter(fs.readFileSync(filename, 'utf8'));
  assert.deepEqual(markdownEmphasisIssues(content), []);
  const strong = [];
  function visit(node) {
    if (node.type === 'strong') strong.push(node.children.map(child => child.value || '').join(''));
    node.children?.forEach(visit);
  }
  visit(unified().use(remarkParse).use(remarkGfm).parse(content));
  for (const label of ['第一，解决复杂系统问题', '第二，理解价值如何产生', '第三，承担模糊问题并稳定交付', '第四，放大个人影响', '能够设计、实现和持续改进生产级 AI 系统']) {
    assert.ok(strong.includes(label), label);
  }
  assert.ok(strong.every(text => !/[。！？：]$/u.test(text)));
});

test('the platform article renders its three previously broken bold passages', () => {
  const filename = 'content/posts/从 Linux 与 Ubuntu 到 Chromium 与 Chrome：理解平台与发行版的边界.md';
  const { content } = matter(fs.readFileSync(filename, 'utf8'));
  assert.deepEqual(markdownEmphasisIssues(content), []);
  const strong = [];
  function visit(node) {
    if (node.type === 'strong') strong.push(node.children.map(child => child.value || '').join(''));
    node.children?.forEach(visit);
  }
  visit(unified().use(remarkParse).use(remarkGfm).parse(content));
  for (const label of ['同一上游代码不等于同一产品', '浏览器产品的分界比“fork 了多少代码”更重要', '不要认为共享底座就应该统一版本和统一发版']) {
    assert.ok(strong.includes(label), label);
  }
  assert.ok(strong.every(text => !/[。！？：]$/u.test(text)));
});
