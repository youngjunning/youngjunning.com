import catalog from '@/content/skills.json';

export const dynamic = 'force-static';
// The same display catalog as /skills; installation inventory and usage logs are excluded.
export function GET() { return Response.json({ ...catalog, version: 1 }); }
