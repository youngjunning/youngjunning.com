#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ID = /^[a-f0-9]{16}$/;
const TYPES = new Set(['tool', 'reference', 'concept', 'method']);
const SUBJECTS = new Set(['grounding', 'browser', 'memory', 'engineering', 'business', 'design', 'infra', 'agents']);
const MAX_BYTES = 8 * 1024 * 1024;
const STOP = new Set(['什么', '如何', '怎么', '哪些', '是否', '关于', '一下', '介绍', '记录', '问题', '他的', '看法', 'what', 'is', 'a', 'the', 'of', 'and', 'or', 'for', 'with', 'how', 'does', 'about', 'show', 'me']);

function parseArgs(args) {
  const options = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--used') { options.used = true; continue; }
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    if (!['--base-url', '--limit', '--offset', '--chars', '--type', '--subject'].includes(arg)) throw new Error(`未知参数：${arg}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`${arg} 缺少参数值`);
    options[arg.slice(2)] = value;
  }
  return { ...options, command: positional.shift(), values: positional };
}

function integer(value, fallback, min, max, label) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${label} 必须为 ${min}–${max} 的整数`);
  return n;
}

function baseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('站点地址必须是完整的 HTTP(S) 根地址'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('站点地址只接受 HTTP(S) 根地址，不接受凭证、子路径、查询参数或片段');
  }
  return url;
}

async function bodyBytes(response) {
  const chunks = [];
  let size = 0;
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('接口内容超过 8 MiB 读取上限');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(chunks);
}

function termsFor(query) {
  const words = query.normalize('NFKC').toLowerCase().match(/[a-z0-9][a-z0-9_.+-]*|[\p{Script=Han}]+/gu) || [];
  return [...new Set(words.flatMap(word => /\p{Script=Han}/u.test(word) && word.length > 2
    ? [word, ...Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2))]
    : [word]).filter(word => !STOP.has(word)))];
}

function rank(items, query, fields, limit) {
  const terms = termsFor(query);
  const latinTerms = terms.filter(term => /^[a-z0-9]/.test(term));
  const text = value => value == null ? '' : typeof value === 'object' ? Object.values(value).map(text).join(' ') : String(value);
  const fieldText = (item, key) => text(item[key]);
  const candidates = latinTerms.length ? items.filter(item => {
    const text = fields.map(([key]) => fieldText(item, key)).join(' ').normalize('NFKC').toLowerCase();
    return latinTerms.some(term => text.includes(term));
  }) : items;
  return candidates.map(item => ({ item, score: fields.reduce((score, [key, weight]) => {
    const text = String(fieldText(item, key)).normalize('NFKC').toLowerCase();
    return score + terms.filter(term => text.includes(term)).length * weight;
  }, 0) })).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(hit => hit.item);
}

function snippet(value, query, chars = 320) {
  const text = String(value || '');
  const lower = text.toLowerCase();
  const positions = termsFor(query).map(term => lower.indexOf(term)).filter(pos => pos >= 0);
  const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 70);
  return (start ? '…' : '') + text.slice(start, start + chars) + (start + chars < text.length ? '…' : '');
}

