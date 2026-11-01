import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalCutoff,retrieveTwinEvidence} from '../lib/twin-retrieval.mjs';
const ask=content=>[{role:'user',content}];
const source=(id,text,extra={})=>({id,kind:'blog',title:id,searchTitle:id,text,url:'/docs/'+id,date:null,relatedIds:[],tags:[],sha256:id,...extra});

test('点名比较保留两篇原文，普通文章问题不携带源码',()=>{
 const evidence=source('evidence','Evidence binds every Claim to a concrete source.',{title:'Evidence 原理'});
 const runtime=source('runtime','Evidence Agent Runtime Harness Eval HTTP Claim.',{title:'Agent Runtime 与 Harness'});
 const decoys=Array.from({length:20},(_,i)=>source('decoy-'+i,'Evidence Agent Runtime Harness Eval HTTP Claim.'.repeat(5),{title:'Agent 相关长文 '+i}));
 const code=source('code','Evidence Agent Runtime Harness Eval HTTP Claim.',{kind:'code',title:'other/repository · README.md',codeMeta:{repository:'other/repository',symbolName:'unrelated',qualified:'other::unrelated',edges:[]}});
 const found=retrieveTwinEvidence({entries:[evidence,runtime,...decoys,code],relationships:[]},ask('对照 Evidence 与 Agent Runtime/Harness 的文章，HTTP 与 Eval 如何证明 Claim？'));
 assert.ok(found.some(entry=>entry.id==='evidence'));
 assert.ok(found.some(entry=>entry.id==='runtime'));
 assert.ok(found.every(entry=>entry.kind!=='code'));
 assert.ok(found.length<=12);
});

test('历史截止过滤未来和日期未知的来源，并随撤回立即失效',()=>{
 const old=source('old','AnyUse initially compares implementation routes.',{date:'2026-10-28',recordedAt:'2026-10-28'});
 const future=source('future','AnyUse selected Redroid after testing.',{date:'2026-10-30',recordedAt:'2026-10-30'});
 const unknown=source('unknown','AnyUse selected Redroid.',{});
 const index={entries:[old,future,unknown],relationships:[]};
 assert.equal(historicalCutoff(ask('截至2026-10-29，AnyUse 选了 Redroid 吗？')),'2026-10-29');
 assert.deepEqual(retrieveTwinEvidence(index,ask('截至2026-10-29，AnyUse 选了 Redroid 吗？')).map(entry=>entry.id),['old']);
 assert.deepEqual(retrieveTwinEvidence({...index,entries:[]},ask('AnyUse Redroid')),[]);
 const controller=new AbortController();controller.abort();
 assert.throws(()=>retrieveTwinEvidence(index,ask('AnyUse Redroid'),{signal:controller.signal}));
});

test('Wiki 页数超过八页时仍可通过后面的已校验来源找到原文',()=>{
 const target=source('target','The original source explains this boundary.');
 const filler=source('filler','Unrelated source text.');
 const pages=Array.from({length:9},(_,i)=>({title:'Other '+i,paragraphs:[{text:'Unrelated summary',evidence:[{sourceId:filler.id,sha256:filler.sha256}]}]}));
 pages.push({title:'Continuity',paragraphs:[{text:'Continuity has an original source.',evidence:[{sourceId:target.id,sha256:target.sha256}]}]});
 const found=retrieveTwinEvidence({entries:[filler,target],relationships:[],wiki:{pages}},ask('Continuity'));
 assert.ok(found.some(entry=>entry.id===target.id));
});
