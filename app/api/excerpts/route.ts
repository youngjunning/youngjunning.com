import { getContent } from '@/lib/content';
export function GET() { return Response.json({ version: 1, items: getContent().excerpts }); }
