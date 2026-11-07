import { getCatalog } from '@/lib/content';
import { getFavoriteStore } from '@/lib/favorites';
import { getRecords } from '@/lib/records';
import { buildSiteActivity } from '@/lib/site-activity.mjs';

// The week is computed at request time in Asia/Shanghai, not frozen at build time.
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ version: 1, ...buildSiteActivity({ documents: getCatalog().documents, favorites: getFavoriteStore().favorites, records: getRecords() }) }, { headers: { 'Cache-Control': 'no-store' } });
}
