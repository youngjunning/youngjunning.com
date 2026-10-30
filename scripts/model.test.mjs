import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicText, validateRecords, validateFavorites, canonicalUrl } from '../lib/model.mjs';
const record = { id:'0000000000000001',kind:'judgment',title:'工程交付',text:'在项目中分别验证源码与部署结果。',context:'讨论发布验收。',date:'2026-10-30',recordedAt:'2026-10-30',visibility:'shared',articleId:null,projectId:null,relatedIds:[],sources:[{kind:'statement',label:'本人陈述，公开摘要。'}],basis:'本人明确选择。',alternatives:[],outcome:null };
test('records preserve unknown outcome and partial experience dates', () => {
  const experience = {id:'0000000000000002',kind:'experience',title:'开发经历',text:'从事软件开发。',context:'履历。',date:null,recordedAt:'2026-10-30',visibility:'shared',articleId:null,projectId:null,relatedIds:[],sources:record.sources,period:'2017 年起',start:'2017',end:null,ongoing:true};
  assert.equal(validateRecords({version:2,records:[record,experience]})[0].outcome,null);
});
test('records reject duplicates, private data, unsupported claims schema, invalid dates and broken relations', () => {
  for (const update of [{visibility:'private'},{date:'2026-02-30'},{relatedIds:['0000000000000009']},{projectId:record.id},{role:'invented'}]) assert.throws(() => validateRecords({version:2,records:[{...record,...update}]}));
  assert.throws(() => validateRecords({version:2,records:[record,record]}));
});
test('real changes must point to history and contain different before and after states', () => {
  const change = {...record,id:'0000000000000002',kind:'change',subjectId:record.id,before:'原先状态',after:'后来状态',reason:'本人纠正。'};
  delete change.basis; delete change.alternatives; delete change.outcome;
  assert.equal(validateRecords({version:2,records:[record,change]}).length,2);
  assert.throws(() => validateRecords({version:2,records:[record,{...change,after:change.before}]}));
});
test('public scanner rejects local locators and credential links', () => {
  for(const value of ['/Users/example/project','https://example.com/?access_token=abc','https://name:password@example.com/','https://127.0.0.1/private']) assert.throws(() => assertPublicText(value));
  assert.doesNotThrow(() => assertPublicText('本人陈述，公开摘要。 https://github.com/youngjunning'));
  assert.doesNotThrow(() => assertPublicText('https://www.atlassian.com/dam/jcr%3Ac13e0440-f990-4e13-b226-1f3cf6eb37d4/Decision.pdf'));
  assert.throws(() => assertPublicText('会话 11111111-2222-3333-4444-555555555555'));
});
test('favorites deduplicate tracking noise but preserve semantic query parameters', () => {
  assert.equal(canonicalUrl('https://example.com/tool/?utm_source=mail#demo'),canonicalUrl('https://example.com/tool'));
  assert.notEqual(canonicalUrl('https://example.com/?id=1'),canonicalUrl('https://example.com/?id=2'));
  const favorite = {id:'0000000000000001',kind:'project',title:'Resource',url:'https://example.com/tool',summary:'用于查阅。',reason:'有稳定原始出处。',tags:[],savedAt:'2026-10-30',selection:'discovered',visibility:'shared',sources:[{label:'官方文档'}]};
  assert.equal(validateFavorites({version:1,favorites:[favorite]})[0].selection,'discovered');
  assert.throws(() => validateFavorites({version:1,favorites:[favorite,{...favorite,id:'0000000000000002',url:'https://example.com/tool/?utm_source=mail'}]}));
});
