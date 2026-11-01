import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertArticleText } from '../lib/article-validation.mjs';
const hash = text => createHash('sha256').update(text).digest('hex');

test('verbatim public imports preserve tutorial URLs without relaxing other content', () => {
  const body = 'Example: http://localhost:3000';
  const data = { id: 'test', title: 'Example', source: 'https://example.com/source' };
  const raw = 'metadata\n' + body;
  const entry = { ...data, status: 'migrated', importedSha256: hash(raw), bodySha256: hash(body) };
  assert.doesNotThrow(() => assertArticleText(raw, data, body, [entry]));
  assert.throws(() => assertArticleText(raw, data, body, []));
  assert.throws(() => assertArticleText(raw + '\nchanged', data, body, [entry]), /differs/);
  assert.throws(() => assertArticleText(raw, { ...data, source: 'https://example.com/other' }, body, [entry]), /differs/);
});

test('reviewed imports still reject credential-shaped values', () => {
  const body = 'sk-' + 'x'.repeat(30);
  const data = { id: 'test', title: 'Example', source: 'https://example.com/source' };
  const entry = { ...data, status: 'migrated', importedSha256: hash(body), bodySha256: hash(body) };
  assert.throws(() => assertArticleText(body, data, body, [entry]), /credential/);
});

test('legacy npm UUID credentials are rejected even in reviewed examples', () => {
  const body = 'NPM_AUTH_TOKEN=' + [8, 4, 4, 4, 12].map(size => 'a'.repeat(size)).join('-');
  const data = { id: 'test', title: 'Example', source: 'https://example.com/source' };
  const entry = { ...data, status: 'migrated', importedSha256: hash(body), bodySha256: hash(body) };
  assert.throws(() => assertArticleText(body, data, body, [entry]), /credential/);
});
