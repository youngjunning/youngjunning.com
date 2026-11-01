import { createHash } from 'node:crypto';

const digest = (text) => createHash('sha256').update(text).digest('hex');
const kindLabels = { experience: '经历', project: '项目', judgment: '判断', change: '变化', thought: '想法' };
const normalize = (text) => text.normalize('NFKC').toLowerCase();
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
const stop = new Set(['你', '我', '的', '了', '是', '有', '在', '和', '与', '吗', '呢', '什么', '怎么', '哪些', '如何', '为什么', '介绍', '说说', '关于', '一下', '可以', '这个', '那个', '紫升', '俊宁']);
function terms(text) {
  const normalized = normalize(text);
  const words = [...segmenter.segment(normalized)].filter((part) => part.isWordLike && (part.segment.length > 1 || /^[a-z]$/.test(part.segment))).map((part) => part.segment);
  for (const match of normalized.matchAll(/[\p{Script=Han}]{3,}/gu)) {
    for (let index = 0; index < match[0].length - 1; index++) words.push(match[0].slice(index, index + 2));
  }
  return [...new Set(words)].filter((word) => !stop.has(word)).slice(0, 120);
}
export { terms as conversationTerms };
function plain(text) {
  return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/(?:https?:\/\/|data:)[^\s<>]+/g, ' ')
    .replace(/[#*`>|]/g, '').replace(/\s+/g, ' ').trim();
}
function recordText(record) {
  const data = { 类型: kindLabels[record.kind], 标题: record.title, 内容: record.text, 场景: record.context, 发生时间: record.kind === 'experience' ? record.period : record.date || '未记录', 录入时间: record.recordedAt };
  if (record.kind === 'project') Object.assign(data, { 个人参与: record.role, 目标: record.goal, 状态: { ongoing: '进行中', completed: '已完成', paused: '已暂停', unknown: '未核实' }[record.status], 已记录结果: record.outcomes.length ? record.outcomes.join('；') : '未记录（不能据此推断项目没有成果或尚未完成）' });
  if (record.kind === 'judgment') Object.assign(data, { 判断依据: record.basis, 已记录选项: record.alternatives.join('；') || '未记录', 后续结果: record.outcome || '未记录' });
  if (record.kind === 'change') Object.assign(data, { 变化对象: record.subjectId, 之前: record.before, 之后: record.after, 原因: record.reason });
  return Object.entries(data).map(([key, value]) => `${key}：${value}`).join('\n');
}

/** Build from shared records and visible blog snapshots only.
 * @param {import('./record-types').PersonalRecord[]} records
 * @param {{ id: string; title: string; date: string | null; summary: string; tags: string[]; url: string; rawUrl: string; sha256: string; rawContent: string }[]} documents
 * @param {{ generatedAt: string; revision: string }} snapshot
 * @returns {import('./twin-types').ConversationKnowledge}
 */
export function buildConversationKnowledge(records, documents, snapshot, articleReferences = []) {
  const entries = [];
  const shared = records.filter((record) => record.visibility === 'shared');
  const sharedIds = new Set(shared.map((record) => record.id));
  for (const record of shared) {
    const text = recordText(record);
    const relatedIds = [record.projectId, ...(record.kind === 'change' ? [record.subjectId] : []), ...record.relatedIds].filter((id) => sharedIds.has(id)).map((id) => 'record-' + id);
    entries.push({ id: 'record-' + record.id, kind: 'record', recordKind: record.kind, title: record.title, url: '/records/' + record.id, rawUrl: '/api/records/' + record.id, date: record.date, recordedAt: record.recordedAt, text, excerpt: text, sha256: digest(JSON.stringify(record)), searchTitle: `${record.title} ${kindLabels[record.kind]} ${record.kind === 'project' ? record.tags.join(' ') : ''}`, tags: record.kind === 'project' ? record.tags : [], relatedIds });
  }
  for (const doc of documents) {
    // Blank non-prose blocks without changing source line numbers.
    const body = doc.rawContent.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, (value) => value.replace(/[^\n]/g, ' '))
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (value) => value.replace(/[^\n]/g, ' '));
    const lines = body.split('\n');
    let buffer = '', start = 1;
    function flush(end) {
      const text = plain(buffer);
      if (text.length > 25) entries.push({ id: `blog-${doc.id}-${start}`, kind: 'blog', title: doc.title, url: doc.url, rawUrl: doc.rawUrl, date: doc.date, lineStart: start, lineEnd: end, text: `${doc.summary}\n${text}`, excerpt: text, sha256: doc.sha256, searchTitle: `${doc.title} ${doc.tags.join(' ')}`, tags: doc.tags, relatedIds: [] });
      buffer = '';
    }
    for (let index = 0; index < lines.length; index++) {
      // Long HTML lines contain embedded images; reduce them before chunking.
      const line = lines[index].length > 3000 ? plain(lines[index]) : lines[index];
      if (buffer && buffer.length + line.length > 1800) flush(index);
      if (!buffer) start = index + 1;
      // Keep a bounded excerpt even for a minified HTML paragraph.
      buffer += '\n' + line.slice(0, 2600);
    }
    if (buffer) flush(lines.length);
  }
  const articleUrls = new Map(documents.map(doc => [doc.id, doc.url]));
  const urls = new Set(entries.map(entry => entry.url)), relationships = [], seen = new Set();
  function relate(from, to, type) {
    const key = `${from}:${to}:${type}`;
    if (!urls.has(from) || !urls.has(to) || from === to || seen.has(key)) return;
    seen.add(key); relationships.push({ from, to, type });
  }
  for (const record of shared) {
    const from = '/records/' + record.id;
    for (const id of [record.articleId, ...record.sources.filter(source => source.kind === 'article').map(source => source.articleId)]) relate(from, articleUrls.get(id), 'record-article');
    if (record.projectId) relate(from, '/records/' + record.projectId, 'project');
    if (record.kind === 'change') relate(from, '/records/' + record.subjectId, 'change-subject');
    for (const id of record.relatedIds) relate(from, '/records/' + id, 'related');
  }
  for (const ref of articleReferences) if (ref.type === 'references') relate(articleUrls.get(ref.source), articleUrls.get(ref.target), 'references');
  return { version: 1, ...snapshot, entries, relationships };
}

