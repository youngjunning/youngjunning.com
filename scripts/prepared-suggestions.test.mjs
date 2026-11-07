import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuggestionHandler} from '../lib/twin-suggestion-generator.mjs';
import {SUGGESTION_POLICY,suggestionContentKey,projectPreparedSuggestions} from '../lib/prepared-suggestions.mjs';
const source={id:'record-prepared',kind:'record',recordKind:'judgment',title:'事件回放',text:'任务先保存可回放事件再确认提交结果，避免进程重启后无法确认订单是否已提交，从而重复执行。',url:'/records/abcdef0123456789',sha256:'fixture',searchTitle:'事件回放',relatedIds:[]};
const question={id:'approved-question',question:'任务为什么先保存可回放事件再确认提交，如何避免重启后的重复执行？',kind:'record',topic:'事件回放',angle:'mechanism',evidence:[{sourceId:source.id,quote:source.text}]};
const index=()=>({version:1,entries:[source],relationships:[],wiki:{version:1,pages:[]}});
const prepared=data=>({version:1,policy:SUGGESTION_POLICY,key:suggestionContentKey(data,[question]),suggestions:[question]});
test('构建时已审核的题组在模型不可用时仍可立即展示，不能再次等待模型',async()=>{
 const data=index();data.preparedSuggestions=prepared(data);
 let calls=0;
 const handler=createSuggestionHandler({loadKnowledge:()=>data,env:{DEEPSEEK_API_KEY:'fixture'},fetcher:async()=>{calls++;return new Response('',{status:503});}});
 const response=await handler(new Request('https://fixture.example/api/chat/suggestions'));
 assert.equal(response.status,200);assert.equal(calls,0);assert.equal((await response.json()).suggestions[0].question,question.question);
});
test('资料撤回后不能展示旧题组',async()=>{
 const data=index();data.preparedSuggestions=prepared(data);
 data.entries=[];
 const response=await createSuggestionHandler({loadKnowledge:()=>data,env:{}})(new Request('https://fixture.example/api/chat/suggestions'));
 assert.equal(response.status,200);assert.deepEqual((await response.json()).suggestions,[]);
});
test('无关资料变化保留题组，引用来源变化仍需重新审核',()=>{
 const data=index(),artifact=prepared(data);
 data.entries.push({...source,id:'record-unrelated',url:'/records/unrelated',sha256:'unrelated'});
 assert.equal(projectPreparedSuggestions(data,artifact)?.length,1);
 data.entries[0]={...source,sha256:'changed'};
 assert.equal(projectPreparedSuggestions(data,artifact),null);
});
test('访问时不因无关资料竞争重算题组，实际问答检索由构建再次验收',()=>{
 const data=index(),artifact=prepared(data);
 for(let number=0;number<8;number++)data.entries.push({...source,id:`record-competitor-${number}`,url:`/records/competitor-${number}`,sha256:`competitor-${number}`});
 assert.equal(projectPreparedSuggestions(data,artifact)?.length,1);
});
