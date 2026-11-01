import test from 'node:test';
import assert from 'node:assert/strict';
import {articleOutline} from '../lib/article-outline.mjs';
test('reader outline matches Unicode, duplicate, HTML and sanitized anchors while ignoring code examples',()=>{
  const headings=articleOutline('## 中文与 `API`\n\n## 中文与 `API`\n\n<h3 id="legacy">历史标题</h3>\n\n```md\n## 示例里的标题\n```');
  assert.deepEqual(headings.map(h=>h.id),['user-content-中文与-api','user-content-中文与-api-1','user-content-legacy']);
  assert.equal(headings[0].label,'中文与 API');assert.equal(headings[2].level,3);
});
