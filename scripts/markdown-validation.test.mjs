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
  const filename = 'content/posts/从 AI 工程到产品技术专家：我的三年职业发展规划.md';
  const { content } = matter(fs.readFileSync(filename, 'utf8'));
  assert.deepEqual(markdownEmphasisIssues(content), []);
  const strong = [];
  function visit(node) {
    if (node.type === 'strong') strong.push(node.children.map(child => child.value || '').join(''));
    node.children?.forEach(visit);
  }
  visit(unified().use(remarkParse).use(remarkGfm).parse(content));
  for (const label of ['第一，解决复杂系统问题', '第二，交付真实价值', '第三，承担模糊问题', '第四，放大个人影响', '技术深度决定能实现什么，产品判断决定什么值得实现']) {
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
