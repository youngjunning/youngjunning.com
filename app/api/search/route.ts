import { getSearch } from '@/lib/content';
export const dynamic = 'force-static';
export function GET() { return new Response(getSearch(), { headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
