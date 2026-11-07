import { getCatalog, getDocument } from '@/lib/content';
import { renderHtmlArticle } from '@/lib/html-article';
export const dynamic = 'force-static';
export function generateStaticParams() { return getCatalog().documents.filter((doc) => doc.kind === 'html').map(({ id }) => ({ id })); }
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const doc = getDocument((await params).id);
  if (!doc || doc.kind !== 'html') return new Response('Document not found', { status: 404 });
  return new Response(renderHtmlArticle(doc.html || '', doc.title, doc.id), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "sandbox allow-scripts; script-src 'unsafe-inline' https:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'", 'X-Content-Type-Options': 'nosniff' } });
}
