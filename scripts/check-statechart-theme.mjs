// Exercise the production HTTP entry point; this is not a visual/browser test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { siteProfile } from '../lib/site-profile.mjs';
const origin = process.env.THEME_TEST_ORIGIN || 'http://127.0.0.1:3197';
const catalog = await fetch(origin + '/api/catalog').then(response => response.json());
const recordsData = await fetch(origin + '/api/records').then(response => response.json());
const records = Array.isArray(recordsData) ? recordsData : recordsData.records;
const persona = await fetch(origin + '/api/persona').then(response => response.json());
assert.equal(persona.recordsUrl, '/api/records');
assert.ok(Array.isArray(persona.evidence), 'persona has the evidence contract consumed by the actual reader');
for (const record of records) {
  const detail = await fetch(origin + '/api/records/' + record.id).then(response => response.json());
  assert.deepEqual(detail.record, record, 'record detail and collection snapshots agree');
}
const routes = ['/', '/blog', '/records', '/favorites', '/topics', '/graph', '/chat', '/skills', '/skills/matt', '/okr', '/research', '/excerpts', '/agent', ...(catalog.documents[0] ? [catalog.documents[0].url] : []), ...(records[0] ? [`/records/${records[0].id}`] : [])];
for (const route of routes) {
  for (const theme of ['classic', 'statechart']) {
    const response = await fetch(origin + route, { headers: { Cookie: `zisheng-site-theme=${theme}` } });
    assert.equal(response.status, 200, `${theme} ${route}`);
    const html = await response.text();
    assert.ok(html.includes(`data-theme="${theme}"`), `server preference: ${route}`);
    assert.equal(/class="sc-site"/.test(html), theme === 'statechart', `independent shell: ${route}`);
    assert.equal(/class="[^"]*\bsite-shell\b/.test(html), theme === 'classic', `no duplicate classic tree: ${route}`);
    if (theme === 'statechart') {
      assert.ok(!/class="[^"]*\b(?:u212|u228|u341|u049)\b/.test(html), `no mounted Lucian UI: ${route}`);
      assert.ok(html.includes('主题：'), `theme exit: ${route}`);
    }
  }
  console.log(`PASS ${route}: two independent server-rendered trees`);
}
for (const cookie of ['', 'zisheng-site-theme=unknown', 'zisheng-visual-style=statechart']) {
  const html = await fetch(origin, { headers: { Cookie: cookie } }).then(response => response.text());
  assert.ok(html.includes('data-theme="classic"'), 'unknown / palette preference must not select site theme');
}
for (const path of ['/docs/0000000000000000', '/records/0000000000000000', '/not-a-route']) {
  const missing = await fetch(origin + path, { headers: { Cookie: 'zisheng-site-theme=statechart' } });
  assert.equal(missing.status, 404, path);
  const html = await missing.text();
  // Next may deliver notFound through its client RSC error boundary. Verify the
  // themed payload separately; this does not establish browser rendering.
  const serverRendered = html.includes('class="sc-site"');
  const boundaryPayload = html.includes('NEXT_HTTP_ERROR_FALLBACK;404') && html.includes('sc-site') && html.includes('这张纸片暂不可用');
  assert.ok(serverRendered || boundaryPayload, `themed 404 payload: ${path}`);
  console.log(`PASS ${path}: ${serverRendered ? 'server HTML' : 'RSC error-boundary payload; browser check pending'}`);
}
for (const asset of ['ticket.png', 'sage.png', 'rose.png', 'paper.png', 'KevinSans-Regular.woff2', 'KevinSans-Bold.woff2', 'KevinSerif-Regular.woff2']) {
  const response = await fetch(origin + '/themes/statechart/' + asset);
  assert.equal(response.status, 200, asset);
  assert.ok((await response.arrayBuffer()).byteLength > 1000, asset);
}
console.log('PASS preference isolation, 404 theme payloads, and seven local assets');
const favorites = await fetch(origin + '/api/favorites').then(response => response.json());
assert.equal(favorites.version, 2);
for (const item of favorites.favorites) {
  const detail = await fetch(origin + '/api/favorites/' + item.id).then(response => response.json());
  assert.deepEqual(detail.favorite, item, 'single-item and collection snapshots agree');
}
const release = await fetch(origin + siteProfile.reader.manifestUrl).then(response => response.json());
const archive = Buffer.from(await fetch(origin + release.archiveUrl).then(response => response.arrayBuffer()));
assert.equal(createHash('sha256').update(archive).digest('hex'), release.sha256, 'advertised Skill archive matches actual bytes');
const subjects = await fetch(origin + '/api/subjects').then(response => response.json());
const activityResponse = await fetch(origin + '/api/activity');
const activity = await activityResponse.json();
assert.ok(subjects.subjects.length > 0 && activity.start <= activity.today && activity.today <= activity.end);
assert.equal(activityResponse.headers.get('cache-control'), 'no-store');
console.log('PASS favorite v2 detail parity, downloadable Skill checksum, subjects and dynamic weekly activity');
