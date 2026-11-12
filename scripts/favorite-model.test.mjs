import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalFavoriteUrl, prepareFavorites } from '../lib/favorite-model.mjs';
import { filterFavorites } from '../lib/favorite-search.mjs';
import { migrateFavoritesV2 } from './migrate-favorites-v2.mjs';

const item = (changes = {}) => ({ id:'1234567890abcdef', kind:'resource', type:'tool', title:'测试项目', url:'https://example.com/project', summary:'测试用途', reason:'与当前问题有关', tags:['Agent'], subjects:['agents'], attribution:'source', savedAt:'2026-10-30', selection:'discovered', visibility:'shared', sources:[{label:'测试会话第 3 行'}], ...changes });
const store = (...favorites) => ({ version:2, favorites });
const note = (changes = {}) => item({ kind:'note', type:'concept', url:null, attribution:'ai', note:{body:'PoC 用最小投入验证可行性，和 MVP 的用户价值验证不同。',date:null,recordedAt:'2026-10-28'}, ...changes });

test('knowledge notes keep their core explanation without inventing mandatory examples', () => {
  const value = note();
  assert.deepEqual(prepareFavorites(store(value)).favorites[0], value);
  assert.equal(filterFavorites([value], 'MVP', 'concept').length, 1);
  assert.equal(prepareFavorites(store({...value, visibility:'private'})).favorites.length, 0);
  const withSource = note({url:'https://example.com/concept',sources:[{label:'原始文档',url:'https://example.com/docs'}]});
  assert.equal(prepareFavorites(store(withSource)).favorites[0].url, 'https://example.com/concept');
  for (const changes of [{note:undefined},{note:{...value.note,body:''}},{sources:[]},{note:{...value.note,date:'2026-02-30'}},{note:{...value.note,example:''}}]) assert.throws(() => prepareFavorites(store({...value,...changes})));
});
test('favorites exclude private content and keep selection separate from attribution', () => {
  const result = prepareFavorites(store(item(), item({id:'2234567890abcdef',url:'https://example.com/private',title:'private-secret',visibility:'private'})));
  assert.equal(result.favorites.length, 1);
  assert.equal(result.favorites[0].selection, 'discovered');
  assert.equal(result.favorites[0].attribution, 'source');
  assert.ok(!JSON.stringify(result).includes('private-secret'));
});
test('favorites sort by original saved minute and preserve old same-day source order', () => {
  const oldA = item({id:'1234567890abcde1',url:'https://example.com/old-a',savedAt:'2026-11-02'});
  const oldB = item({id:'1234567890abcde2',url:'https://example.com/old-b',savedAt:'2026-11-02'});
  const morning = item({id:'1234567890abcde3',url:'https://example.com/morning',savedAt:'2026-11-02T09:12+08:00'});
  const evening = item({id:'1234567890abcde4',url:'https://example.com/evening',savedAt:'2026-11-02T18:34+08:00'});
  assert.deepEqual(prepareFavorites(store(oldA,morning,oldB,evening)).favorites.map(value => value.id), [evening.id,morning.id,oldA.id,oldB.id]);
});
test('external resources deduplicate canonical URLs while retaining semantic query parameters', () => {
  assert.equal(canonicalFavoriteUrl('https://example.com/project/?utm_source=x#readme'), 'https://example.com/project');
  assert.equal(canonicalFavoriteUrl('https://example.com/project///'), 'https://example.com/project');
  assert.equal(canonicalFavoriteUrl('https://example.com/project?b=2&a=1&utm_medium=x'), 'https://example.com/project?a=1&b=2');
  assert.throws(() => prepareFavorites(store(item(),item({id:'2234567890abcdef',url:'https://example.com/project/?utm_source=x#readme'}))), /Duplicate favorite URL/);
});
test('rejects unsafe provenance, mixed classification dimensions and invented dates', () => {
  for (const url of ['javascript:alert(1)','file:///tmp/a','https://user:pass@example.com']) assert.throws(() => prepareFavorites(store(item({url}))));
  for (const change of [{sources:[]},{reason:''},{savedAt:'2026-02-30'},{selection:'endorsed'},{attribution:'mastered'},{type:'concept'},{subjects:['imagined']},{subjects:[]},{priority:'reference'},{extra:'secret'}]) assert.throws(() => prepareFavorites(store(item(change))));
  assert.throws(() => prepareFavorites({version:1,favorites:[]}), /version 2/);
});
test('explicit content relations must exist and shared content cannot expose private notes', () => {
  const second = note({id:'2234567890abcdef'});
  assert.equal(prepareFavorites(store(item({relatedIds:[second.id]}),second)).favorites.length,2);
  for (const relatedIds of [['ffffffffffffffff'],[item().id],[second.id,second.id]]) assert.throws(() => prepareFavorites(store(item({relatedIds}),second)));
  assert.throws(() => prepareFavorites(store(item({relatedIds:[second.id]}),{...second,visibility:'private'})), /private/);
  assert.throws(() => prepareFavorites(store(note({usages:[{project:'A'}]}))), /resources/);
});
test('search combines independent type, subject, evidence of use and case-insensitive content', () => {
  const usage = {project:'真实项目',projectUrl:'https://example.com',stage:'trial',purpose:'原型',evidence:'源码路径'};
  const entries = [item({reason:'用于浏览器自动化',subjects:['browser','agents'],usages:[usage]}),note({id:'2234567890abcdef',type:'method',subjects:['business'],note:{body:'先观察运营场景，发现合作机会',date:null,recordedAt:'2026-10-30'}})];
  assert.equal(filterFavorites(entries,' agent 自动化 ','tool','browser',true).length,1);
  assert.equal(filterFavorites(entries,'运营','method','business')[0].id,entries[1].id);
  assert.equal(filterFavorites(entries,'','all','business',true).length,0);
  assert.equal(filterFavorites([item({usages:[{...usage,stage:'retired'}]})],'','tool','agents',true).length,1);
  assert.equal(filterFavorites(entries,'').length,2);
  const uiFavorites = [item({tags:['UI','组件库']}), item({id:'2234567890abcdef',tags:['UI','Prompt']})];
  assert.equal(filterFavorites(uiFavorites, '', 'all', 'all', false, 'UI').length, 2);
  assert.deepEqual(filterFavorites(uiFavorites, '', 'all', 'all', false, '组件库').map(value => value.id), [uiFavorites[0].id]);
});
test('reviewed migration preserves all original identities, times, sources and project evidence', () => {
  const archive = JSON.parse(fs.readFileSync(new URL('../content/archive/migrations/favorites-v2-2026-11-07.json',import.meta.url)));
  const current = JSON.parse(fs.readFileSync(new URL('../content/favorites.json',import.meta.url)));
  const migrated = migrateFavoritesV2(archive.source,archive.decisions);
  const migratedIds = new Set(migrated.favorites.map(item => item.id));
  assert.ok(migrated.favorites.every(item => current.favorites.some(value => value.id === item.id)));
  assert.ok(current.favorites.length >= migrated.favorites.length);
  assert.equal(archive.decisions.length,103);
  assert.equal(prepareFavorites(current).favorites.length,current.favorites.length);
  for (const old of archive.source.favorites) {
    const value = current.favorites.find(item => item.id === old.id);
    for (const key of ['title','savedAt','selection','visibility','url']) assert.deepEqual(value[key],old[key]);
    if (value.updatedAt) {
      assert.deepEqual(value.sources.slice(0, old.sources.length),old.sources);
      for (const usage of old.usages || []) {
        assert.ok((value.usages || []).some(currentUsage => currentUsage.project === usage.project));
        assert.ok(value.sources.some(source => source.url === usage.evidence) ||
          (value.usages || []).some(currentUsage => currentUsage.evidence === usage.evidence));
      }
    } else {
      assert.deepEqual(value.sources,old.sources);
      assert.deepEqual(value.usages || [],old.usages || []);
    }
    assert.equal('adoption' in value || 'priority' in value || 'card' in value,false);
    if (old.card) assert.equal(value.note.body,old.card.understanding);
  }
  assert.equal(current.favorites.find(item => item.id === '38c6d9646e0e792d').type,'method');
  assert.equal(current.favorites.find(item => item.id === '758f3da9f36fd98f').type,'method');
  assert.throws(() => migrateFavoritesV2({...archive.source,favorites:archive.source.favorites.slice(1)},archive.decisions), /identity/);
});
test('public content rejects private favorites and reads the current source after a removal', async () => {
  const os = await import('node:os'), path = await import('node:path');
  const {readPublicContent} = await import('../lib/content-store.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'favorite-public-'));
  try {
    fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});
    fs.writeFileSync(path.join(root,'content/records.json'),JSON.stringify({version:2,records:[]}));
    const file = path.join(root,'content/favorites.json');
    fs.writeFileSync(file,JSON.stringify(store(item(),item({id:'2234567890abcdef',url:'https://example.com/private',visibility:'private'}))));
    assert.throws(() => readPublicContent(root), /private/);
    fs.writeFileSync(file,JSON.stringify(store(item())));
    assert.equal(readPublicContent(root).favorites.length,1);
    fs.writeFileSync(file,JSON.stringify(store()));
    assert.deepEqual(readPublicContent(root).favorites,[]);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
