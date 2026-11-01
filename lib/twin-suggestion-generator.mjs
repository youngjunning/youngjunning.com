import { createHash } from 'node:crypto';
import { ChatError } from './twin-chat.mjs';
import { retrieveConversationEvidence } from './twin-knowledge.mjs';
import { personalInferenceFromEngineering } from './engineering-knowledge.mjs';
import { projectPreparedSuggestions } from './prepared-suggestions.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalize = text => text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const quoteText = text => text.replace(/\s+/g, '');
const angles = new Set(['tradeoff', 'mechanism', 'boundary', 'evolution', 'evidence']);
const depthSignals = /取舍|约束|边界|代价|原因|因为|失败|验证|不能|不等于|改为|之前|之后|风险|选择|然而|但是/g;
const generic = /主要讲什么|做了什么|聊聊|介绍一下|核心内容是什么|这篇文章讲了什么/;

export function selectSuggestionSources(index, random = Math.random) {
  const groups = new Map();
  for (const entry of index.entries) {
    if (!entry.title?.trim() || !entry.text?.trim() || !entry.url) continue;
    const group = groups.get(entry.url) || [];
    group.push(entry);
    groups.set(entry.url, group);
  }
  const documents = [...groups.values()].map(chunks => ({ chunks, kind: chunks[0].kind, date: chunks[0].date || '', rank: random() }));
  const chosen = [];
  for (const [kind, limit] of [['record', 4], ['blog', 8]]) {
    const matches = documents.filter(doc => doc.kind === kind);
    // Two recent documents plus a rotating sample of the rest.
    const recent = [...matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
    const rest = matches.filter(doc => !recent.includes(doc)).sort((a, b) => a.rank - b.rank);
    chosen.push(...[...recent, ...rest].slice(0, limit));
  }
  const chosenUrls = new Set(chosen.map(doc => doc.chunks[0].url));
  // Bring both ends of a few explicit relationships into the sample, while
  // preserving rotation and a bounded context budget.
  for (const edge of index.relationships || []) {
    if (chosen.length >= 16) break;
    const neighbour = chosenUrls.has(edge.from) ? edge.to : chosenUrls.has(edge.to) ? edge.from : null;
    if (!neighbour || chosenUrls.has(neighbour) || !groups.has(neighbour)) continue;
    chosen.push({ chunks: groups.get(neighbour) }); chosenUrls.add(neighbour);
  }
  const wikiEvidence = new Set((index.wiki?.pages || []).flatMap(page => page.paragraphs.flatMap(paragraph => paragraph.evidence.map(ref => ref.sourceId))));
  return chosen.flatMap(({ chunks }) => [...chunks]
    .sort((a, b) => Number(wikiEvidence.has(b.id)) - Number(wikiEvidence.has(a.id)) || (b.text.match(depthSignals)?.length || 0) - (a.text.match(depthSignals)?.length || 0))
    .slice(0, 2).map(({ id, title, text, kind, recordKind, date, url, sha256, commit, engineeringKind }) => ({ id, title, text, kind, recordKind, date, url, sha256, commit, engineeringKind })));
}

function connectedSources(urls, index) {
  const visited = new Set([urls[0]]);
  for (let step = 0; step < urls.length; step++) for (const edge of index.relationships || []) {
    if (!urls.includes(edge.from) || !urls.includes(edge.to)) continue;
    if (visited.has(edge.from)) visited.add(edge.to);
    if (visited.has(edge.to)) visited.add(edge.from);
  }
  return urls.every(url => visited.has(url));
}

/** Verify exact quotes AND availability through the real answer retrieval path. */
export function validateSuggestionCandidates(output, sources, index, maxLength = 90, { crossDocument = false, skipRetrieval = false } = {}) {
  const byId = new Map(sources.map(source => [source.id, source]));
  const indexed = new Map(index.entries.map(source => [source.id, source]));
  const seen = new Set(), questions = [];
  if (!Array.isArray(output?.questions)) throw new ChatError(502, 'invalid_suggestions', '推荐问题生成格式异常，请重试。');
  for (const candidate of output.questions.slice(0, 12)) {
    if (typeof candidate?.question !== 'string' || typeof candidate.answerOutline !== 'string' || !angles.has(candidate.angle)) continue;
    const question = candidate.question.trim(), key = normalize(question).replace(/[？?。！!，,；;：:「」“”]/g, '');
    if (question.length < 20 || question.length > maxLength || generic.test(question) || seen.has(key) || candidate.answerOutline.length < 15 || candidate.answerOutline.length > 600) continue;
    if (!Array.isArray(candidate.evidence) || !candidate.evidence.length || candidate.evidence.length > 3) continue;
    const evidence = candidate.evidence;
    if (!evidence.every(item => typeof item?.quote === 'string' && item.quote.trim().length >= 20 && item.quote.length <= 300 && byId.has(item.sourceId) && quoteText(byId.get(item.sourceId).text).includes(quoteText(item.quote)))) continue;
    if (evidence.some(item => indexed.get(item.sourceId)?.kind === 'code') && (candidate.angle === 'evolution' || personalInferenceFromEngineering(question + '\n' + candidate.answerOutline))) continue;
    const urls = [...new Set(evidence.map(item => indexed.get(item.sourceId)?.url))];
    if (urls.some(url => !url) || (urls.length > 1 && (!crossDocument || !connectedSources(urls, index)))) continue;
    if (urls.length > 1 && candidate.angle === 'evolution' && !evidence.some(item => indexed.get(item.sourceId)?.recordKind === 'change')) continue;
    const retrieved = skipRetrieval ? evidence.map(item => indexed.get(item.sourceId)) : retrieveConversationEvidence(index, [{ role: 'user', content: question }]);
    if (!evidence.every(item => retrieved.some(source => source.id === item.sourceId && quoteText(source.text).includes(quoteText(item.quote))))) continue;
    seen.add(key);
    const primary = byId.get(evidence[0].sourceId);
    questions.push({ id: digest({ question, evidence }).slice(0, 16), question, kind: primary.kind, topic: primary.title, angle: candidate.angle, answerOutline: candidate.answerOutline, evidence, retrieved });
  }
  return questions;
}


/** Serve Codex-prepared questions only. Source changes require a new committed stock. */
export function createSuggestionHandler({loadKnowledge}) {
 return async function handle(request) {
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try {
   const origin=request.headers.get('origin'),host=request.headers.get('host')||new URL(request.url).host;
   if(request.headers.get('sec-fetch-site')==='cross-site'||origin&&new URL(origin).host!==host)throw new ChatError(403,'origin_mismatch','请从本站获取推荐问题。');
   const index=loadKnowledge();
   if(!index.entries.length)return Response.json({suggestions:[],revision:index.revision},{headers});
   const suggestions=projectPreparedSuggestions(index,index.preparedSuggestions);
   if(suggestions===null)throw new ChatError(503,'prepared_suggestions_stale','推荐问题需要随资料更新，请由 Codex 重新整理。');
   return Response.json({suggestions,revision:index.revision},{headers});
  }catch(error){
   const known=error instanceof ChatError;
   return Response.json({error:{code:known?error.code:'service_error',message:known?error.message:'推荐问题暂时不可用。'}},{status:known?error.status:503,headers});
  }
 };
}
