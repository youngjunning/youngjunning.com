import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareContentContract, files } from './compare-content-contract.mjs';

test('contract comparison detects drift and missing files without changing either repository', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const peer = fs.mkdtempSync(path.join(os.tmpdir(), 'content-contract-'));
  try {
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(peer, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(peer, file));
    }
    assert.ok(compareContentContract(root, peer).every(item => item.equal));
    const file = path.join(peer, files[0]);
    fs.appendFileSync(file, '\n// drift\n');
    assert.deepEqual(compareContentContract(root, peer).filter(item => !item.equal).map(item => item.file), [files[0]]);
    assert.ok(fs.readFileSync(file, 'utf8').endsWith('// drift\n'));
    fs.unlinkSync(file);
    assert.throws(() => compareContentContract(root, peer), { code: 'ENOENT' });
    assert.throws(() => compareContentContract(root, root), /different repository/);
  } finally { fs.rmSync(peer, { recursive: true, force: true }); }
});
