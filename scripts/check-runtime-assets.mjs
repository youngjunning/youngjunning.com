import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildPublicSnapshot } from '../lib/content-store.mjs';

// Validate the actual deployment traces, not the complete local checkout.
// Dynamic JSON paths can be missed while locally rendered pages still pass.
const root = process.cwd(), expected = buildPublicSnapshot(root);
const routes = ['catalog', 'graph', 'search'];
for (const route of routes) {
  const base = path.join(root, '.next/server/app/api', route);
  const trace = JSON.parse(fs.readFileSync(path.join(base, 'route.js.nft.json'), 'utf8'));
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'public-runtime-data-'));
  try {
    for (const entry of trace.files) {
      const source = path.resolve(base, entry), relative = path.relative(root, source);
      if (!relative.startsWith('content/') && !relative.startsWith('config/')) continue;
      const target = path.join(isolated, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
    const actual = buildPublicSnapshot(isolated);
    if (actual.catalog.source.revision !== expected.catalog.source.revision || actual.catalog.documents.length !== expected.catalog.documents.length || actual.knowledge.entries.length !== expected.knowledge.entries.length) throw new Error('Runtime content snapshot is incomplete');
  } catch {
    throw new Error('Deployment trace is missing required content or configuration for /api/' + route);
  } finally { fs.rmSync(isolated, { recursive: true, force: true }); }
}
console.log(JSON.stringify({ runtimeData: 'verified-from-deployment-traces', routes: routes.length, articles: expected.catalog.documents.length }));
