import {createHash} from 'node:crypto';
import {conversationTerms,retrieveConversationEvidence} from './twin-knowledge.mjs';
import {wikiContext} from './twin-wiki.mjs';
export const knowledgeFingerprint=index=>createHash('sha256').update(JSON.stringify([index.entries,index.relationships||[],index.wiki||null])).digest('hex');
export function historicalCutoff(messages){
 const users=messages.filter(m=>m.role==='user'),latest=users.at(-1)?.content||'',pattern=/(?:截至|截止|到|as\s+of)\s*(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?/gi;
 let dates=[...latest.matchAll(pattern)];if(!dates.length&&!/现在|当前|最新|今天|如今/.test(latest)&&/当时|那时|这个|那个|它|继续|具体|后来/.test(latest))dates=[...users.slice(0,-1).map(m=>m.content).join('\n').matchAll(pattern)];
 if(!dates.length)return null;const [,y,m,d]=dates.at(-1),date=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,parsed=new Date(date+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null;
}
export async function retrieveTwinEvidence(index,messages,{signal}={}){
 signal?.throwIfAborted();const cutoff=historicalCutoff(messages),entries=index.entries.filter(e=>e.kind!=='code'&&(!cutoff||e.date&&e.date.slice(0,10)<=cutoff&&(!e.recordedAt||e.recordedAt.slice(0,10)<=cutoff)));
 const users=messages.filter(m=>m.role==='user');let query=users.at(-1)?.content||'';if(/^(这个|那个|它|继续|具体|然后|后来)/.test(query)&&users.length>1)query=users.at(-2).content+' '+query;query=query.replace(/\d{4}[-年/]\d{1,2}[-月/]\d{1,2}日?/g,' ').replace(/截至|截止|as\s+of/gi,' ');
 const visible={...index,entries},found=retrieveConversationEvidence(visible,[{role:'user',content:query}]),selected=new Map(found.map(e=>[e.id,e])),byId=new Map(entries.map(e=>[e.id,e]));
 const terms=conversationTerms(query);if(!cutoff)for(const p of wikiContext(visible,entries)){if(!terms.some(t=>(p.topic+' '+p.text).toLowerCase().includes(t)))continue;for(const id of p.sourceIds)if(selected.size<12)selected.set(id,byId.get(id));}
 const urls=new Set([...selected.values()].map(e=>e.url)),neighbors=new Set();for(const edge of index.relationships||[]){if(urls.has(edge.from))neighbors.add(edge.to);if(urls.has(edge.to))neighbors.add(edge.from);}for(const e of entries)if(selected.size<12&&neighbors.has(e.url))selected.set(e.id,e);return [...selected.values()];
}
