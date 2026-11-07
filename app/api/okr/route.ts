import { getOkrStore } from '@/lib/okr';
export const dynamic = 'force-static';
export function GET() { return Response.json(getOkrStore()); }
