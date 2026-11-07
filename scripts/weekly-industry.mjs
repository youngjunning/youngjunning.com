import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { shanghaiWeek, weeklyIndustryCandidates } from '../lib/weekly-industry.mjs';

const origin = 'https://aihot.news';
const cacheDir = path.join(process.cwd(), '.cache', 'aihot-weekly');
const day = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const usage = 'Usage: npm run weekly:industry -- [--from YYYY-MM-DD --to YYYY-MM-DD]';

export function parseIndustryArgs(args) {
  const options = {};
  if (args.length % 2) throw new Error(usage);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    if (!['--from', '--to'].includes(args[i]) || key in options || !day(args[i + 1])) throw new Error(usage);
    options[key] = args[i + 1];
  }
  return options;
}

function cacheLifetime(headers, fallback = 60_000) {
  const control = headers.get('cache-control') || '';
  const seconds = control.match(/(?:^|,)\s*s-maxage=(\d+)/i)?.[1] ?? control.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1];
  return seconds === undefined ? fallback : Math.max(60_000, Number(seconds) * 1000);
}

export async function cachedAIHOT(endpoint, { fetchImpl = fetch, cache = cacheDir, now = Date.now() } = {}) {
  if (!endpoint.startsWith('/api/v1/')) throw new Error('Unexpected AIHOT endpoint');
  const file = path.join(cache, createHash('sha256').update(endpoint).digest('hex') + '.json');
  let previous;
  try { previous = JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous && now - previous.fetchedAt < (previous.ttlMs || 60_000)) return previous.body;
  const response = await fetchImpl(origin + endpoint, { headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, br', 'User-Agent': 'silicon-weekly/1.0', ...(previous?.etag ? { 'If-None-Match': previous.etag } : {}) }, signal: AbortSignal.timeout(15_000) });
  if (response.status === 304) {
    if (!previous) throw new Error('AIHOT returned 304 without a local response');
    await fs.writeFile(file, JSON.stringify({ ...previous, fetchedAt: now, ttlMs: cacheLifetime(response.headers, previous.ttlMs || 60_000) }));
    return previous.body;
  }
  if (!response.ok) {
    const raw = await response.text();
    if (response.status === 403 && /域名.*安全策略|域名拦截/.test(raw)) {
      throw new Error('AIHOT HTTP 403：本机或组织安全策略拦截域名 aihot.news，请按组织流程放行后重试。');
    }
    let problem;
    try { problem = JSON.parse(raw); } catch { /* Non-JSON gateway responses still report their HTTP status. */ }
    const retryAfter = response.headers.get('retry-after') || problem?.retryAfter;
    const requestId = response.headers.get('x-request-id') || problem?.requestId;
    throw new Error(`AIHOT HTTP ${response.status}${retryAfter ? `; Retry-After: ${retryAfter}` : ''}${problem?.code ? `; code: ${problem.code}` : ''}${requestId ? `; requestId: ${requestId}` : ''}`);
  }
  const body = await response.json();
  if (body.schemaVersion !== 1) throw new Error('AIHOT response schema changed');
  await fs.mkdir(cache, { recursive: true });
  await fs.writeFile(file, JSON.stringify({ fetchedAt: now, ttlMs: cacheLifetime(response.headers), etag: response.headers.get('etag'), body }));
  return body;
}

export async function weeklyIndustryBrief({ from, to, now = new Date(), fetchAIHOT = cachedAIHOT } = {}) {
  const period = shanghaiWeek(now);
  from ||= period.from; to ||= period.to;
  if (!day(from) || !day(to) || from > to) throw new Error('Use --from and --to as valid ascending YYYY-MM-DD dates');
  const warnings = [];
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (Date.parse(`${from}T00:00:00+08:00`) < Date.parse(windowStart)) warnings.push('请求范围超出最近 7 天滚动窗口，较早内容无法从该接口补齐。');
  if (to > period.to) warnings.push('请求包含未来日期，尚未发生的动态不在本次结果中。');
  const items = [], cursors = new Set(), notices = [];
  let cursor, pages = 0, hasMore;
  do {
    const endpoint = '/api/v1/items?mode=selected&window=7d&by=published&limit=100' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
    const payload = await fetchAIHOT(endpoint);
    if (payload?.schemaVersion !== 1 || !Array.isArray(payload.items) || typeof payload.page?.hasMore !== 'boolean') throw new Error('AIHOT items/page response schema changed');
    items.push(...payload.items);
    if (payload.notice) notices.push(payload.notice);
    pages++;
    hasMore = payload.page.hasMore;
    if (hasMore) {
      cursor = payload.page.nextCursor;
      if (typeof cursor !== 'string' || !cursor) throw new Error('AIHOT page response schema changed: missing cursor');
      if (cursors.has(cursor)) throw new Error('AIHOT repeated cursor; pagination stopped');
      cursors.add(cursor);
    }
  } while (hasMore && pages < 20);
  if (hasMore) warnings.push('已达到单次 20 页上限，候选覆盖不完整。');
  const candidates = weeklyIndustryCandidates({ schemaVersion: 1, items }, { from, to });
  if (!candidates.length) warnings.push('候选为空：已读取的精选中没有命中当前日期和主题的条目，不代表本周没有行业动态。');
  let weekly = null;
  try {
    const payload = await fetchAIHOT('/api/v1/weeklies/latest');
    if (payload?.schemaVersion !== 1 || !payload.report) throw new Error('AIHOT weekly response schema changed');
    const report = payload.report;
    if (report.periodStart === from && report.periodEnd === to) weekly = { url: report.links?.aihot, periodStart: report.periodStart, periodEnd: report.periodEnd, attribution: report.attribution || null };
    else warnings.push('AIHOT 最新周报与请求日期不一致，未作为本期周报使用。');
  } catch (error) { weekly = { unavailable: String(error.message) }; }
  return { period: { from, to }, source: origin, checkedAt: now.toISOString(), scope: 'AIHOT 精选候选；仅覆盖最近 7 天公开接口，需回查原始来源', coverage: { windowStart, pages, scannedItems: items.length, hasMore }, candidates, weekly, notices, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => weeklyIndustryBrief(parseIndustryArgs(process.argv.slice(2))))
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
