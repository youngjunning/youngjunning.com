import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { ConversationKnowledge } from './twin-types';
import { getConversationModel } from './twin-chat.mjs';
export { retrieveTwinEvidence, knowledgeFingerprint } from './twin-retrieval.mjs';
export function getConversationKnowledge(): ConversationKnowledge {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), '.content/conversation.json'), 'utf8'));
}
export function isConversationAvailable() { return Boolean(process.env.DEEPSEEK_API_KEY); }
export function getConversationModelName() { return getConversationModel(process.env); }
