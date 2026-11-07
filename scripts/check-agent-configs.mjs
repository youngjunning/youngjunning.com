import fs from 'node:fs';
import assert from 'node:assert/strict';
import { configHash } from '../lib/agent-configs.mjs';

const base = process.env.AGENT_CONFIG_TEST_ORIGIN;
if (!base) throw new Error('Set AGENT_CONFIG_TEST_ORIGIN to the server being checked');
const store = JSON.parse(fs.readFileSync(new URL('../content/agent-configs.json', import.meta.url), 'utf8'));
const get = (route, options) => fetch(new URL(route, base), { redirect: 'error', signal: AbortSignal.timeout(20000), ...options });
for (const theme of ['classic', 'statechart']) {
  const response = await get('/agent-configs', { headers: { cookie: `zisheng-site-theme=${theme}` } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('AGENTS.md 配置库'));
  assert.ok(html.includes(theme === 'classic' ? 'config-panel' : 'sc-config-disclosure') || (theme === 'statechart' && !store.configs.length && html.includes('尚未收录')));
  if (theme === 'statechart') assert.ok(!html.includes('class="ux agent-configs"'));
}
const catalogResponse = await get('/api/agent-configs');
assert.equal(catalogResponse.status, 200);
const catalog = await catalogResponse.json();
assert.deepEqual(catalog.configs.map(c => c.id), store.configs.map(c => c.id));
for (const entry of store.configs) {
  const response = await get(`/api/agent-configs/${entry.id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), entry);
  for (const revision of entry.revisions) {
    const raw = await get(`/api/agent-configs/${entry.id}?format=markdown&version=${revision.hash}`);
    assert.equal(raw.status, 200);
    assert.match(raw.headers.get('content-disposition'), /attachment/);
    const body = await raw.text();
    assert.equal(body, revision.content);
    assert.equal(configHash(body), revision.hash);
  }
  assert.equal((await get(`/api/agent-configs/${entry.id}?format=markdown&version=missing`)).status, 404);
}
assert.equal((await get('/api/agent-configs/nonexistent')).status, 404);
assert.equal((await get('/api/agent-configs', { method: 'POST', body: '{}' })).status, 405);
console.log(JSON.stringify({ ok: true, configs: store.configs.length, themes: 2, exactDownloads: true, notFound: true, readOnly: true }));