/** @param {import('./twin-types').ConversationKnowledge} index
 * @param {import('./twin-types').ConversationMessage[]} messages
 * @returns {import('./twin-types').KnowledgeEntry[]}
 */
export function retrieveConversationEvidence(index, messages) {
  const latest = messages.at(-1)?.content || '';
  const previous = messages.slice(-5, -1).map((message) => message.content).join(' ').slice(-2200);
  const queryTerms = terms(latest), contextTerms = terms(previous);
  const latestQuery = normalize(latest);
  const intents = [];
  if (/项目|做过|参与|负责|作品/.test(latestQuery)) intents.push('project');
  if (/经历|履历|工作|毕业|大学|学校|任职|是谁|介绍自己/.test(latestQuery)) intents.push('experience');
  if (/判断|观点|认为|取舍|选择|为什么|怎么想|看法/.test(latestQuery)) intents.push('judgment');
  if (/变化|改变|之前|后来|以前|现在|最新|修正/.test(latestQuery)) intents.push('change');
  const ranked = index.entries.map((entry) => {
    const title = normalize(entry.searchTitle), body = normalize(entry.text);
    let score = 0;
    for (const term of queryTerms) {
      if (title.includes(term)) score += term.length > 1 ? 8 : 2;
      if (body.includes(term)) score += (term.length > 1 ? 3 : 0.5) + Math.min(3, body.split(term).length - 2) * 0.6;
    }
    for (const term of contextTerms) if (term.length > 1 && (title.includes(term) || body.includes(term))) score += 0.6;
    if (entry.kind === 'record' && intents.includes(entry.recordKind)) score += 9;
    return { entry, score };
  }).filter((item) => item.score >= 3).sort((a, b) => b.score - a.score || (b.entry.date || '').localeCompare(a.entry.date || '') || a.entry.id.localeCompare(b.entry.id));
  const chosen = [], counts = new Map();
  for (const { entry } of ranked) {
    const document = entry.id.split('-').slice(0, 2).join('-');
    if ((counts.get(document) || 0) >= 2) continue;
    chosen.push(entry); counts.set(document, (counts.get(document) || 0) + 1);
    if (chosen.length === 8) break;
  }
  // Keep linked changes and their subject together instead of losing history.
  const selectedIds = new Set(chosen.map((entry) => entry.id));
  for (const entry of index.entries) {
    if (chosen.length >= 11) break;
    if (!selectedIds.has(entry.id) && (entry.relatedIds.some((id) => selectedIds.has(id)) || chosen.some((item) => item.relatedIds.includes(entry.id)))) {
      chosen.push(entry); selectedIds.add(entry.id);
    }
  }
  return chosen;
}
