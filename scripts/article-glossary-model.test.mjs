import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGlossary } from '../lib/article-glossary-model.mjs';
import { contentSubjects, inferSubjects } from '../lib/content-subjects.mjs';

const note = { id:'1111111111111111',kind:'note',visibility:'shared' };
const article = { id:'2222222222222222',content:'Noul 与 Box 的职责不同。' };
const relation = { term:'Box',favoriteId:note.id,articleId:article.id };
const store = (...entries) => ({version:1,entries});
test('explicit term relations retain article scope and independent knowledge-note identity', () => {
  assert.deepEqual(prepareGlossary(store(relation),[note],[article]),store(relation));
  assert.deepEqual(prepareGlossary(store({...relation,articleId:null}),[note],[article]).entries[0].articleId,null);
  assert.equal(prepareGlossary(store(relation,{...relation,articleId:null}),[note],[article]).entries.length,2);
});
test('missing, private or non-note targets and stale article terms fail validation', () => {
  for (const favorites of [[],[{...note,visibility:'private'}],[{...note,kind:'resource'}]]) assert.throws(() => prepareGlossary(store(relation),favorites,[article]),/shared knowledge note/);
  for (const change of [{articleId:'3333333333333333'},{term:'NeverAppeared'},{term:''},{articleId:undefined},{extra:'guessed'}]) assert.throws(() => prepareGlossary(store({...relation,...change}),[note],[article]));
  assert.throws(() => prepareGlossary(store(relation,relation),[note],[article]),/Duplicate/);
});
test('reading subjects include business methods and remain independent from article structure topics', () => {
  assert.deepEqual(contentSubjects.map(item => item.id),['grounding','browser','memory','engineering','business','design','infra','agents']);
  assert.ok(inferSubjects({title:'从运营场景寻找合作切入点'}).includes('business'));
  assert.ok(inferSubjects({title:'Jev Noul 与 Box',tags:['Agent']}).includes('grounding'));
  assert.deepEqual(inferSubjects({title:'没有已知主题的内容'}),[]);
});
