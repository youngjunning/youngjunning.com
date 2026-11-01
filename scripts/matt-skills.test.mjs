import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicText } from '../lib/model.mjs';
const raw = readFileSync(new URL('../content/matt-skills.json', import.meta.url), 'utf8');
const catalog = JSON.parse(raw);
test('Matt catalog preserves upstream inventory and adoption boundaries', () => {
  assert.equal(catalog.skills.length, 40);
  assert.equal(new Set(catalog.skills.map(s => s.name)).size, 40);
  assert.match(catalog.upstreamCommit, /^[a-f0-9]{40}$/);
  assert.deepEqual(catalog.skills.filter(s => s.category === '未引入').map(s => s.name).sort(), ['chief-of-staff', 'pr', 'software-factory']);
  assert.deepEqual(catalog.skills.filter(s => s.category === '历史保留').map(s => s.name), ['resolving-merge-conflicts']);
  for (const s of catalog.skills) assert.equal(s.scope, s.category === '未引入' ? '未安装' : '全局');
});
test('Matt public data accepts only public fields and generalized project types', () => {
  assertPublicText(raw);
  const projectTypes = new Set(['服务端项目', '浏览器项目', '自动化平台前端', 'AI 应用项目', '桌面应用项目']);
  for (const s of catalog.skills) {
    assert.deepEqual(Object.keys(s).sort(), ['category', 'name', 'projects', 'scope', 'sourceUrl', 'summary', 'usage']);
    assert(s.projects.every(p => projectTypes.has(p)));
    assert.match(s.sourceUrl, /^https:\/\/github\.com\/mattpocock\/skills\/blob\/[a-f0-9]{40}\//);
    assert.match(s.usage, /约定不代表实际调用|尚未登记实际调用证据/);
  }
});
