import fs from 'node:fs';
import path from 'node:path';
import { validateCodeDrafts } from '../lib/code-evidence.mjs';
import { matchLeadProject, validateLeadScope, matchResponsibleRepository, validateCodeCatalog } from '../lib/code-platform.mjs';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--input') throw new Error('Usage: npm run code:review -- --input /path/to/private-drafts.json');
function readJSON(filename) {
  try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch { throw new Error('Cannot read private Code review JSON'); }
}
const directory = path.join(process.cwd(), '.cache/code');
const scope = validateLeadScope(readJSON(path.join(process.cwd(), 'config/code-project-scope.json')));
const catalog = validateCodeCatalog(readJSON(path.join(directory, 'responsible.json')));
if (Date.now() - Date.parse(catalog.capturedAt) > 24 * 60 * 60 * 1000) throw new Error('Repository catalog expired; run code:connect again');
const knowledge = readJSON(path.join(directory, 'knowledge.json'));
const input = readJSON(path.resolve(args[1]));
if (input.version !== 1 || !Array.isArray(input.candidates)) throw new Error('Invalid private draft schema');
const candidates = input.candidates.map(candidate => ({ ...candidate, evidence: candidate.evidence.map(ref => {
  const matches = knowledge.entries.filter(source => source.title === `${ref.repository} · ${ref.file}` && source.url.includes('/blob/' + ref.commit + '/') && source.text.includes(ref.quote));
  if (matches.length !== 1) throw new Error('Draft source is absent, changed, or ambiguous; refresh the draft instead of guessing');
  const repository = matchResponsibleRepository(catalog, matches[0].url.split('/blob/')[0]);
  matchLeadProject(scope, repository.url);
  return { sourceId: matches[0].id, sha256: matches[0].sha256, commit: ref.commit, quote: ref.quote };
}) }));
const verified = validateCodeDrafts(candidates, knowledge);
fs.writeFileSync(path.join(directory, 'review.json'), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), candidates: verified }, null, 2) + '\n', { mode: 0o600 });
const report = ['# 代码仓库蒸馏候选', '', '以下为工程资料候选，尚未加入个人记录或共享聊天。来源摘录与校验值已核对；个人职责、判断、动机和发布结果未从代码推断。', '', ...verified.flatMap((candidate, index) => [`## ${index + 1}. ${candidate.title}`, '', candidate.text, '', `类型：${candidate.kind}；状态：待审核。`, '', ...candidate.evidence.flatMap(ref => [`[Code 原文 ${ref.commit.slice(0, 8)}，行 ${ref.lineStart}–${ref.lineEnd}](${ref.url})`, '', ...ref.quote.split('\n').map(line => '> ' + line), ''])])].join('\n');
fs.writeFileSync(path.join(directory, 'review.md'), report, { mode: 0o600 });
console.log(JSON.stringify({ candidates: verified.length, provenance: 'verified', personalRecordsWritten: 0, published: false, output: '.cache/code/review.md' }));
