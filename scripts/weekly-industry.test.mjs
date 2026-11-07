import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { weeklyIndustryCandidates, shanghaiWeek } from '../lib/weekly-industry.mjs';
import { cachedAIHOT, parseIndustryArgs, weeklyIndustryBrief } from './weekly-industry.mjs';

const item = (id, title, publishedAt, original = `https://example.com/${id}`) => ({
  id, title, publishedAt, originalTitle: null, summary: '', selected: true, category: 'ai-products',
  source: { name: 'Official' }, links: { original, aihot: `https://aihot.news/items/${id}` },
  attribution: { name: 'AIHOT', url: `https://aihot.news/items/${id}` },
});
const page = (items, nextCursor = null) => ({ schemaVersion: 1, items, page: { count: items.length, hasMore: nextCursor !== null, nextCursor } });
const now = new Date('2026-11-08T04:00:00Z');

test('weekly candidates keep original provenance, Shanghai dates and only relevant selected items', () => {
  const payload = { schemaVersion: 1, items: [
    item('old', 'Browser Agent', '2026-11-01T15:59:00Z'),
    item('edge', 'Browser Agent runtime agent eval', '2026-11-01T16:01:00Z'),
    item('duplicate', 'Browser Agent runtime agent eval', '2026-11-03T00:00:00Z', 'https://example.com/edge'),
    item('noise', 'New music player', '2026-11-03T00:00:00Z'),
    { ...item('unselected', 'Computer Use', '2026-11-04T00:00:00Z'), selected: false },
    item('unknown', 'Agent Runtime', null),
  ] };
  const result = weeklyIndustryCandidates(payload, { from: '2026-11-02', to: '2026-11-08' });
  assert.deepEqual(result.map(candidate => candidate.original), ['https://example.com/edge']);
  assert.deepEqual(result[0].topics, ['Browser Agent', 'Agent Runtime', '可靠性与评测']);
  assert.equal(result[0].attribution.name, 'AIHOT');
  assert.deepEqual(shanghaiWeek(new Date('2026-11-08T00:00:00Z')), { from: '2026-11-02', to: '2026-11-08' });
});

test('conditional requests reuse the exact cached response without importing data into site content', async () => {
  const cache = await fs.mkdtemp(path.join(os.tmpdir(), 'aihot-weekly-'));
  const endpoint = '/api/v1/items?mode=selected&window=7d&by=published&limit=100';
  const body = { schemaVersion: 1, items: [] };
  let conditional;
  const first = await cachedAIHOT(endpoint, { cache, now: 100_000, fetchImpl: async () => new Response(JSON.stringify(body), { headers: { ETag: '"one"' } }) });
  const second = await cachedAIHOT(endpoint, { cache, now: 100_100, fetchImpl: () => { throw Error('Too frequent'); } });
  const third = await cachedAIHOT(endpoint, { cache, now: 200_000, fetchImpl: async (_url, options) => { conditional = options.headers['If-None-Match']; return new Response(null, { status: 304 }); } });
  assert.deepEqual([first, second, third], [body, body, body]);
  assert.equal(conditional, '"one"');
  await fs.rm(cache, { recursive: true, force: true });
});

test('a prior AIHOT report cannot be mistaken for the current site issue', async () => {
  const result = await weeklyIndustryBrief({ from: '2026-11-02', to: '2026-11-08', now, fetchAIHOT: async endpoint => endpoint.includes('weeklies')
    ? { schemaVersion: 1, report: { periodStart: '2026-10-26', periodEnd: '2026-11-01', links: { aihot: 'https://aihot.news/weeklies/2026-W44' } } }
    : page([item('edge', 'Browser Agent', '2026-11-03T00:00:00Z')]) });
  assert.equal(result.weekly, null);
  assert.equal(result.candidates.length, 1);
});

