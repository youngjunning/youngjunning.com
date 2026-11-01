import test from 'node:test';
import assert from 'node:assert/strict';
import { embeddedArticleResources } from '../lib/article-resources.mjs';
test('resource review follows rendered Markdown, references and HTML rather than illustrative code', () => {
  const body = 'An inline `url("example.png")` and `<img src="example2.png">` are examples.\n\n```html\n<img src="example3.png">\n```\n\n![实际配图][diagram]\n\n[diagram]: /media/real.png "配图"\n\n<img src="/media/other.png"><style>body{background:url("/media/background.png")}</style>';
  assert.deepEqual(embeddedArticleResources(body).sort(), ['/media/background.png', '/media/other.png', '/media/real.png']);
  assert.deepEqual(embeddedArticleResources('<script src="/media/script.js"></script><video poster="/media/poster.png" src="/media/clip.mp4"></video>', 'html').sort(), ['/media/clip.mp4', '/media/poster.png', '/media/script.js']);
});
