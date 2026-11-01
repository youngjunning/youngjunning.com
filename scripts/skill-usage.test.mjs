import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectSkillUsage, validateSkillUsage } from '../lib/skill-usage.mjs';

function fixture() {
  const id = 'git:1234567890abcdef';
  return { audience: 'external', metric: 'verified_skill_read_turns', files: 2, triggerCount: 3, skillCount: 1,
    scan: { scanComplete: true, errors: [] },
    skills: [{ name: 'example', triggerCount: 3, firstSeen: '2026-01-01T00:00:00Z', lastSeen: '2026-01-02T00:00:00Z',
      sessionId: 'PRIVATE_SESSION', projects: [{ projectId: id, triggerCount: 3 }] }],
    projectAttribution: { projectCount: 1, directoryGroupCount: 0, unattributedTriggers: 0, ambiguousTriggers: 0, pendingBackfillObservations: 0,
      projects: [{ id, name: 'example-project', kind: 'git', triggerCount: 3, root: '/private/source', paths: ['/private/source'], callId: 'PRIVATE_CALL' }] } };
}
test('exports only aggregate fields, preserves totals and reuses unchanged snapshots', () => {
  const source = fixture(), result = projectSkillUsage(source, null, '2026-01-03T00:00:00Z');
  assert.equal(result.totals.triggerCount, 3);
  assert.equal(JSON.stringify(result).includes('PRIVATE_'), false);
  assert.equal(JSON.stringify(result).includes('/private/'), false);
  assert.deepEqual(projectSkillUsage(source, result, '2026-01-04T00:00:00Z'), result);
});
test('requires audience partitioning and rejects a snapshot for the other site', () => {
  const source = fixture();
  delete source.audience;
  assert.throws(() => projectSkillUsage(source), /audience-filtered/);
  const result = projectSkillUsage(fixture());
  assert.equal(result.audience, 'external');
  assert.throws(() => validateSkillUsage(result, 'internal'), /project audience/);
  validateSkillUsage(result, 'external');
});
test('public CLI refuses raw scans, internal inputs and unreviewed skill names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-audience-'));
  try {
    for (const audience of [undefined, 'internal', 'external']) {
      const source = fixture(); source.audience = audience;
      const file = path.join(dir, 'scan.json'); fs.writeFileSync(file, JSON.stringify(source));
      const result = spawnSync(process.execPath, ['scripts/export-skill-usage.mjs', '--input', file], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, audience === 'external' ? /reviewed public catalog/ : /Only an external audience-filtered scan/);
      assert.equal(result.stdout, '');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('rejects failed scans, inconsistent matrices, path leaks and unexpected fields', () => {
  const source = fixture(); source.scan.errors = ['read failed'];
  assert.throws(() => projectSkillUsage(source), /successful current scan/);
  const result = projectSkillUsage(fixture());
  result.skills[0].projects[0].triggerCount = 2;
  assert.throws(() => validateSkillUsage(result), /cross total/);
  result.skills[0].projects[0].triggerCount = 3;
  result.projects[0].name = '/private/source';
  assert.throws(() => validateSkillUsage(result), /project/);
  result.projects[0].name = 'project'; result.projects[0].root = '/private/source';
  assert.throws(() => validateSkillUsage(result), /unexpected fields/);
});
test('keeps directory clues and unknown attribution distinct from Git projects', () => {
  const source = fixture(), id = 'directory:1234567890abcdef';
  source.projectAttribution.projectCount = 0; source.projectAttribution.directoryGroupCount = 1;
  source.projectAttribution.unattributedTriggers = 3;
  Object.assign(source.projectAttribution.projects[0], { id, kind: 'directory' });
  source.skills[0].projects[0].projectId = id;
  const result = projectSkillUsage(source);
  assert.equal(result.projects[0].kind, 'directory');
  assert.equal(result.totals.projectCount, 0);
  assert.equal(result.totals.unattributedTriggers, 3);
});

test('an older scan cannot overwrite a newer changed snapshot', () => {
  const source = fixture(), previous = projectSkillUsage(source, null, '2026-01-03T00:00:00Z');
  source.triggerCount = 4; source.skills[0].triggerCount = 4;
  source.skills[0].projects[0].triggerCount = 4; source.projectAttribution.projects[0].triggerCount = 4;
  assert.throws(() => projectSkillUsage(source, previous, '2026-01-02T00:00:00Z'), /stale scan/);
});

test('explicit directory merges combine project and skill counts without matching names', () => {
  const source = fixture(), targetId = source.projectAttribution.projects[0].id;
  const ids = ['directory:1111111111111111', 'directory:2222222222222222', 'directory:3333333333333333'];
  source.projectAttribution.projects.push(...ids.map(id => ({ id, name: 'old-name', kind: 'directory', triggerCount: 2 })));
  source.skills[0].projects.push(...ids.map(projectId => ({ projectId, triggerCount: 2 })));
  source.triggerCount = source.skills[0].triggerCount = 9;
  source.projectAttribution.directoryGroupCount = 3;
  source.projectAttribution.unattributedTriggers = 6;
  const merges = [{ targetId, sourceIds: ids.slice(0, 2) }];
  const result = projectSkillUsage(source, null, '2026-01-03T00:00:00Z', merges);
  assert.equal(result.totals.triggerCount, 9);
  assert.equal(result.totals.projectCount, 1);
  assert.equal(result.totals.directoryGroupCount, 1);
  assert.equal(result.totals.unattributedTriggers, 2);
  assert.equal(result.projects.find(p => p.id === targetId).triggerCount, 7);
  assert.deepEqual(result.skills[0].projects, [{ projectId: targetId, triggerCount: 7 }, { projectId: ids[2], triggerCount: 2 }]);
  assert.deepEqual(projectSkillUsage(source, result, '2026-01-04T00:00:00Z', merges), result);
  assert.equal(source.projectAttribution.projects[0].triggerCount, 3);
  assert.equal(source.skills[0].projects.length, 4);
  assert.throws(() => projectSkillUsage(source, null, undefined, [{ targetId: 'git:0000000000000000', sourceIds: [ids[0]] }]), /existing Git target/);
  assert.throws(() => projectSkillUsage(source, null, undefined, [...merges, ...merges]), /overlapping/);
});
