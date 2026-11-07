import { getFavoriteStore } from '@/lib/favorites';
export const dynamic = 'force-static';
export function GET() { return Response.json(getFavoriteStore()); }
