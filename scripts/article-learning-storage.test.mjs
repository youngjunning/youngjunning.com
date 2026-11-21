import test from 'node:test';
import assert from 'node:assert/strict';
import {
  learningStorageKey,
  loadLearningStore,
  saveLearningStore,
} from '../lib/article-learning-storage.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    snapshot() { return Object.fromEntries(values); },
  };
}

const topicProgress = { step: 3, explanation: '用自己的话解释概念。', gaps: '还要补一个例子。', simple: '概念加上例子。', confidence: 'clear' };
const guidedProgress = { step: 4, support: 'light', focus: 'apply', note: '记录一个实际场景。', takeaway: '知道了适用条件。', confidence: 'teach', completedAt: '2026-11-16T08:00:00.000Z' };
const v2Store = {
  version: 2,
  activeMode: 'feynman',
  activeTopic: 'heading-1',
  guided: { article: guidedProgress },
  feynman: { 'heading-1': topicProgress },
};
const v3Store = { ...v2Store, version: 3, guidedSupport: 'light' };
const v1Store = { version: 1, activeTopic: 'heading-2', topics: { 'heading-2': topicProgress } };

test('优先保留有效 v3 的学习进度、模式和主题支持等级', () => {
  const storage = memoryStorage({
    [learningStorageKey('article-a')]: JSON.stringify(v3Store),
    'article-learning:v2:article-a': JSON.stringify({ ...v2Store, activeTopic: 'article' }),
  });

  assert.deepEqual(loadLearningStore(storage, 'article-a'), { source: 'v3', store: v3Store, storageAvailable: true, canPersist: true });
});

test('将 v2 记录升级为 v3，同时保留费曼模式和全部主题进度', () => {
  const storage = memoryStorage({ 'article-learning:v2:article-a': JSON.stringify(v2Store) });

  assert.deepEqual(loadLearningStore(storage, 'article-a'), {
    source: 'v2',
    storageAvailable: true,
    canPersist: true,
    store: { ...v2Store, version: 3, guidedSupport: 'full' },
  });
});

test('将 v1 费曼记录升级为 v3，不丢失旧主题进度', () => {
  const storage = memoryStorage({ 'feynman-learning:v1:article-a': JSON.stringify(v1Store) });

  assert.deepEqual(loadLearningStore(storage, 'article-a'), {
    source: 'v1',
    storageAvailable: true,
    canPersist: true,
    store: { version: 3, activeMode: 'guided', activeTopic: 'heading-2', guidedSupport: 'full', guided: {}, feynman: v1Store.topics },
  });
});

test('损坏的 v3 会回退到有效 v2，而不会以默认状态覆盖旧进度', () => {
  const storage = memoryStorage({
    'article-learning:v3:article-a': '{not-json',
    'article-learning:v2:article-a': JSON.stringify(v2Store),
  });

  assert.deepEqual(loadLearningStore(storage, 'article-a'), {
    source: 'v2',
    storageAvailable: true,
    canPersist: true,
    store: { ...v2Store, version: 3, guidedSupport: 'full' },
  });
});

test('格式无效的 v3 会继续回退到 v1', () => {
  const storage = memoryStorage({
    'article-learning:v3:article-a': JSON.stringify({ version: 3, activeMode: 'guided' }),
    'article-learning:v2:article-a': JSON.stringify({ version: 2 }),
    'feynman-learning:v1:article-a': JSON.stringify(v1Store),
  });

  assert.equal(loadLearningStore(storage, 'article-a').source, 'v1');
});

test('没有可恢复旧档时，不授权自动默认写回覆盖损坏存档', () => {
  const storage = memoryStorage({ 'article-learning:v3:article-a': '{not-json' });

  assert.equal(loadLearningStore(storage, 'article-a').canPersist, false);
});

test('不同文章只读取和写入各自的 v3 键', () => {
  const storage = memoryStorage({
    [learningStorageKey('article-a')]: JSON.stringify(v3Store),
    'article-learning:v2:article-b': JSON.stringify({ ...v2Store, activeTopic: 'article' }),
  });

  assert.equal(loadLearningStore(storage, 'article-a').store.activeTopic, 'heading-1');
  assert.equal(loadLearningStore(storage, 'article-b').store.activeTopic, 'article');
  saveLearningStore(storage, 'article-b', { ...v3Store, activeMode: 'guided', activeTopic: 'heading-0' });
  assert.deepEqual(JSON.parse(storage.snapshot()[learningStorageKey('article-b')]), { ...v3Store, activeMode: 'guided', activeTopic: 'heading-0' });
  assert.equal(JSON.parse(storage.snapshot()[learningStorageKey('article-a')]).activeTopic, 'heading-1');
});

test('切换为两种学习模式后刷新，均恢复所选模式', () => {
  for (const activeMode of ['guided', 'feynman']) {
    const storage = memoryStorage();
    saveLearningStore(storage, 'article-a', { ...v3Store, activeMode });
    assert.equal(loadLearningStore(storage, 'article-a').store.activeMode, activeMode);
  }
});

test('支持等级变化及主题独立等级会在刷新后恢复', () => {
  const store = {
    ...v3Store,
    guidedSupport: 'independent',
    guided: { article: { ...guidedProgress, support: 'light' } },
  };
  const storage = memoryStorage();
  saveLearningStore(storage, 'article-a', store);

  assert.deepEqual(loadLearningStore(storage, 'article-a').store, store);
});
