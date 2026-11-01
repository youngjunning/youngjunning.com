import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSuggestionHandler} from '../lib/twin-suggestion-generator.mjs';
import {SUGGESTION_POLICY} from '../lib/prepared-suggestions.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const source={id:'record-prepared',kind:'record',recordKind:'judgment',title:'事件回放',text:'任务先保存可回放事件再确认提交结果，避免进程重启后无法确认订单是否已提交，从而重复执行。',url:'/records/abcdef0123456789',sha256:'fixture',searchTitle:'事件回放',relatedIds:[]};
const question={id:'approved-question',question:'任务为什么先保存可回放事件再确认提交，如何避免重启后的重复执行？',kind:'record',topic:'事件回放',angle:'mechanism',evidence:[{sourceId:source.id,quote:source.text}]};
const index=()=>({version:1,entries:[source],relationships:[],wiki:{version:1,pages:[]}});
test('构建时已审核的题组在模型不可用时仍可立即展示，不能再次等待模型',async()=>{
 const data=index();data.preparedSuggestions={version:1,policy:SUGGESTION_POLICY,key:hash([data.entries,data.relationships,data.wiki]),suggestions:[question]};
 let calls=0;
 const handler=createSuggestionHandler({loadKnowledge:()=>data,env:{DEEPSEEK_API_KEY:'fixture'},fetcher:async()=>{calls++;return new Response('',{status:503});}});
 const response=await handler(new Request('https://fixture.example/api/chat/suggestions'));
 assert.equal(response.status,200);assert.equal(calls,0);assert.equal((await response.json()).suggestions[0].question,question.question);
});
test('资料撤回后不能展示旧题组，快照变更会失效',async()=>{
 const data=index();data.preparedSuggestions={version:1,policy:SUGGESTION_POLICY,key:hash([data.entries,data.relationships,data.wiki]),suggestions:[question]};
 data.entries=[];
 const response=await createSuggestionHandler({loadKnowledge:()=>data,env:{}})(new Request('https://fixture.example/api/chat/suggestions'));
 assert.equal(response.status,200);assert.deepEqual((await response.json()).suggestions,[]);
});
