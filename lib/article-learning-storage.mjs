const learningStorageKey = documentId => `article-learning:v3:${documentId}`;
const previousStorageKey = documentId => `article-learning:v2:${documentId}`;
const legacyStorageKey = documentId => `feynman-learning:v1:${documentId}`;

const emptyStore = () => ({ version: 3, activeMode: 'guided', activeTopic: 'article', guidedSupport: 'full', guided: {}, feynman: {} });

function validStore(value) {
  if (!value || typeof value !== 'object') return false;
  return value.version === 3
    && (value.activeMode === 'guided' || value.activeMode === 'feynman')
    && typeof value.activeTopic === 'string'
    && (value.guidedSupport === 'full' || value.guidedSupport === 'light' || value.guidedSupport === 'independent')
    && Boolean(value.guided) && typeof value.guided === 'object'
    && Boolean(value.feynman) && typeof value.feynman === 'object';
}

function validPreviousStore(value) {
  if (!value || typeof value !== 'object') return false;
  return value.version === 2
    && (value.activeMode === 'guided' || value.activeMode === 'feynman')
    && typeof value.activeTopic === 'string'
    && Boolean(value.guided) && typeof value.guided === 'object'
    && Boolean(value.feynman) && typeof value.feynman === 'object';
}

function validLegacyStore(value) {
  if (!value || typeof value !== 'object') return false;
  return value.version === 1
    && typeof value.activeTopic === 'string'
    && Boolean(value.topics) && typeof value.topics === 'object';
}

function readValidStore(storage, key, valid) {
  const raw = storage.getItem(key);
  if (raw === null) return { found: false, value: null };
  try {
    const value = JSON.parse(raw);
    return { found: true, value: valid(value) ? value : null };
  } catch {
    return { found: true, value: null };
  }
}

export { learningStorageKey };

export function loadLearningStore(storage, documentId) {
  try {
    const current = readValidStore(storage, learningStorageKey(documentId), validStore);
    if (current.value) return { source: 'v3', store: current.value, storageAvailable: true, canPersist: true };

    const previous = readValidStore(storage, previousStorageKey(documentId), validPreviousStore);
    if (previous.value) return { source: 'v2', store: { ...previous.value, version: 3, guidedSupport: 'full' }, storageAvailable: true, canPersist: true };

    const legacy = readValidStore(storage, legacyStorageKey(documentId), validLegacyStore);
    if (legacy.value) {
      return {
        source: 'v1',
        store: { version: 3, activeMode: 'guided', activeTopic: legacy.value.activeTopic, guidedSupport: 'full', guided: {}, feynman: legacy.value.topics },
        storageAvailable: true,
        canPersist: true,
      };
    }

    return { source: 'default', store: emptyStore(), storageAvailable: true, canPersist: !current.found && !previous.found && !legacy.found };
  } catch {
    return { source: 'default', store: emptyStore(), storageAvailable: false, canPersist: false };
  }
}

export function saveLearningStore(storage, documentId, store) {
  storage.setItem(learningStorageKey(documentId), JSON.stringify(store));
}
