import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSources, validateAnswer } from '../lib/chat.mjs';
const sources = [{id:'one',title:'判断',href:'/records/one',text:'项目发布必须区分源码提交和部署结果。'},{id:'two',title:'文章',href:'/blog/two',text:'浏览器中的 Agent。'}];
test('retrieval returns relevant evidence and refuses unrelated questions', () => { assert.equal(selectSources('项目发布',sources)[0].id,'one'); assert.deepEqual(selectSources('火星天气',sources),[]); });
test('citation links are constructed from actual retrieved sources', () => { const answer = validateAnswer({answer:'根据公开记录。',sourceIds:['one','one']},sources); assert.deepEqual(answer.sources,[{id:'one',title:'判断',href:'/records/one'}]); });
test('fabricated citations and answer links fail closed', () => { for(const output of [{answer:'结果',sourceIds:['fake']},{answer:'https://example.com',sourceIds:['one']},{answer:'结果',sourceIds:[]}]) assert.throws(() => validateAnswer(output,sources)); });
