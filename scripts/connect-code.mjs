import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateLeadScope, CODE_ORIGIN } from '../lib/code-platform.mjs';
const scope = validateLeadScope(JSON.parse(fs.readFileSync('config/code-project-scope.json', 'utf8')));
const repositories = [];
for (const repo of scope.repositories) {
  // Public access is checked without a token or an authenticated private API.
  const response = await fetch('https://api.github.com/repos' + new URL(repo.url).pathname, { headers: { Accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok || (await response.json()).private !== false) throw new Error('Configured repository is not publicly readable');
  const head = execFileSync('git', ['ls-remote', repo.url, 'HEAD'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  if (!/^[a-f0-9]{40,64}\s+HEAD/m.test(head)) throw new Error('Public repository has no readable HEAD');
  repositories.push({ name: new URL(repo.url).pathname.slice(1), url: repo.url, role: 'lead' });
}
const catalog = { version: 1, capturedAt: new Date().toISOString(), source: { origin: CODE_ORIGIN, scope: 'responsible', method: 'explicit-public-repository-scope' }, expectedCount: repositories.length, repositories };
fs.mkdirSync('.cache/code', { recursive: true });
fs.writeFileSync(path.join('.cache/code', 'responsible.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(JSON.stringify({ status: 'connected', repositories: repositories.length, published: false }));
