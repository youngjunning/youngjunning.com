import { contentSubjects } from '@/lib/content-subjects.mjs';

export const dynamic = 'force-static';
export function GET() { return Response.json({ version: 1, subjects: contentSubjects }); }
