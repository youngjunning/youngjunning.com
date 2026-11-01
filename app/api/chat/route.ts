import { createConversationHandler } from '@/lib/twin-chat.mjs';
import { getConversationKnowledge, isConversationAvailable, getConversationModelName, retrieveTwinEvidence, knowledgeFingerprint } from '@/lib/twin-server';
import persona from '@/content/persona.json';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handle = createConversationHandler({ loadKnowledge: getConversationKnowledge, env: process.env, retrieve: retrieveTwinEvidence, fingerprint: knowledgeFingerprint, identity: { name: persona.siteName, subject: persona.name } });
export async function POST(request: Request) { return handle(request); }
export function GET() { return Response.json({ available: isConversationAvailable(), model: getConversationModelName(), retrieval: 'local' }, { headers: { 'Cache-Control': 'no-store' } }); }
