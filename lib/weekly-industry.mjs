const interests = [
  { label: 'Browser Agent', terms: [/browser agent/i, /agentic browser/i, /browser use/i, /浏览器智能体|浏览器代理|浏览器自动化/i, /chromium|devtools protocol|\bcdp\b/i] },
  { label: 'Computer Use', terms: [/computer use/i, /desktop agent/i, /电脑操作|桌面智能体|计算机使用/i, /\brdp\b|\bvnc\b|云桌面|云电脑/i] },
  { label: 'Agent Runtime', terms: [/agent runtime/i, /agent sdk/i, /agent infrastructure/i, /智能体运行时|智能体执行环境/i, /sandbox|沙箱|工具调用|tool use/i] },
  { label: '可靠性与评测', terms: [/agent eval|agent benchmark/i, /智能体评测|端到端评测/i, /observability|可观测|trace|replay/i, /安全边界|prompt injection|权限控制/i] },
  { label: 'AI 工作流', terms: [/coding agent|software agent/i, /代码智能体|编程智能体|工作流智能体/i, /copilot|codex|claude code|gemini cli/i, /客服智能体|办公智能体/i] },
];

const dateInShanghai = value => {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
};

const validUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
};

export function weeklyIndustryCandidates(payload, { from, to, limit = 20 }) {
  if (payload?.schemaVersion !== 1 || !Array.isArray(payload.items)) throw new Error('AIHOT items response schema changed');
  const seen = new Set();
  return payload.items.flatMap(item => {
    const original = validUrl(item.links?.original), aihot = validUrl(item.links?.aihot);
    const day = dateInShanghai(item.publishedAt);
    if (!item.selected || !original || !aihot || !day || day < from || day > to || seen.has(original)) return [];
    const words = [item.title, item.originalTitle, item.summary].filter(Boolean).join(' ');
    const topics = interests.filter(group => group.terms.some(pattern => pattern.test(words))).map(group => group.label);
    if (!topics.length) return [];
    seen.add(original);
    return [{ id: item.id, title: item.title, originalTitle: item.originalTitle || null, publishedAt: item.publishedAt, discoveredAt: item.discoveredAt || null, source: item.source?.name || '来源待核', original, aihot, links: item.links, attribution: item.attribution || { name: 'AIHOT', url: aihot }, category: item.category, topics, relevance: topics.length, review: '待核对原始来源、实际变化和适用边界' }];
  }).sort((a, b) => b.relevance - a.relevance || b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
}

export function shanghaiWeek(now = new Date()) {
  const day = dateInShanghai(now.toISOString());
  const [year, month, date] = day.split('-').map(Number);
  const local = new Date(Date.UTC(year, month - 1, date));
  const weekday = local.getUTCDay();
  local.setUTCDate(local.getUTCDate() - (weekday + 6) % 7);
  return { from: local.toISOString().slice(0, 10), to: day };
}
