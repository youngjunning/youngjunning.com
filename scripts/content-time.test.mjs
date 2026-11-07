import test from 'node:test';
import assert from 'node:assert/strict';
import { displayContentTime, shanghaiMinute, validContentTime } from '../lib/content-time.mjs';

test('content times keep historical date precision and validate Shanghai minutes', () => {
  assert.equal(validContentTime('2026-11-02'), true);
  assert.equal(validContentTime('2026-11-02T16:07+08:00'), true);
  for (const value of ['2026-02-30', '2026-02-30T16:07+08:00', '2026-11-02T24:00+08:00', '2026-11-02T16:60+08:00', '2026-11-02T16:07']) assert.equal(validContentTime(value), false);
  assert.equal(shanghaiMinute(new Date('2026-11-02T08:07:59Z')), '2026-11-02T16:07+08:00');
  assert.equal(displayContentTime('2026-11-02T16:07+08:00'), '2026-11-02 16:07');
  assert.equal(displayContentTime('2026-11-02'), '2026-11-02');
});
