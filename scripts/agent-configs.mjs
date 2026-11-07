import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import nextEnv from '@next/env';
import { configHash, validateAgentConfigs, materializeReview, reviewMessages, RUBRIC_VERSION } from '../lib/agent-configs.mjs';
import { createChatCompletion, getModelName } from '../lib/chat-model.mjs';
import { siteProfile } from '../lib/site-profile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.join(root, 'content/agent-configs.json');
const { positionals, values } = parseArgs({ allowPositionals: true, options: Object.fromEntries(['id', 'file', 'title', 'scope', 'project', 'parent', 'source', 'reviewed'].map(key => [key, { type: 'string' }])) });
const old = fs.readFileSync(filename, 'utf8');
const store = validateAgentConfigs(JSON.parse(old), siteProfile.indexable ? 'public' : 'internal');
const command = positionals[0];
if (command === 'check') { console.log(`AGENTS.md: ${store.configs.length} configurations validated`); process.exit(0); }
if (!['import', 'evaluate'].includes(command) || !values.id) throw new Error('Usage: node scripts/agent-configs.mjs import|evaluate --id ID (see docs/agent-configs.md)');
let entry = store.configs.find(c => c.id === values.id);
if (command === 'import') {
  const audience = siteProfile.indexable ? 'public' : 'internal';
  if (values.reviewed !== audience) throw new Error(`Review content for ${audience} readers, then supply --reviewed ${audience}`);
  if (!values.file) throw new Error('--file is required');
  const content = fs.readFileSync(values.file, 'utf8');
  const revision = { hash: configHash(content), content, savedAt: new Date().toISOString() };
  if (entry) {
    if (entry.revisions[0].hash === revision.hash) { console.error('No content change'); process.exit(0); }
    if (entry.revisions.some(r => r.hash === revision.hash)) throw new Error('This historical version already exists; choose a new revision rather than duplicating history');
    entry.revisions.unshift(revision);
  } else {
    entry = { id: values.id, title: values.title, scope: values.scope, project: values.project ?? null, parentId: values.parent ?? null, audience, sourceLabel: values.source, revisions: [revision], evaluations: [] };
    store.configs.push(entry);
  }
} else {
  if (!entry) throw new Error('Config not found');
  // Match Next.js production environment precedence; never print loaded values.
  nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
  const parent = store.configs.find(c => c.id === entry.parentId);
  const messages = reviewMessages(entry, store.configs);
  let review;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await createChatCompletion(process.env, { messages, response_format: { type: 'json_object' }, stream: false, temperature: 0, max_tokens: 6000 }, { signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error(`Model review failed (HTTP ${response.status}); source unchanged`);
    const payload = await response.json();
    if (payload.choices?.[0]?.finish_reason !== 'stop') throw new Error('Model review incomplete; source unchanged');
    try {
      review = materializeReview(JSON.parse(payload.choices[0].message.content), entry.revisions[0].content, parent?.revisions[0].content);
      break;
    } catch (error) {
      if (attempt) throw new Error('Model review failed validation after one repair; source unchanged', { cause: error });
      console.error('Review failed validation; requesting one corrected response.');
      messages.push({ role: 'assistant', content: payload.choices[0].message.content }, { role: 'user', content: '上次结构或证据校验未通过。请重新检查并返回完整 JSON，五维各一次，分数为 0–20 整数；每条证据只引用非空的一行，startLine 与 endLine 相等。若 global 是 null，所有 source 必须为 config。' });
    }
  }
  entry.evaluations.unshift({ ...review, hash: entry.revisions[0].hash, parentHash: parent?.revisions[0].hash ?? null, model: getModelName(process.env), rubricVersion: RUBRIC_VERSION, evaluatedAt: new Date().toISOString() });
}
validateAgentConfigs(store, siteProfile.indexable ? 'public' : 'internal');
// Emit a reviewable patch; never mutate a project text file behind the caller.
if (fs.readFileSync(filename, 'utf8') !== old) throw new Error('Source changed concurrently; rerun against the latest source');
const next = JSON.stringify(store, null, 2) + '\n';
console.log('*** Begin Patch\n*** Update File: ' + filename + '\n@@\n' + old.trimEnd().split('\n').map(line => '-' + line).join('\n') + '\n' + next.trimEnd().split('\n').map(line => '+' + line).join('\n') + '\n*** End Patch');
