import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { matchResponsibleRepository, matchLeadProject, repositoryId } from './code-platform.mjs';
import { containsCredential } from './source-credentials.mjs';
export { containsCredential } from './source-credentials.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const excluded = /(?:^|\/)(?:\.[^/]+|node_modules|vendor|third_party|dist|build|target|coverage|fixtures?|__snapshots__|assets|images)(?:\/|$)|(?:^|\/)(?:AGENTS|CLAUDE)\.md$|(?:lock|snapshot)\.(?:json|ya?ml)$|(?:^|\/)(?:credentials?|secrets?|id_rsa|id_ed25519)(?:\.|$)/i;
const sourceExtension = /\.(?:[cm]?[jt]sx?|go|rs|py|java|swift|cpp|cc|h|c|md|json|toml)$/i;

function readGit(root, args, maxBuffer = 16 * 1024 * 1024) {
  try {
    return execFileSync('git', ['--no-optional-locks', '--no-replace-objects', '-c', 'core.fsmonitor=false', '-C', root, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1' } });
  } catch { throw new Error('Cannot read bounded committed Git evidence; no working-tree files were imported'); }
}

function priority(filename) {
  if (/^readme\.md$/i.test(filename)) return 0;
  if (filename === 'package.json') return 1;
  if (/(?:^|\/)(?:main|index|server|app|contracts?|types|controller|service|routes)\.[cm]?[jt]sx?$/.test(filename)) return 3;
  if (/\/src\//.test(filename) || filename.startsWith('src/')) return 4;
  return filename.split('/').length + 5;
}

/** Read committed objects only after platform membership and project leadership
 * are confirmed separately. Neither proves individual contributions or decisions. */
export function collectCodeEvidence(root, catalog, { maxFiles = 40, maxBytes = 524288, verifyRemote = false, readRemoteRef, projectScope } = {}) {
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 200 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 4194304) throw new Error('Invalid evidence budget');
  const repository = matchResponsibleRepository(catalog, readGit(root, ['remote', 'get-url', 'origin']).trim());
  const leadership = matchLeadProject(projectScope, repository.url);
  const localCommit = readGit(root, ['rev-parse', '--verify', 'HEAD^{commit}']).trim();
  let commit = localCommit;
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid Git revision');
  const id = repositoryId(repository.url);
  const branch = readGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  let remoteHead = null, remoteState = 'not-checked';
  if (verifyRemote && branch !== 'HEAD') {
    try {
      const ref = `refs/heads/${branch}`;
      const row = readRemoteRef ? null : readGit(root, ['ls-remote', '--heads', 'origin', ref], 65536).trim().split('\n').find(row => row.split('\t')[1] === ref);
      remoteHead = readRemoteRef ? readRemoteRef(root, ref) : row?.split('\t')[0] || null;
      remoteState = remoteHead === commit ? 'head-matches-remote-ref' : 'local-head-differs-from-remote-ref';
    } catch { remoteState = 'remote-unavailable'; }
  }
  if (verifyRemote) {
    if (!remoteHead || !/^[a-f0-9]{40,64}$/.test(remoteHead)) throw new Error('Cannot pin an accessible remote branch; local unpublished code was not used as fallback');
    try { readGit(root, ['cat-file', '-e', remoteHead + '^{commit}']); }
    catch { throw new Error('Remote commit is not in the local object cache; prepare an isolated collector checkout before retrying'); }
    commit = remoteHead;
  }
  const committedAt = readGit(root, ['show', '-s', '--format=%cI', commit]).trim();
  const bare = readGit(root, ['rev-parse', '--is-bare-repository']).trim() === 'true';
  const dirty = !bare && Boolean(readGit(root, ['status', '--porcelain', '-z', '--untracked-files=no']));
  const tree = readGit(root, ['ls-tree', '-rlz', commit]).split('\0').flatMap(row => {
    const match = row.match(/^(100\d+) blob ([a-f0-9]+)\s+(\d+)\t([\s\S]+)$/);
    return match ? [{ mode: match[1], blob: match[2], bytes: Number(match[3]), path: match[4] }] : [];
  });
  const eligible = tree.filter(file => !excluded.test(file.path) && !/[\x00-\x1f\x7f]/.test(file.path) && (sourceExtension.test(file.path) || /(?:^|\/)go\.mod$/.test(file.path)) && (!file.path.endsWith('.json') || path.posix.basename(file.path) === 'package.json') && file.bytes <= 65536).sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));
  const metadata = eligible.filter(file => /(?:^|\/)(?:package\.json|readme\.md|Cargo\.toml|go\.mod)$/i.test(file.path));
  const code = eligible.filter(file => !metadata.includes(file));
  const candidates = [...metadata.slice(0, Math.max(1, Math.floor(maxFiles / 4))), ...code, ...metadata.slice(Math.max(1, Math.floor(maxFiles / 4)))].slice(0, maxFiles * 4);
  const files = [], entries = [], observations = [];
  let bytes = 0, credentialFilesExcluded = 0;
  for (const file of candidates) {
    if (files.length >= maxFiles) break;
    if (bytes + file.bytes > maxBytes) continue;
    const text = readGit(root, ['show', '--no-ext-diff', '--no-textconv', `${commit}:${file.path}`], 131072);
    if (text.includes('\0') || text.includes('\uFFFD')) continue;
    if (containsCredential(text)) { credentialFilesExcluded++; continue; }
    const sha256 = digest(text), encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
    const url = `${repository.url}/blob/${commit}/${encodedPath}`;
    const rawUrl = `${repository.url}/raw/${commit}/${encodedPath}`;
    const lines = text.split('\n');
    files.push({ ...file, sha256, url, lineCount: lines.length }); bytes += file.bytes;
    for (let start = 0; start < lines.length; start += 60) {
      const fragment = lines.slice(start, start + 60).join('\n');
      if (!fragment.trim()) continue;
      entries.push({ id: `code-${id}-${digest(file.path).slice(0, 12)}-${start + 1}`, kind: 'code', title: `${repository.name} · ${file.path}`, url, rawUrl, lineStart: start + 1, lineEnd: Math.min(start + 60, lines.length), date: null, committedAt, text: fragment, excerpt: fragment, sha256, gitBlob: file.blob, searchTitle: `${repository.name} ${file.path}`, tags: ['Code', repository.name.split('/').at(-1)], relatedIds: [] });
    }
    if (path.posix.basename(file.path) === 'package.json') {
      try {
        const manifest = JSON.parse(text);
        if (typeof manifest.name === 'string') observations.push({ kind: 'engineering-fact', predicate: 'declares-package', subject: manifest.name, dependencies: Object.entries(manifest.dependencies || {}).slice(0, 60).map(([name, version]) => ({ name, version })), scriptNames: Object.keys(manifest.scripts || {}), source: { url, sha256, commit, lineStart: 1, lineEnd: lines.length }, attribution: 'manifest-declaration-only', personalJudgment: false });
      } catch { /* A non-JSON manifest is retained as source, not a fact. */ }
    }
  }
  const selected = new Map(files.map(file => [file.path, file]));
  const relationships = [], seen = new Set();
  for (const file of files) {
    if (!/\.[cm]?[jt]sx?$/.test(file.path)) continue;
    const text = entries.filter(entry => entry.url === file.url).map(entry => entry.text).join('\n');
    const parsed = ts.createSourceFile(file.path, text, ts.ScriptTarget.Latest, true);
    if (parsed.parseDiagnostics.length) continue;
    const specifiers = [];
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifiers.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(parsed);
    for (const specifier of specifiers.filter(value => value.startsWith('.'))) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), specifier));
      const target = [base, base.replace(/\.js$/, '.ts'), ...['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js'].map(extension => base + extension)].find(name => selected.has(name));
      if (!target || target === file.path) continue;
      const key = file.path + ':' + target;
      if (!seen.has(key)) { seen.add(key); relationships.push({ from: file.url, to: selected.get(target).url, type: 'imports' }); }
    }
  }
  const commits = readGit(root, ['log', '--no-show-signature', '-30', '-z', '--format=%H%x1f%cI%x1f%an%x1f%s', commit]).split('\0').flatMap(row => {
    const fields = row.trim().split('\x1f');
    if (fields.length !== 4 || containsCredential(fields.join(' '))) return [];
    const [sha, date, author, subject] = fields;
    return [{ sha, committedAt: date, author, subject, url: `${repository.url}/commit/${sha}`, attribution: 'git-author-metadata-not-verified-personal-contribution' }];
  });
  return { version: 1, id, repository: { name: repository.name, url: repository.url, role: repository.role, scope: 'user-led', project: leadership.project, leadershipEvidence: leadership.evidence }, snapshot: { commit, localCommit, branch, committedAt, collectedAt: new Date().toISOString(), catalogCapturedAt: catalog.capturedAt, workingTreeDirty: dirty, freshness: verifyRemote ? 'captured-remote-branch-head' : 'local-committed-head-not-remote-latest', remoteState, remoteHead }, coverage: { trackedFiles: tree.length, eligibleFiles: eligible.length, sampledFiles: files.length, sampledBytes: bytes, credentialFilesExcluded, complete: false }, files, entries, relationships, commits, observations, review: { status: 'candidate', personalRoleConfirmed: true, judgments: [], changes: [], visibility: 'local-only' } };
}

