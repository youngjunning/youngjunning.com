import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, cpSync, writeFileSync, unlinkSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { run } from '../.codex/skills/silicon-junning/scripts/read.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, '.codex/skills/silicon-junning');
const release = JSON.parse(readFileSync(join(root, 'public/skills/silicon-junning.json')));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('public reader release matches its five whitelisted source files and runs after independent extraction', t => {
  const archive = join(root, 'public/skills/silicon-junning.zip');
  const bytes = readFileSync(archive);
  assert.equal(release.name, 'junning');
  assert.equal(release.directory, 'silicon-junning');
  assert.equal(release.archiveUrl, '/skills/silicon-junning.zip');
  assert.equal(release.bytes, bytes.length);
  assert.equal(release.sha256, digest(bytes));
  assert.deepEqual(release.files.map(file => file.path).sort(), ['SKILL.md', 'agents/openai.yaml', 'references/api.md', 'scripts/read-core.mjs', 'scripts/read.mjs']);
  for (const file of release.files) {
    const data = readFileSync(join(source, file.path));
    assert.equal(file.sha256, digest(data));
    assert.doesNotMatch(data.toString(), /alibaba-inc\.com|atatech\.org|cdn\.fliggy\.com|\/Users\/|ZISHENG_BASE_URL|\$zisheng|硅基紫升/);
  }
  const dir = mkdtempSync(join(tmpdir(), 'public-reader-install-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const files = JSON.parse(execFileSync('python3', ['-c', 'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); z.extractall(sys.argv[2]); print(json.dumps(z.namelist()))', archive, dir], { encoding: 'utf8' }));
  assert.deepEqual(files.sort(), release.files.map(file => 'silicon-junning/' + file.path).sort());
  const script = join(dir, 'silicon-junning/scripts/read.mjs');
  const help = JSON.parse(execFileSync(process.execPath, [script, '--help'], { cwd: dir, encoding: 'utf8' }));
  assert.equal(help.commands.length, 13);
  assert.ok(help.commands.includes('activity [QUERY]'));
  const failed = spawnSync(process.execPath, [script, 'favorite', 'invalid'], { cwd: dir, encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(JSON.parse(failed.stderr).error, /16 位/);
});

test('public wrapper selects its own target, allows explicit overrides, and has no internal access message', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    return new Response(JSON.stringify({ recordsUrl: '/api/records', evidence: [] }), { headers: { 'content-type': 'application/json' } });
  };
  assert.equal((await run(['persona'], { env: {}, fetchImpl })).url, 'https://youngjunning.com/');
  assert.equal((await run(['persona'], { env: { JUNNING_BASE_URL: 'https://example.test' }, fetchImpl })).url, 'https://example.test/');
  assert.equal((await run(['persona', '--base-url', 'https://override.example'], { env: { JUNNING_BASE_URL: 'https://example.test' }, fetchImpl })).url, 'https://override.example/');
  assert.equal(calls.length, 3);
  await assert.rejects(run(['persona'], { env: {}, fetchImpl: async () => new Response('', { status: 403 }) }), error => /HTTP 403/.test(error.message) && !/集团/.test(error.message));
});

test('packager is reproducible, ignores unlisted material, and refuses symlinked runtime files', t => {
  const dir = mkdtempSync(join(tmpdir(), 'public-reader-package-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const copied = join(dir, 'silicon-junning'), output = join(dir, 'output');
  cpSync(source, copied, { recursive: true });
  writeFileSync(join(copied, 'unreviewed.txt'), 'This file must not be distributed.');
  const command = [join(root, 'scripts/package-site-skill.py'), '--source', copied, '--output', output, '--reader-source', join(source, 'scripts/read-core.mjs')];
  const manifest = JSON.parse(execFileSync('python3', command, { encoding: 'utf8' }));
  assert.equal(manifest.sha256, release.sha256);
  unlinkSync(join(copied, 'scripts/read-core.mjs'));
  symlinkSync(join(source, 'scripts/read-core.mjs'), join(copied, 'scripts/read-core.mjs'));
  const rejected = spawnSync('python3', command, { encoding: 'utf8' });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Missing or non-local Skill file/);
});
