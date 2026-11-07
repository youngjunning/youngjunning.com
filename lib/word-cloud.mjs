import { articleTagCounts } from './article-navigation.mjs';

const stop = new Set(`一个 一种 一些 一次 一条 一套 这个 这些 这里 这种 这样 那个 那些 还有 已经 可以 可能 需要 通过 进行 使用 支持 提供 实现 当前 相关 对应 其中 以及 但是 如果 因为 所以 作为 对于 根据 之间 之后 之前 不同 相同 没有 不能 不会 不是 而是 时候 自己 我们 他们 你们 本人 什么 如何 为什么 是否 怎么 就是 只是 还是 例如 比如 包括 主要 同时 最后 首先 然后 直接 实际 具体 一个个 每个 每次 一般 所有 多个 其他 更加 比较 重新 继续 已有 尚未 待补充 发生时间 录入日期 来源资料 return const function async await export import from default null undefined true false let var string number type interface new this that with for the and not are was has have can use all get set to of in is on at as or by it an be do if id text value name class className https http www com org json markdown html px div span index content data file path`.split(/\s+/));
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });

/** Counts actual text occurrences in the shared content snapshot, never tag frequency.
 * @param {Array<{kind:string;url:string;title:string;text:string}>} entries
 * @param {string[]} [labels]
 */
export function buildSiteCloud(entries, labels = []) {
  const canonical = new Map(['浏览器', '数字分身', ...labels].map((label) => [label.toLowerCase(), label]));
  const dictionary = [...canonical.keys()].filter((label) => /[\p{Script=Han}]/u.test(label)).sort((a,b) => b.length-a.length);
  const protectedWords = new RegExp('(' + dictionary.map((label) => Array.from(label).map((char) => '\\^$.*+?()[]{}|'.includes(char) ? '\\' + char : char).join('')).join('|') + ')', 'giu');
  const sources = new Map();
  for (const entry of entries) {
    if (entry.kind === 'code' || !/^\/(records|docs)\/[a-f0-9]{16}$/.test(entry.url)) continue;
    const previous = sources.get(entry.url);
    if (previous) previous.text += '\n' + entry.text;
    else sources.set(entry.url, { ...entry });
  }
  const terms = new Map();
  for (const source of sources.values()) {
    const body = source.kind === 'record' ? source.text.replace(/^(?:已记录结果|已记录选项|后续结果)：未记录[^\n]*(?:\n|$)/gm, '').replace(/^(?:类型|发生时间|录入时间|状态|变化对象)：[^\n]*(?:\n|$)/gm, '').replace(/^(?:标题|内容|场景|个人参与|目标|已记录结果|判断依据|已记录选项|后续结果|之前|之后|原因|理解|示例|概念区别)：/gm, '') : source.text;
    const plain = body.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ').replace(/https?:\/\/[^\s)]+/g, ' ').replace(/<[^>]+>/g, ' ');
    const tokens = plain.split(protectedWords).flatMap((part) => canonical.has(part.toLowerCase()) ? [{ segment: part, isWordLike: true }] : [...segmenter.segment(part)]);
    for (const token of tokens) {
      const key = token.segment.toLowerCase();
      if (!token.isWordLike || stop.has(key) || !/^[\p{L}][\p{L}\p{N}+#.-]{1,27}$/u.test(key)) continue;
      let term = terms.get(key);
      if (!term) { term = { label: canonical.get(key) || token.segment, counts: [0, 0, 0], matches: new Map() }; terms.set(key, term); }
      const scope = source.kind === 'record' ? 1 : 2;
      term.counts[0]++; term.counts[scope]++;
      const match = term.matches.get(source.url) || { title: source.title, url: source.url, scope, count: 0 };
      match.count++; term.matches.set(source.url, match);
    }
  }
  const ranked = [...terms.values()].filter((term) => term.counts[0] >= 2).sort((a, b) => b.counts[0] - a.counts[0] || a.label.localeCompare(b.label, 'zh-CN'));
  const chosen = new Set([...ranked.slice(0, 28), ...[...ranked].sort((a,b) => b.counts[1] - a.counts[1]).filter((term) => term.counts[1]).slice(0, 16)]);
  return [...chosen].map((term) => ({ label: term.label, counts: term.counts, group: term.counts[1] && term.counts[2] ? 'both' : term.counts[1] ? 'record' : 'blog', matches: [1, 2].flatMap((scope) => [...term.matches.values()].filter((match) => match.scope === scope).sort((a,b) => b.count-a.count).slice(0, 4)) }));
}

/** Tags are editorial metadata, counted once per article.
 * @param {Array<{tags:string[];topic:string;title:string;url:string}>} documents
 */
export function buildBlogCloud(documents) {
  return articleTagCounts(documents).slice(0, 32).map(({ tag, count }) => {
    const matches = documents.filter((doc) => doc.tags.includes(tag));
    const groups = new Map();
    for (const doc of matches) groups.set(doc.topic, (groups.get(doc.topic) || 0) + 1);
    return { label: tag, counts: [count], group: [...groups].sort((a,b) => b[1]-a[1])[0]?.[0] || '', matches: matches.slice(0, 4).map((doc) => ({ title: doc.title, url: doc.url, scope: 0, count: 1 })) };
  });
}
