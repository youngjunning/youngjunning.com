import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGlossary } from '../lib/article-glossary-model.mjs';
import { contentSubjects, inferSubjects } from '../lib/content-subjects.mjs';

const article = { id:'2222222222222222',content:'Noul 与 Box 的职责不同。' };
const relation = { term:'Box',definition:'图像位置问题的输出接口。',articleId:article.id };
const store = (...entries) => ({version:2,entries});
test('direct definitions retain article scope without a knowledge-note target', () => {
  assert.deepEqual(prepareGlossary(store(relation),[article]),store(relation));
  assert.deepEqual(prepareGlossary(store({...relation,articleId:null}),[article]).entries[0].articleId,null);
  assert.equal(prepareGlossary(store(relation,{...relation,articleId:null}),[article]).entries.length,2);
});
test('missing definitions and stale article terms fail validation', () => {
  for (const change of [{articleId:'3333333333333333'},{term:'NeverAppeared'},{term:''},{articleId:undefined},{definition:''},{favoriteId:'1111111111111111'}]) assert.throws(() => prepareGlossary(store({...relation,...change}),[article]));
  assert.throws(() => prepareGlossary(store(relation,relation),[article]),/Duplicate/);
});
test('reading subjects include business methods and remain independent from article structure topics', () => {
  assert.deepEqual(contentSubjects.map(item => item.id),['grounding','browser','memory','engineering','business','design','infra','agents']);
  assert.ok(inferSubjects({title:'从运营场景寻找合作切入点'}).includes('business'));
  assert.ok(inferSubjects({title:'Jev Noul 与 Box',tags:['Agent']}).includes('grounding'));
  assert.deepEqual(inferSubjects({title:'没有已知主题的内容'}),[]);
});
