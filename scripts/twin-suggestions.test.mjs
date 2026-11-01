import test from 'node:test';
import assert from 'node:assert/strict';
import { pickConversationSuggestions } from '../lib/twin-suggestions.mjs';

test('refresh excludes previous batch and mixes records, blogs and topics', () => {
  const pool = Array.from({ length: 12 }, (_, i) => ({ id: String(i), question: String(i), kind: i % 2 ? 'blog' : 'record', topic: String(i % 3) }));
  for (let i = 0; i < 30; i++) {
    const first = pickConversationSuggestions(pool);
    const second = pickConversationSuggestions(pool, first.map(item => item.id));
    for (const batch of [first, second]) {
      assert.equal(batch.length, 3);
      assert.equal(new Set(batch.map(item => item.kind)).size, 2);
      assert.equal(new Set(batch.map(item => item.topic)).size, 3);
      assert.equal(new Set(batch.map(item => item.id)).size, 3);
    }
    assert.ok(second.every(item => !first.some(old => old.id === item.id)));
  }
});

test('small pools fill available slots even with one topic or source kind', () => {
  const pool = Array.from({ length: 4 }, (_, i) => ({ id: String(i), kind: 'blog', topic: 'browser' }));
  assert.deepEqual(pickConversationSuggestions([]), []);
  assert.equal(pickConversationSuggestions(pool.slice(0, 1)).length, 1);
  assert.equal(pickConversationSuggestions(pool.slice(0, 2), ['0']).length, 2);
  assert.equal(pickConversationSuggestions(pool, ['0', '1', '2']).length, 3);
});
