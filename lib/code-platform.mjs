import { createHash } from 'node:crypto';
export const CODE_ORIGIN = 'https://github.com';
export function repositoryIdentity(value) {
  let url;
  try { url = new URL(value.includes('://') ? value : value.replace(/^[^@]+@([^:]+):/, 'ssh://$1/')); } catch { throw new Error('Invalid repository URL'); }
  if (url.hostname !== 'github.com' || !['https:', 'ssh:'].includes(url.protocol) || url.search || url.hash || url.password || (url.username && url.username !== 'git')) throw new Error('Repository is not on the public source platform');
  const pathname = url.pathname.replace(/\.git\/?$/, '').replace(/\/$/, '');
  if (!/^\/[\w.-]+\/[\w.-]+$/.test(pathname) || pathname.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid repository path');
  return pathname.toLowerCase();
}
export const repositoryId = url => createHash('sha256').update(repositoryIdentity(url)).digest('hex').slice(0, 16);
export function validateLeadScope(scope) {
  if (scope?.version !== 1 || scope.criterion !== 'user-led' || !Array.isArray(scope.repositories) || (scope.groups?.length ?? 0) > 0) throw new Error('An explicit public repository scope is required');
  const seen = new Set();
  for (const repo of scope.repositories) {
    const id = repositoryIdentity(repo.url);
    if (new URL(repo.url).origin !== CODE_ORIGIN || seen.has(id) || repo.role !== 'lead' || repo.confirmed !== true || !repo.project?.trim() || !['user-statement', 'verified-record'].includes(repo.evidence?.kind) || !repo.evidence.label?.trim() || (repo.evidence.kind === 'verified-record' && !repo.evidence.recordId)) throw new Error('Public project scope needs explicit leadership evidence');
    seen.add(id);
  }
  return scope;
}
export function matchLeadProject(scope, url) {
  validateLeadScope(scope);
  const repo = scope.repositories.find(repo => repositoryIdentity(repo.url) === repositoryIdentity(url));
  if (!repo) throw new Error('Repository is not in the confirmed project scope');
  return repo;
}
export function validateCodeCatalog(input) {
  if (input?.version !== 1 || input.source?.origin !== CODE_ORIGIN || input.source.scope !== 'responsible' || !Array.isArray(input.repositories) || input.expectedCount !== input.repositories.length || !Number.isFinite(Date.parse(input.capturedAt))) throw new Error('Incomplete public repository catalog');
  const seen = new Set();
  for (const repo of input.repositories) {
    const identity = repositoryIdentity(repo.url);
    if (seen.has(identity) || new URL(repo.url).origin !== CODE_ORIGIN || !repo.name?.trim() || !repo.role?.trim()) throw new Error('Invalid public repository catalog');
    seen.add(identity);
  }
  return input;
}
export function matchResponsibleRepository(catalog, url) {
  validateCodeCatalog(catalog);
  const matches = catalog.repositories.filter(repo => repositoryIdentity(repo.url) === repositoryIdentity(url));
  if (matches.length !== 1) throw new Error('Repository is not uniquely present in the catalog');
  return matches[0];
}
