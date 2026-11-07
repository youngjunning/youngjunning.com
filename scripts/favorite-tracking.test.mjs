import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTracking, favoriteGraph } from '../lib/favorite-tracking.mjs';
const usage = {project:'Demo',projectUrl:'https://example.com',stage:'trial',purpose:'Prototype',evidence:'Source review'};
test('project use requires a concrete stage, project and evidence for every relationship', () => {
  validateTracking({});
  validateTracking({usages:[usage,{...usage,project:'Other',stage:'adopted'}]});
  for (const change of [{evidence:''},{stage:'unknown'},{projectUrl:'https://user:secret@example.com'},{extra:'invented'}]) assert.throws(() => validateTracking({usages:[{...usage,...change}]}));
});
test('graph preserves separate project states and explicit related content identities', () => {
  const favorites = [{id:'1',title:'Tool',tags:['React'],subjects:['design'],usages:[usage],relatedIds:['2']},{id:'2',title:'Note',tags:['React'],subjects:['design'],usages:[]}];
  const graph = favoriteGraph(favorites);
  assert.equal(graph.nodes.filter(node => node.type === 'project').length,1);
  assert.equal(graph.edges.filter(edge => edge.type === 'uses').length,1);
  assert.equal(graph.edges.find(edge => edge.type === 'uses').stage,'trial');
  assert.equal(graph.edges.find(edge => edge.type === 'related').target,'favorite:2');
  assert.equal(graph.nodes.find(node => node.id === 'favorite:1').url,'/favorites#1');
  assert.ok(graph.edges.every(edge => graph.nodes.some(node => node.id === edge.source) && graph.nodes.some(node => node.id === edge.target)));
});
test('shared subjects and tags express browsing relevance without implying project use', () => {
  const favorites = [{id:'1',title:'Tool',tags:['React'],subjects:['design'],usages:[]}];
  const documents = [{id:'article',tags:['React','React','Unrelated'],sourcePath:'posts/article.md'},{id:'other',tags:['Unrelated'],sourcePath:'posts/other.md'}];
  const graph = favoriteGraph(favorites,documents);
  const links = graph.edges.filter(edge => edge.source === 'article');
  assert.equal(links.length,1);assert.equal(links[0].target,'tag:React');assert.equal(links[0].type,'tagged');
  assert.equal(links[0].sourcePath,'posts/article.md');assert.match(links[0].evidence,/React/);
  assert.ok(!graph.edges.some(edge => edge.type === 'uses' || edge.source === 'other'));
  assert.ok(!graph.nodes.some(node => node.id === 'tag:Unrelated'));
  assert.ok(graph.nodes.some(node => node.id === 'subject:design'));
});