export async function run(args, { fetchImpl = globalThis.fetch, env = process.env, baseEnv = 'RECORDS_BASE_URL', defaultBase, articlePath = '/blog', accessMessage = '需要站点访问权限，请在已登录浏览器中检查' } = {}) {
  const options = parseArgs(args);
  if (options.help || !options.command) return { commands: ['persona', 'search QUERY', 'record ID', 'article ID', 'graph ID|favorite:ID', 'favorites [QUERY]', 'favorite ID', 'research [QUERY]', 'excerpts [QUERY]', 'okr [QUERY]', 'skills [QUERY]', 'subjects [QUERY]', 'activity [QUERY]'], options: ['--base-url URL', '--limit 1..20', '--offset N', '--chars 1..40000', '--type tool|reference|concept|method', '--subject ID', '--used'] };
  const base = baseUrl(options['base-url'] || env[baseEnv] || defaultBase);
  const urlFor = path => new URL(path, base).href;
  const limit = integer(options.limit, 6, 1, 20, '--limit');
  const offset = integer(options.offset, 0, 0, Number.MAX_SAFE_INTEGER, '--offset');
  const chars = integer(options.chars, 12000, 1, 40000, '--chars');
  const [id] = options.values;
  const query = options.values.join(' ').trim();
  if (query.length > 512) throw new Error('查询内容不能超过 512 个字符');
  if (['record', 'article', 'favorite'].includes(options.command) && (options.values.length !== 1 || !ID.test(id))) throw new Error('请提供一个 16 位小写十六进制 ID');
  if (options.command === 'graph' && (options.values.length !== 1 || !/^(?:favorite:)?[a-f0-9]{16}$/.test(id))) throw new Error('graph 需要文章 ID 或 favorite:收藏ID');
  if (options.type && !TYPES.has(options.type)) throw new Error('--type 必须为 tool、reference、concept 或 method');
  if (options.subject && !SUBJECTS.has(options.subject)) throw new Error('--subject 不在当前主题目录中');

  async function get(path, raw = false) {
    let url = new URL(path, base);
    const signal = AbortSignal.timeout(15000);
    for (let redirects = 0; redirects <= 4; redirects++) {
      if (url.origin !== base.origin) throw new Error('接口跳转到其他站点；请使用已登录浏览器检查站点访问权限');
      const response = await fetchImpl(url.href, { method: 'GET', redirect: 'manual', signal, headers: { Accept: raw ? 'text/markdown, text/plain' : 'application/json' } });
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        await response.body?.cancel();
        url = new URL(response.headers.get('location'), url);
        continue;
      }
      if ([401, 403].includes(response.status)) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}：${accessMessage}`); }
      if (!response.ok) { await response.body?.cancel(); const error = new Error(`读取 ${path} 失败：HTTP ${response.status}`); error.status = response.status; throw error; }
      const type = response.headers.get('content-type') || '';
      if ((!raw && !type.includes('application/json')) || (raw && !/^text\/(plain|markdown)\b/i.test(type))) {
        await response.body?.cancel();
        throw new Error(`读取 ${path} 时返回了非预期内容，可能是登录页；请通过已登录浏览器检查`);
      }
      const bytes = await bodyBytes(response);
      if (raw) return bytes;
      try { return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); } catch { throw new Error(`读取 ${path} 时返回的 JSON 无效`); }
    }
    throw new Error('接口重定向次数过多；请检查站点地址和访问权限');
  }

  const getRecords = async () => {
    const data = await get('/api/records');
    if (!Array.isArray(data.records)) throw new Error('个人记录接口格式不匹配');
    return data.records.filter(record => record.visibility === 'shared');
  };
  const getCatalog = async () => {
    const data = await get('/api/catalog');
    if (!Array.isArray(data.documents)) throw new Error('文章目录接口格式不匹配');
    return data;
  };
  const getCollection = async (path, key, label, shared = false) => {
    const data = await get(path);
    if (!data || !Array.isArray(data[key]) || data[key].some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error(`${label}接口格式不匹配`);
    return { ...data, [key]: shared ? data[key].filter(item => item.visibility === 'shared') : data[key] };
  };
  const validateFavorite = (item, version) => {
    if (!item || typeof item !== 'object' || !ID.test(item.id) || item.visibility !== 'shared') throw new Error('未获得对应的共享百宝箱条目');
    if (version === 2 && (!['resource', 'note'].includes(item.kind) || !(item.kind === 'resource' ? ['tool', 'reference'] : ['concept', 'method']).includes(item.type) || !Array.isArray(item.subjects) || item.subjects.some(subject => !SUBJECTS.has(subject)) || !['user', 'source', 'ai', 'mixed'].includes(item.attribution) || (item.kind === 'note' && (typeof item.note?.body !== 'string' || !item.note.body.trim())))) throw new Error('百宝箱 v2 接口格式不匹配');
    return item;
  };
  const getFavorites = async () => {
    const data = await getCollection('/api/favorites', 'favorites', '收藏', true);
    if (![1, 2].includes(data.version)) throw new Error('百宝箱接口版本不匹配');
    data.favorites.forEach(item => validateFavorite(item, data.version));
    return data;
  };
  const getResearch = () => getCollection('/api/research', 'items', '探索清单', true);
  const getExcerpts = () => getCollection('/api/excerpts', 'items', '对话摘录', true);
  const getSkills = async () => {
    const data = await getCollection('/api/skills', 'skills', '技能目录');
    if (data.version !== 1 || typeof data.updatedAt !== 'string' || data.skills.some(item => typeof item.name !== 'string' || typeof item.summary !== 'string')) throw new Error('技能目录接口格式不匹配');
    return data;
  };
  const getOkr = async () => {
    const data = await getCollection('/api/okr', 'objectives', '目标');
    if (!Array.isArray(data.materials) || typeof data.period !== 'string' || data.objectives.some(item => !Array.isArray(item.keyResults))) throw new Error('目标接口格式不匹配');
    return data;
  };
  const favoriteFields = [['title', 8], ['tags', 5], ['subjects', 5], ['summary', 3], ['reason', 1], ['note', 3], ['card', 2], ['usages', 2], ['attribution', 1]];
  const researchFields = [['title', 8], ['question', 5], ['context', 2], ['nextStep', 2], ['result', 2], ['reason', 1]];
  const excerptFields = [['title', 8], ['messages', 4], ['context', 2], ['reason', 1]];
  const skillFields = [['name', 8], ['category', 4], ['summary', 3], ['projects', 2], ['usage', 2]];
  const pick = (items, fields) => query ? rank(items, query, fields, limit) : items.slice(0, limit);
  const favoriteType = item => item.type || ({ project: 'tool', knowledge: 'reference', card: 'concept' })[item.kind];
  const favoriteScope = items => items.filter(item => (!options.type || favoriteType(item) === options.type) && (!options.subject || item.subjects?.includes(options.subject)) && (!options.used || item.kind !== 'note' && (item.usages || []).some(usage => ['trial', 'adopted', 'retired'].includes(usage.stage) && usage.project && usage.evidence)));
  const favoriteLink = item => ({ ...item, siteUrl: urlFor(`/favorites#${item.id}`) });
  const researchLink = item => ({ ...item, siteUrl: urlFor(`/research#${item.id}`) });
  const excerptLink = item => ({ ...item, siteUrl: urlFor(`/excerpts#${item.id}`) });
  // The current Skills page has no stable per-skill URL. Cite the real catalog.
  const skillLink = item => ({ ...item, siteUrl: urlFor('/skills') });
  const objectives = store => store.objectives.map(objective => ({ ...objective, period: store.period, materials: store.materials.filter(material => objective.keyResults.some(result => result.id === material.keyResultId)), siteUrl: urlFor(`/okr#${encodeURIComponent(objective.id)}`) }));
  const okrFields = [['title', 8], ['description', 3], ['keyResults', 3], ['materials', 2]];
  const snapshot = catalog => ({ generatedAt: catalog.generatedAt, revision: catalog.source?.revision, dirty: catalog.source?.dirty });
  const articleUrl = doc => {
    const url = new URL(doc.url || `${articlePath}/${doc.id}`, base);
    if (url.origin !== base.origin || url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new Error('文章阅读地址必须与资料站同源');
    return url.href;
  };
  const articleLink = doc => ({ id: doc.id, title: doc.title, date: doc.date, updatedAt: doc.updatedAt, url: articleUrl(doc), rawUrl: urlFor(`/raw/${doc.id}`), ...(doc.publication === undefined ? {} : { publication: doc.publication }) });

  switch (options.command) {
    case 'subjects': {
      const data = await get('/api/subjects');
      if (data.version !== 1 || !Array.isArray(data.subjects) || data.subjects.some(item => typeof item.id !== 'string' || typeof item.label !== 'string')) throw new Error('关注主题接口格式不匹配');
      return { siteUrl: urlFor('/topics'), subjects: pick(data.subjects, [['label', 8], ['description', 3], ['id', 3]]).map(item => ({ ...item, siteUrl: urlFor('/topics?subject=' + encodeURIComponent(item.id)) })) };
    }
    case 'activity': {
      const data = await get('/api/activity');
      if (data.version !== 1 || !Array.isArray(data.entries) || typeof data.start !== 'string' || typeof data.end !== 'string') throw new Error('本周更新接口格式不匹配');
      return { ...data, totalEntries: data.entries.length, entries: pick(data.entries, [['title', 8], ['summary', 3], ['label', 2]]).map(item => ({ ...item, href: urlFor(item.href) })), weekly: data.weekly ? { ...data.weekly, url: urlFor(data.weekly.url) } : null, siteUrl: urlFor('/') };
    }
    case 'persona': {
      const data = await get('/api/persona');
      if (!data.recordsUrl || !Array.isArray(data.evidence)) throw new Error('个人介绍接口格式不匹配');
      return { url: urlFor('/'), ...data };
    }
    case 'search': {
      if (!query) throw new Error('search 需要提供关键词');
      const [records, catalog, search, favorites, research, excerpts, okr, skills] = await Promise.all([getRecords(), getCatalog(), get('/api/search'), getFavorites(), getResearch(), getExcerpts(), getOkr(), getSkills()]);
      if (!Array.isArray(search)) throw new Error('全文索引接口格式不匹配');
      const textById = new Map(search.map(row => [row.id, row.text]));
      const documents = catalog.documents.filter(doc => ID.test(doc.id)).map(doc => ({ ...doc, text: textById.get(doc.id) || '' }));
      return { query, snapshot: snapshot(catalog), records: rank(records, query, [['title', 8], ['text', 3], ['context', 1]], limit).map(record => ({ id: record.id, kind: record.kind, title: record.title, date: record.date, recordedAt: record.recordedAt, snippet: snippet(record.text, query), url: urlFor(`/records/${record.id}`), relatedIds: record.relatedIds, articleId: record.articleId })), articles: rank(documents, query, [['title', 8], ['tags', 5], ['summary', 3], ['text', 1]], limit).map(doc => ({ ...articleLink(doc), snippet: snippet(doc.text || doc.summary, query) })), favorites: pick(favoriteScope(favorites.favorites), favoriteFields).map(favoriteLink), research: pick(research.items, researchFields).map(researchLink), excerpts: pick(excerpts.items, excerptFields).map(excerptLink), okr: pick(objectives(okr), okrFields), skills: pick(skills.skills, skillFields).map(skillLink) };
    }
    case 'record': {
      const data = await get(`/api/records/${id}`);
      if (data.record?.id !== id || data.record.visibility !== 'shared') throw new Error('未获得对应的共享记录');
      return { url: urlFor(`/records/${id}`), ...data };
    }
    case 'article': {
      const catalog = await getCatalog();
      const doc = catalog.documents.find(row => row.id === id);
      if (!doc) throw new Error('文章不在当前可见目录中');
      const bytes = await get(`/raw/${id}`, true);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (doc.sha256 !== sha256) throw new Error('原文与目录 SHA-256 不一致，请重新检索后读取');
      const content = bytes.toString('utf8');
      if (offset > content.length) throw new Error('--offset 超出文章长度');
      const end = Math.min(offset + chars, content.length);
      return { ...articleLink(doc), snapshot: snapshot(catalog), kind: doc.kind, sha256, offset, totalChars: content.length, truncated: end < content.length, nextOffset: end < content.length ? end : null, content: content.slice(offset, end) };
    }
    case 'graph': {
      const graph = await get('/api/graph');
      if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error('图谱接口格式不匹配');
      const selected = graph.nodes.find(node => node.id === id && (node.type === 'document' || id.startsWith('favorite:') && node.type === 'favorite'));
      if (!selected) throw new Error('内容不在当前可见图谱中');
      const edges = graph.edges.filter(edge => edge.source === id || edge.target === id);
      const ids = new Set(edges.flatMap(edge => [edge.source, edge.target]));
      return { id, url: id.startsWith('favorite:') ? urlFor(`/favorites#${id.slice(9)}`) : articleUrl(selected), snapshot: snapshot(graph), nodes: graph.nodes.filter(node => node.id === id || ids.has(node.id)).map(node => ({ ...node, ...(node.type === 'document' && ID.test(node.id) ? { url: articleUrl(node) } : node.type === 'favorite' && /^favorite:[a-f0-9]{16}$/.test(node.id) ? { url: urlFor(`/favorites#${node.id.slice(9)}`) } : {}) })), references: edges.filter(edge => edge.type === 'references'), topicMemberships: edges.filter(edge => edge.type === 'belongs_to'), relations: edges.filter(edge => !['references', 'belongs_to'].includes(edge.type)) };
    }
    case 'favorites': {
      const data = await getFavorites();
      return { query, version: data.version, siteUrl: urlFor('/favorites'), favorites: pick(favoriteScope(data.favorites), favoriteFields).map(favoriteLink) };
    }
    case 'favorite': {
      try {
        const data = await get(`/api/favorites/${id}`);
        const item = validateFavorite(data.favorite, 2);
        if (item.id !== id) throw new Error('百宝箱单条接口返回了不同的身份');
        return { favorite: favoriteLink(item) };
      } catch (error) {
        if (error.status !== 404) throw error;
        const data = await getFavorites();
        if (data.version !== 1) throw error;
        const item = data.favorites.find(item => item.id === id);
        if (!item) throw new Error('百宝箱条目不在当前共享目录中');
        return { favorite: favoriteLink(item) };
      }
    }
    case 'research': {
      const data = await getResearch();
      return { query, siteUrl: urlFor('/research'), research: pick(data.items, researchFields).map(researchLink) };
    }
    case 'excerpts': {
      const data = await getExcerpts();
      return { query, siteUrl: urlFor('/excerpts'), excerpts: pick(data.items, excerptFields).map(excerptLink) };
    }
    case 'okr': {
      const data = await getOkr();
      return { query, siteUrl: urlFor('/okr'), period: data.period, owner: data.owner, recordedAt: data.recordedAt, principle: data.principle, source: data.source, objectives: pick(objectives(data), okrFields) };
    }
    case 'skills': {
      const data = await getSkills();
      return { query, siteUrl: urlFor('/skills'), updatedAt: data.updatedAt, skills: pick(data.skills, skillFields).map(skillLink) };
    }
    default: throw new Error(`未知命令：${options.command}`);
  }
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  run(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(error => {
    const message = error.name === 'TimeoutError' || error.name === 'AbortError' ? '读取超时，请检查网络与站点地址' : error.message;
    process.stderr.write(JSON.stringify({ error: message }) + '\n');
    process.exitCode = 1;
  });
}
