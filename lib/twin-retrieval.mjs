import {createHash} from 'node:crypto';
import {conversationTerms,retrieveConversationEvidence} from './twin-knowledge.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const knowledgeFingerprint=index=>hash([index.entries,index.relationships||[],index.wiki||null]);

export function historicalCutoff(messages){
 const users=messages.filter(message=>message.role==='user'),latest=users.at(-1)?.content||'';
 const pattern=/(?:截至|截止|到|as\s+of)\s*(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?/gi;
 let dates=[...latest.matchAll(pattern)];
 if(!dates.length&&!/现在|当前|最新|今天|如今/.test(latest)&&/当时|那时|这个|那个|它|继续|具体|后来/.test(latest))dates=[...users.slice(0,-1).map(message=>message.content).join('\n').matchAll(pattern)];
 if(!dates.length)return null;
 const [,year,month,day]=dates.at(-1),date=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`,parsed=new Date(date+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null;
}
const normalize=text=>(text||'').normalize('NFKC').toLowerCase();
const namedWords=question=>[...new Set((question.match(/[a-z][a-z0-9._-]{3,}/gi)||[]).map(normalize))].filter(word=>!['http','https','what','when','which','with','from','that','this'].includes(word));
function checkSignal(signal){if(signal?.aborted)throw signal.reason||new Error('Retrieval cancelled');}

/** Source-only retrieval. The caller owns the snapshot and citation policy. */
export function retrieveTwinEvidence(index,messages,{signal}={}){
 checkSignal(signal);
 const cutoff=historicalCutoff(messages);
 const entries=cutoff?index.entries.filter(entry=>entry.date&&entry.date.slice(0,10)<=cutoff&&(!entry.recordedAt||entry.recordedAt.slice(0,10)<=cutoff)):index.entries;
 if(!entries.length)return [];
 const users=messages.filter(message=>message.role==='user'),latest=users.at(-1)?.content||'',previous=users.at(-2)?.content||'';
 const followup=/^(这个|那个|它|继续|具体|然后|后来|还)|当时|那时/.test(latest)&&previous;
 const query=((followup?previous+' ':'')+latest).replace(/\d{4}[-年/]\d{1,2}[-月/]\d{1,2}日?/g,' ').replace(/截至|截止|as\s+of/gi,' ');
 const terms=conversationTerms(query),code=entries.filter(entry=>entry.codeMeta),symbols=new Set((query.match(/[a-z_$][\w$]*(?:\.[\w$]+)*/gi)||[]).map(normalize));
 const matching=code.filter(entry=>symbols.has(normalize(entry.codeMeta.symbolName))||symbols.has(normalize(entry.codeMeta.qualified?.split('::').at(-1))));
 const explicitRepos=new Set(code.map(entry=>entry.codeMeta.repository).filter(repo=>normalize(query).includes(normalize(repo.split('/').at(-1)))));
 const codeIntent=/源码|函数|方法|调用|定义|实现|静态分析|Code Brain/i.test(query)||matching.length||explicitRepos.size;
 const selectedRepos=explicitRepos.size?explicitRepos:new Set(matching.map(entry=>entry.codeMeta.repository));
 if(codeIntent&&!selectedRepos.size)for(const entry of retrieveConversationEvidence({entries:code},[{role:'user',content:query}]).slice(0,3))selectedRepos.add(entry.codeMeta.repository);
 const visible=entries.filter(entry=>!entry.codeMeta||codeIntent&&selectedRepos.has(entry.codeMeta.repository));
 const byId=new Map(visible.map(entry=>[entry.id,entry])),groups=new Map();
 for(const entry of visible){if(!groups.has(entry.url))groups.set(entry.url,[]);groups.get(entry.url).push(entry);}
 const selected=new Map(),counts=new Map();
 function add(entry,limit=entry?.codeMeta?4:2){if(!entry||selected.has(entry.id)||selected.size>=12||(counts.get(entry.url)||0)>=limit)return;selected.set(entry.id,entry);counts.set(entry.url,(counts.get(entry.url)||0)+1);}
 function rank(sources){return retrieveConversationEvidence({entries:sources},[{role:'user',content:query}]);}
 // Exact code symbols anchor the result. Only unique, same-repository static edges may expand it.
 if(codeIntent){
  const scoped=visible.filter(entry=>entry.codeMeta),definitions=matching.length?matching:rank(scoped).slice(0,2),byQualified=new Map();
  for(const entry of scoped)if(entry.codeMeta.qualified){const key=entry.codeMeta.qualified,group=byQualified.get(key)||[];group.push(entry);byQualified.set(key,group);}
  for(const definition of definitions.slice(0,4))add(definition);
  for(const definition of definitions.slice(0,4)){
   for(const edge of definition.codeMeta.edges||[]){const targets=byQualified.get(edge.target)||[];if(targets.length===1&&targets[0].codeMeta.repository===definition.codeMeta.repository)add(targets[0]);if(selected.size>=6)break;}
   for(const caller of scoped){if(caller.codeMeta.repository===definition.codeMeta.repository&&caller.codeMeta.edges?.some(edge=>edge.target===definition.codeMeta.qualified))add(caller);if(selected.size>=6)break;}
   if(selected.size>=6)break;
  }
 }
 // Reserve a source from each explicitly named article before general ranking fills the budget.
 if(/对照|比较|跨文章|联系|关联|compare/i.test(latest)){
  const named=namedWords(latest),titles=[...groups.values()].filter(group=>group[0].kind==='blog'&&named.some(word=>normalize(group[0].title).includes(word)));
  titles.sort((a,b)=>named.filter(word=>normalize(b[0].title).includes(word)).length-named.filter(word=>normalize(a[0].title).includes(word)).length);
  for(const group of titles.slice(0,3))add(rank(group)[0]||group[0]);
 }
 for(const entry of rank(visible))add(entry);
 checkSignal(signal);
 if(!cutoff&&selected.size<12){
  const navigation=[];
  for(const page of index.wiki?.pages||[])for(const paragraph of page.paragraphs||[]){
   if(!paragraph.evidence?.length||!paragraph.evidence.every(ref=>byId.get(ref.sourceId)?.sha256===ref.sha256))continue;
   const title=normalize(page.title),body=normalize(paragraph.text);
   const score=terms.reduce((value,term)=>value+(title.includes(term)?3:0)+(body.includes(term)?1:0),0);
   if(score)navigation.push({score,paragraph});
  }
  navigation.sort((a,b)=>b.score-a.score);
  for(const {paragraph} of navigation.slice(0,4))for(const ref of paragraph.evidence)add(byId.get(ref.sourceId));
 }
 const urls=new Set([...selected.values()].map(entry=>entry.url)),neighbors=new Set();
 for(const edge of index.relationships||[]){if(urls.has(edge.from))neighbors.add(edge.to);if(urls.has(edge.to))neighbors.add(edge.from);}
 for(const entry of rank(visible.filter(entry=>neighbors.has(entry.url))))add(entry,1);
 for(const url of neighbors){if(selected.size>=12)break;add(groups.get(url)?.[0],1);}
 checkSignal(signal);
 return [...selected.values()];
}
