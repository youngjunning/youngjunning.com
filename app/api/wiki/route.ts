import { getConversationKnowledge } from '@/lib/twin-server';
export function GET() { const index = getConversationKnowledge(); return Response.json({ version: 1, pages: index.wiki?.pages || index.engineeringPages || [] }); }
