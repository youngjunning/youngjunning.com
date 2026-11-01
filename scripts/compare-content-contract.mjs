import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const files = ['lib/record-model.mjs', 'lib/favorite-model.mjs', 'lib/record-types.ts', 'lib/favorite-types.ts', 'lib/favorite-tracking.mjs', 'content/sync.README.md'];

// Explicit peer only: builds and hosted requests never read another repository.
export function compareContentContract(root, peer) {
  if (!peer) throw new Error('Provide the peer repository root');
  if (fs.realpathSync(root) === fs.realpathSync(peer)) throw new Error('Peer must be a different repository');
  return files.map(file => {
    const fingerprint = base => createHash('sha256').update(fs.readFileSync(path.join(base, file))).digest('hex');
    return { file, equal: fingerprint(root) === fingerprint(peer) };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const result = compareContentContract(root, process.argv[2]);
    console.log(JSON.stringify({ equal: result.every(item => item.equal), files: result }, null, 2));
    if (result.some(item => !item.equal)) process.exitCode = 1;
  } catch (error) {
    // Avoid publishing local paths from filesystem error messages.
    console.error(error?.code ? 'Unable to read a contract file: ' + error.code : error.message);
    process.exitCode = 1;
  }
}