export function codeKnowledge(bundles) {
  return { version: 1, generatedAt: new Date().toISOString(), revision: digest(JSON.stringify(bundles.map(bundle => [bundle.id, bundle.snapshot.commit]))), entries: bundles.flatMap(bundle => bundle.entries), relationships: bundles.flatMap(bundle => bundle.relationships) };
}

/** Verify source provenance, not semantic truth. These are private engineering
 * candidates, never first-person memory or proof of personal responsibility. */
export function validateCodeDrafts(candidates, knowledge) {
  const byId = new Map(knowledge.entries.map(entry => [entry.id, entry]));
  const kinds = new Set(['documentation-claim', 'manifest-declaration', 'source-observation', 'documentation-inconsistency']);
  return candidates.map(candidate => {
    if (!kinds.has(candidate.kind) || !candidate.title || !candidate.text || candidate.personalJudgment === true || !Array.isArray(candidate.evidence) || !candidate.evidence.length) throw new Error('Invalid engineering candidate; personal judgments require separate evidence');
    const evidence = candidate.evidence.map(ref => {
      const source = byId.get(ref.sourceId);
      if (!source || source.kind !== 'code' || source.sha256 !== ref.sha256 || !/^[a-f0-9]{40,64}$/.test(ref.commit || '') || !source.url.includes('/blob/' + ref.commit + '/') || typeof ref.quote !== 'string' || ref.quote.length < 20 || ref.quote.length > 1000 || !source.text.includes(ref.quote)) throw new Error('Code candidate has stale or unverifiable evidence');
      const lineStart = source.lineStart + source.text.slice(0, source.text.indexOf(ref.quote)).split('\n').length - 1;
      return { ...ref, url: source.url + '#L' + lineStart, lineStart, lineEnd: lineStart + ref.quote.split('\n').length - 1 };
    });
    return { ...candidate, id: digest(JSON.stringify([candidate.title, evidence.map(ref => [ref.sourceId, ref.sha256, ref.quote])])).slice(0, 16), evidence, validation: 'quote-and-hash-verified', status: 'needs-review', visibility: 'local-only', personalJudgment: false, personalContribution: 'not-inferred' };
  });
}
