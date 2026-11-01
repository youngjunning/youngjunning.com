import { createSuggestionHandler } from '@/lib/twin-suggestion-generator.mjs';
import { getConversationKnowledge } from '@/lib/twin-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handle = createSuggestionHandler({ loadKnowledge: getConversationKnowledge });
export async function GET(request: Request) { return handle(request); }