test('pagination finds relevant items after the first page and preserves upstream identity', async () => {
  const calls = [];
  const result = await weeklyIndustryBrief({ now, fetchAIHOT: async endpoint => {
    calls.push(endpoint);
    if (endpoint.includes('weeklies')) return { schemaVersion: 1, report: { periodStart: '2026-11-02', periodEnd: '2026-11-08', links: { aihot: 'https://aihot.news/weeklies/2026-W45' } } };
    if (!endpoint.includes('cursor=')) return page([item('noise', 'New music player', '2026-11-07T00:00:00Z')], 'opaque+/=');
    assert.equal(new URL(endpoint, 'https://aihot.news').searchParams.get('cursor'), 'opaque+/=');
    return page([item('agent', 'Computer Use', '2026-11-06T00:00:00Z')]);
  } });
  assert.equal(calls.length, 3);
  assert.equal(result.coverage.pages, 2);
  assert.equal(result.coverage.hasMore, false);
  assert.equal(result.candidates[0].id, 'agent');
  assert.equal(result.weekly.url, 'https://aihot.news/weeklies/2026-W45');
});

test('bad pagination fails explicitly instead of claiming a complete empty week', async () => {
  await assert.rejects(weeklyIndustryBrief({ now, fetchAIHOT: async () => ({ schemaVersion: 1, items: [] }) }), /page.*schema/i);
  await assert.rejects(weeklyIndustryBrief({ now, fetchAIHOT: async () => page([], 'repeat') }), /repeated cursor/i);
});

test('request dates and argument pairs are validated before network access', async () => {
  for (const args of [['--from'], ['2026-11-02', '--from'], ['--from', '2026-11-02', '--from', '2026-11-03'], ['--unknown', '2026-11-02']]) {
    assert.throws(() => parseIndustryArgs(args), /Usage/);
  }
  assert.deepEqual(parseIndustryArgs(['--from', '2026-11-02', '--to', '2026-11-08']), { from: '2026-11-02', to: '2026-11-08' });
  await assert.rejects(weeklyIndustryBrief({ from: '2026-02-30', now, fetchAIHOT: () => assert.fail('must not fetch') }), /valid ascending/);
});

test('access restrictions and upstream retry instructions stay visible without retrying', async () => {
  const cache = await fs.mkdtemp(path.join(os.tmpdir(), 'aihot-errors-'));
  try {
    await assert.rejects(cachedAIHOT('/api/v1/items', { cache, fetchImpl: async () => new Response('您要访问的域名不在安全策略默认允许的范围内，域名拦截', { status: 403 }) }), /403.*域名.*放行/);
    let calls = 0;
    await assert.rejects(cachedAIHOT('/api/v1/items', { cache, fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ code: 'rate_limited', requestId: 'request-test' }), { status: 429, headers: { 'Retry-After': '120' } });
    } }), /429.*Retry-After: 120.*request-test/);
    assert.equal(calls, 1);
    assert.deepEqual(await fs.readdir(cache), []);
  } finally { await fs.rm(cache, { recursive: true, force: true }); }
});

test('server cache lifetime is respected and 304 retains it', async () => {
  const cache = await fs.mkdtemp(path.join(os.tmpdir(), 'aihot-ttl-'));
  const endpoint = '/api/v1/weeklies/latest';
  try {
    await cachedAIHOT(endpoint, { cache, now: 100_000, fetchImpl: async () => new Response(JSON.stringify({ schemaVersion: 1, report: {} }), { headers: { ETag: '"weekly"', 'Cache-Control': 'public, s-maxage=3600' } }) });
    await cachedAIHOT(endpoint, { cache, now: 200_000, fetchImpl: () => assert.fail('must respect server TTL') });
    await cachedAIHOT(endpoint, { cache, now: 4_000_000, fetchImpl: async () => new Response(null, { status: 304 }) });
    await cachedAIHOT(endpoint, { cache, now: 4_100_000, fetchImpl: () => assert.fail('304 must retain previous TTL') });
  } finally { await fs.rm(cache, { recursive: true, force: true }); }
});

test('partial coverage, empty candidates and missing weekly remain explicit', async () => {
  const result = await weeklyIndustryBrief({ from: '2026-10-01', to: '2026-11-08', now, fetchAIHOT: async endpoint => {
    if (endpoint.includes('weeklies')) throw new Error('AIHOT HTTP 503; Retry-After: 60');
    return page([]);
  } });
  assert.deepEqual(result.candidates, []);
  assert.ok(result.warnings.some(warning => warning.includes('7 天')));
  assert.ok(result.warnings.some(warning => warning.includes('候选为空')));
  assert.match(result.weekly.unavailable, /503/);
});
