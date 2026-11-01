import { buildPublicSnapshot } from '@/lib/content-store.mjs';
export function GET() { return Response.json(buildPublicSnapshot().usage); }
