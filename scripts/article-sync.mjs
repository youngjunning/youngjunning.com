import fs from 'node:fs';
import path from 'node:path';
import { articleSyncPlan, articleSyncPatch } from '../lib/article-sync.mjs';
const args = process.argv.slice(2), options = { targetRoot: process.cwd() }; let patch = false, details = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--patch') patch = true;
  else if (args[i] === '--details') details = true;
  else if (['--source', '--target', '--ledger', '--audience'].includes(args[i]) && args[i + 1]) options[{ '--source': 'sourceRoot', '--target': 'targetRoot', '--ledger': 'ledgerFile', '--audience': 'audience' }[args[i]]] = args[++i];
  else throw new Error('Usage: article:sync --source ROOT --ledger PRIVATE_JSON --audience public|company [--target ROOT] [--patch|--details]');
}
if (!options.sourceRoot || !options.ledgerFile || !options.audience) throw new Error('Explicit source, audience and private review ledger are required');
if (patch && details) throw new Error('Choose patch or private details');
const ledgerPath = fs.realpathSync(options.ledgerFile);
for (const root of [options.sourceRoot, options.targetRoot]) if (ledgerPath.startsWith(fs.realpathSync(root) + path.sep)) throw new Error('Review ledger must be outside both repositories');
const plan = articleSyncPlan({ ...options, ledger: JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) });
if (patch) process.stdout.write(articleSyncPatch(plan, path.resolve(options.targetRoot)));
else console.log(JSON.stringify({ counts: plan.reduce((counts, item) => ({ ...counts, [item.state]: (counts[item.state] || 0) + 1 }), {}), ...(details ? { articles: plan.map(({ targetText, previousText, targetMetadataText, previousMetadataText, ...item }) => item) } : {}) }, null, 2));
if (plan.some(item => ['review-stale', 'resource-review-stale', 'target-resource-review-stale', 'equivalent-stale', 'target-conflict', 'filename-conflict', 'source-withdrawn'].includes(item.state))) process.exitCode = 1;
