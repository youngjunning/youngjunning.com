import { getContent } from '@/lib/content';
export function GET() { return Response.json({ version: 2, records: getContent().records }); }
