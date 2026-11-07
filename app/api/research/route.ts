import { getResearch } from '@/lib/curation';
export const dynamic = 'force-static';
export function GET() { return Response.json({ version: 1, items: getResearch() }); }
