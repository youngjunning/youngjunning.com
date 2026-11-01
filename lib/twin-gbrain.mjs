import { createHash } from 'node:crypto';
import { createRequire, register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';
import { conversationTerms, retrieveConversationEvidence } from './twin-knowledge.mjs';

export const GBRAIN_REVISION = '88d3f572950a772d268b22afe0bd53c2a2f090ff';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const knowledgeFingerprint = index => hash([index.entries, index.relationships || [], index.wiki || null]);
let runtime;

async function loadRuntime() {
  if (!runtime) runtime = (async () => {
    const parentURL = pathToFileURL(path.join(process.cwd(), 'package.json')).href;
    const require = createRequire(parentURL), entry = require.resolve('gbrain/pglite-engine');
    const packageRoot = path.resolve(path.dirname(entry), '../..');
    register(pathToFileURL(path.join(process.cwd(), 'lib/twin-gbrain-assets-loader.mjs')), {
      parentURL, data: { packageRoot: pathToFileURL(packageRoot + path.sep).href },
    });
    const options = { parentURL, tsconfig: false };
    const engine = await tsImport(pathToFileURL(entry).href, options);
    // Pinned upstream's projection seal keeps searchable chunks at the same
    // revision as their page. Do not bypass its stale-chunk read policy.
    const projection = await tsImport(pathToFileURL(path.join(packageRoot, 'src/core/page-state/projections.ts')).href, options);
    const chunks = await tsImport(pathToFileURL(path.join(packageRoot, 'src/core/search/safe-chunks.ts')).href, options);
    return { ...engine, ...projection, ...chunks };
  })().catch(error => { runtime = null; throw error; });
  return runtime;
}

/** Only explicit cutoff wording creates a historical filter; publication,
 * ingestion and event dates are never substituted for one another. */
export function historicalCutoff(messages) {
  const users = messages.filter(message => message.role === 'user');
  const latest = users.at(-1)?.content || '';
  const pattern = /(?:截至|截止|到|as\s+of)\s*(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?/gi;
  let dates = [...latest.matchAll(pattern)];
  if (!dates.length && !/现在|当前|最新|今天|如今/.test(latest) && /当时|那时|这个|那个|它|继续|具体|后来/.test(latest)) dates = [...users.slice(0, -1).map(message => message.content).join('\n').matchAll(pattern)];
  if (!dates.length) return null;
  const [, year, month, day] = dates.at(-1), date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

const searchableText = text => text.replace(/<!--/g, '&lt;!--');
const sourceSlug = entry => 'sources/' + hash(entry.url).slice(0, 24);

/** Derived source pages and topic Wiki navigation. A common topic is a
 * navigation relationship, never evidence of agreement, causality or change. */
export function compileGbrainPages(index) {
  const pages = new Map(), byUrl = new Map(), links = [], topics = new Map();
  for (const entry of index.entries) {
    const slug = sourceSlug(entry);
    if (!pages.has(slug)) pages.set(slug, { slug, title: entry.title, type: entry.kind === 'record' ? entry.recordKind : entry.kind === 'code' ? 'code' : 'article', entries: [], frontmatter: { url: entry.url, event_date: entry.kind === 'record' ? entry.date : null, published_date: entry.kind === 'blog' ? entry.date : null, recorded_at: entry.recordedAt || null, ...(entry.kind === 'code' ? { code_commit: entry.commit, personal_judgment: false } : {}) } });
    pages.get(slug).entries.push(entry); byUrl.set(entry.url, slug);
    for (const tag of entry.tags || []) {
      if (!topics.has(tag)) topics.set(tag, new Set());
      topics.get(tag).add(slug);
    }
  }
  const relate = (from, to, type) => {
    if (!from || !to || from === to) return;
    for (const [a, b] of [[from, to], [to, from]]) links.push({ from_slug: a, to_slug: b, link_type: type, link_source: 'site-evidence', context: type });
  };
  for (const { from, to, type } of index.relationships || []) relate(byUrl.get(from), byUrl.get(to), type);
  const originals = new Map(index.entries.map(entry => [entry.id, entry]));
  for (const wiki of index.wiki?.pages || []) {
    const paragraphs = wiki.paragraphs.filter(paragraph => paragraph.evidence.length && paragraph.evidence.every(ref => originals.get(ref.sourceId)?.sha256 === ref.sha256));
    if (!paragraphs.length) continue;
    const slug = 'wiki/' + wiki.id;
    const evidenceIds = [...new Set(paragraphs.flatMap(paragraph => paragraph.evidence.map(ref => ref.sourceId)))];
    pages.set(slug, { slug, title: wiki.title, type: 'concept', entries: [], evidenceIds, text: paragraphs.map(paragraph => paragraph.text).join('\n\n'), frontmatter: { navigation_only: true, model_synthesis: true } });
    for (const id of evidenceIds) relate(slug, byUrl.get(originals.get(id).url), 'wiki-evidence');
  }
  for (const [title, targets] of topics) {
    if (targets.size < 2) continue;
    const slug = 'topics/' + hash(title).slice(0, 24);
    const text = `主题：${title}。以下仅为资料导航，不表示本人认可、观点一致或判断发生变化。\n` + [...targets].map(target => pages.get(target).title).join('\n');
    pages.set(slug, { slug, title, type: 'concept', entries: [], text, frontmatter: { navigation_only: true } });
    for (const target of targets) relate(slug, target, 'shared-topic');
  }
  return { pages, links };
}

async function buildBrain(index) {
  const { PGLiteEngine, sealPageTextProjection, SAFE_FENCE_CHUNKER_VERSION } = await loadRuntime();
  const engine = new PGLiteEngine(), compiled = compileGbrainPages(index);
  try {
    // No path/config file: this brain is an isolated, rebuildable memory index.
    await engine.connect({ engine: 'pglite', pglite_shared_buffers: '16MB' });
    await engine.initSchema();
    const codeChunks=new Map(),codeRows=[];
    for (const page of compiled.pages.values()) {
      // Index source identity alongside short excerpts. Returned evidence is
      // still the original entry: these retrieval labels are not quotations.
      const texts = page.entries.length ? page.entries.map(entry => searchableText([entry.title, entry.searchTitle, entry.text].filter(Boolean).join('\n\n'))) : [page.text];
      await engine.transaction(async tx => {
        await tx.putPage(page.slug, { type: page.type, title: page.title, compiled_truth: texts.join('\n\n'), frontmatter: page.frontmatter });
        await tx.upsertChunks(page.slug, texts.map((text, chunk_index) => {
          const entry=page.entries[chunk_index],code=entry?.codeMeta;
          return {chunk_index,chunk_source:'compiled_truth',chunk_text:text,...(code?{language:code.language,symbol_name:code.symbolName||undefined,symbol_type:code.symbolType,symbol_name_qualified:code.qualified||undefined,start_line:entry.lineStart,end_line:entry.lineEnd}:{})};
        }), { sealChunkerVersion: SAFE_FENCE_CHUNKER_VERSION });
        await sealPageTextProjection(tx, page.slug, 'default');
      });
      if(page.entries.some(entry=>entry.codeMeta))for(const row of await engine.getChunks(page.slug)){
        const entry=page.entries[row.chunk_index];if(entry?.codeMeta){codeChunks.set(row.id,entry);codeRows.push({row,entry});}
      }
    }
    const definitions=new Map();
    for(const {row,entry} of codeRows){const key=entry.codeMeta.qualified;if(!key)continue;const group=definitions.get(key)||[];group.push(row.id);definitions.set(key,group);}
    const edges=codeRows.flatMap(({row,entry})=>(entry.codeMeta.edges||[]).map(edge=>{
      const targets=definitions.get(edge.target)||[];
      return {from_chunk_id:row.id,to_chunk_id:targets.length===1?targets[0]:null,from_symbol_qualified:entry.codeMeta.qualified,to_symbol_qualified:edge.target,edge_type:edge.type,source_id:'default'};
    }));
    if(edges.length)await engine.addCodeEdges(edges);
    if (compiled.links.length) await engine.addLinksBatch(compiled.links);
    const timeline = [...compiled.pages.values()].filter(page => page.entries[0]?.kind === 'record' && page.entries[0].date).map(page => ({ slug: page.slug, date: page.entries[0].date, source: page.entries[0].url, summary: page.title, detail: page.entries[0].text }));
    if (timeline.length) await engine.addTimelineEntriesBatch(timeline);
    return { engine, ...compiled, codeChunks, key: knowledgeFingerprint(index) };
  } catch (error) { await engine.disconnect(); throw error; }
}

function checkSignal(signal) { if (signal?.aborted) throw signal.reason || new Error('Retrieval cancelled'); }

function retrievalTerms(question) {
  const grammatical = new Set(['已经', '选择', '判断', '变化', '之前', '之后', '当时', '现在', '什么', '原因', '如何', '截至', '截止', '为什', 'what', 'why', 'how', 'is', 'are', 'was', 'were', 'the', 'as', 'of', 'do', 'does', 'did', 'it', 'this', 'that', 'current', 'now', 'latest']);
  const withoutDates = question.replace(/\d{4}[-年/]\d{1,2}[-月/]\d{1,2}日?/g, ' ');
  const terms = conversationTerms(withoutDates).filter(term => !grammatical.has(term) && !/^\d+$/.test(term)).slice(0, 32);
  const named = terms.filter(term => /^[a-z][a-z0-9._-]{1,}$/i.test(term));
  return named.length ? named : terms;
}

/** One snapshot, one engine, serialized mutations/reads. Return original
 * source entries only; concept pages never become personal-fact citations. */
export function createGbrainRetriever() {
  let brain, queue = Promise.resolve();
  function enqueue(work) { const task = queue.then(work); queue = task.catch(() => {}); return task; }
  return {
    retrieve(index, messages, { signal } = {}) {
      return enqueue(async () => {
        checkSignal(signal);
        const cutoff = historicalCutoff(messages);
        const historical = cutoff ? index.entries.filter(entry => entry.date && entry.date.slice(0, 10) <= cutoff && (!entry.recordedAt || entry.recordedAt.slice(0, 10) <= cutoff)) : index.entries;
        const question=messages.at(-1).content;
        const structural=historical.filter(entry=>entry.codeMeta);
        const previousQuestion=messages.filter(message=>message.role==='user').at(-2)?.content||'';
        const currentSymbols=(question.match(/[a-z_$][\w$]*(?:\.[\w$]+)*/gi)||[]).map(word=>word.toLowerCase());
        const hasExplicitTarget=structural.some(entry=>currentSymbols.includes(entry.codeMeta.symbolName?.toLowerCase())||question.toLowerCase().includes(entry.codeMeta.repository.split('/').at(-1)));
        const routingQuestion=!hasExplicitTarget&&/这个|那个|它|继续|具体|还|为什么/.test(question)?previousQuestion+' '+question:question;
        const identifierWords=new Set((routingQuestion.match(/[a-z_$][\w$]*(?:\.[\w$]+)*/gi)||[]).map(word=>word.toLowerCase()));
        const matching=structural.filter(entry=>identifierWords.has(entry.codeMeta.symbolName?.toLowerCase())||identifierWords.has(entry.codeMeta.qualified?.split('::').slice(1).join('::').toLowerCase()));
        const explicitRepos=new Set(structural.map(entry=>entry.codeMeta.repository).filter(repo=>routingQuestion.toLowerCase().includes(repo.split('/').at(-1))));
        const codeIntent=/源码|代码|函数|方法|调用|定义|实现|创建|解析|加载|释放|权限|Code Brain/i.test(routingQuestion)||matching.length||explicitRepos.size;
        const selectedRepos=codeIntent?(explicitRepos.size?explicitRepos:new Set(matching.map(entry=>entry.codeMeta.repository))):new Set();
        if(codeIntent&&!selectedRepos.size)for(const entry of retrieveConversationEvidence({...index,entries:structural},messages).slice(0,4))selectedRepos.add(entry.codeMeta.repository);
        const allowed=historical.filter(entry=>entry.kind!=='code'||codeIntent&&(!entry.codeMeta||selectedRepos.has(entry.codeMeta.repository)));
        if (!allowed.length) return [];
        const allowedIds = new Set(allowed.map(entry => entry.id));
        const allowedUrls = new Set(allowed.map(entry => entry.url));
        const retrievalIndex = { ...index, ...(cutoff?{wiki:undefined}:{}), entries: allowed, relationships: (index.relationships || []).filter(edge => allowedUrls.has(edge.from) && allowedUrls.has(edge.to)) };
        if (!brain || brain.key !== knowledgeFingerprint(retrievalIndex)) {
          if (brain) { await brain.engine.disconnect(); brain = undefined; }
          brain = await buildBrain(retrievalIndex);
        }
        checkSignal(signal);
        let terms = retrievalTerms(question);
        // Named Latin entities keep grammatical
        // Chinese words from overwhelming the actual subject of a question.
        const previous = messages.slice(0, -1).filter(message => message.role === 'user').at(-1)?.content;
        const followup = /这个|那个|它|具体|继续|那时|当时|后来|为什么|现在|当前|最新/.test(question);
        if (!terms.length && previous && followup) terms = retrievalTerms(previous);
        if (!terms.length && /是谁|介绍.*(?:自己|你)|个人介绍|履历/.test(question)) terms = ['经历'];
        if (!terms.length) return [];
        // OR fallback only runs when the combined query has no matches.
        const search = (query, options = {}) => brain.engine.searchKeyword(query, { limit: 24, orFallback: true, sourceId: 'default', ...options });
        let hits = await search(terms.join(' '));
        if (!hits.length) {
          if (previous && followup) hits = await search(retrievalTerms(previous).join(' '));
          if (!hits.length && /是谁|介绍.*(?:自己|你)|个人介绍|履历/.test(question)) hits = await search('经历');
        }
        // A comparison must not lose one named article just because another
        // contains every query term. Keep GBrain's ranking within each search.
        const namedArticles=[];
        if(/跨|对照|比较|关联|联系/.test(question))for(const term of terms.filter(term=>/^[a-z]/i.test(term)).slice(0,8)) {
          const named=(await search(term,{type:'article',limit:12})).find(hit=>hit.title.toLowerCase().includes(term.toLowerCase()));
          if(named)namedArticles.push(named);
        }
        checkSignal(signal);
        const selected = [], used = new Set();
        function add(slug, limit = 1) {
          const entries = brain.pages.get(slug)?.entries.filter(entry => allowedIds.has(entry.id));
          if (!entries?.length || used.has(slug) || used.size >= 8 || selected.length >= 12) return;
          used.add(slug);
          const ranked = retrieveConversationEvidence({ ...index, entries }, messages).slice(0, Math.min(limit, 12 - selected.length));
          selected.push(...(ranked.length ? ranked : entries.slice(0, 1)));
        }
        function addWikiEvidence(slug) {
          for (const id of brain.pages.get(slug)?.evidenceIds || []) {
            if (selected.length >= 12) break;
            if (selected.some(entry => entry.id === id)) continue;
            const entry = allowed.find(entry => entry.id === id);
            if (!entry) continue;
            const source = sourceSlug(entry);
            if (!used.has(source) && used.size >= 8) continue;
            used.add(source); selected.push(entry);
          }
        }
        const identifiers=identifierWords;
        const codeEntries=allowed.filter(entry=>entry.codeMeta?.qualified);
        const repos=explicitRepos;
        const definitions=codeEntries.filter(entry=>(!repos.size||repos.has(entry.codeMeta.repository))&&(identifiers.has(entry.codeMeta.symbolName?.toLowerCase())||identifiers.has(entry.codeMeta.qualified.split('::').slice(1).join('::').toLowerCase()))).slice(0,4);
        for(const entry of definitions){
          if(selected.length>=6)break;
          add(sourceSlug(entry),2);
          const rows=[...await brain.engine.getCallersOf(entry.codeMeta.qualified,{sourceId:'default',limit:5}),...await brain.engine.getCalleesOf(entry.codeMeta.qualified,{sourceId:'default',limit:5})];
          for(const edge of rows)for(const id of [edge.from_chunk_id,edge.to_chunk_id]){const related=brain.codeChunks.get(id);if(related&&allowedIds.has(related.id)&&!selected.some(source=>source.id===related.id)&&selected.length<6){used.add(sourceSlug(related));selected.push(related);}}
        }
        const baseSeeds = hits.filter(hit => brain.pages.get(hit.slug)?.entries.some(entry => allowedIds.has(entry.id)) || brain.pages.get(hit.slug)?.frontmatter.model_synthesis || (brain.pages.get(hit.slug)?.type === 'concept' && terms.some(term => hit.title.toLowerCase().includes(term)))).slice(0, 3);
        // Long articles must not crowd out a relevant reviewed excerpt or the
        // independent personal record. Each slot still requires a real GBrain
        // keyword match; source types do not establish factual attribution.
        const diverse = [];
        if (allowed.some(entry => entry.kind === 'code')) {
          const code = await search(terms.join(' '), { type: 'code', limit: 1 });
          if (code.length) {
            diverse.push(...code);
            const types = [...new Set(allowed.filter(entry => entry.kind === 'record').map(entry => entry.recordKind))];
            if (types.length) diverse.push(...await search(terms.join(' '), { types, limit: 1 }));
            diverse.push(...await search(terms.join(' '), { type: 'article', limit: 1 }));
          }
        }
        const seeds = [...new Map([...namedArticles, ...diverse, ...baseSeeds].map(hit => [hit.slug, hit])).values()].slice(0, 5);
        for (const hit of seeds) { addWikiEvidence(hit.slug); add(hit.slug, 2); }
        // Traverse one hop in both directions. Synthesized Wiki pages link
        // directly to the originals that support their paragraphs.
        for (const hit of seeds) {
          const nodes = await brain.engine.traverseGraph(hit.slug, 1, { sourceId: 'default', frontierCap: 24 });
          const neighbours = nodes.filter(node => node.slug !== hit.slug && brain.pages.get(node.slug)?.entries.some(entry => allowedIds.has(entry.id)));
          const ranked = retrieveConversationEvidence({ ...index, entries: neighbours.flatMap(node => brain.pages.get(node.slug).entries).filter(entry => allowedIds.has(entry.id)) }, messages);
          const rankedSlugs = [...new Set(ranked.map(sourceSlug))];
          for (const slug of [...rankedSlugs, ...neighbours.map(node => node.slug)]) add(slug);
          checkSignal(signal);
        }
        return selected.slice(0, 12);
      });
    },
    close() { return enqueue(async () => { if (brain) await brain.engine.disconnect(); brain = undefined; }); },
  };
}
