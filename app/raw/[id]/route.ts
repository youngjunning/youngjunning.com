import { getCatalog, getDocument } from '@/lib/content';
export const dynamic = 'force-static';
export function generateStaticParams() { return getCatalog().documents.map(({ id }) => ({ id })); }
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const doc = getDocument((await params).id);
  if (!doc) return new Response('Document not found', { status: 404 });
  return new Response(doc.rawContent, { headers: { 'Content-Type': doc.kind === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });
}
