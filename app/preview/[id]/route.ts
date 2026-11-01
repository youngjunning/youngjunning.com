import { getContent } from '@/lib/content';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, post = getContent().posts.find(item => item.id === id && item.kind === 'html');
  if (!post) return new Response('Not found', { status: 404 });
  return new Response(post.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "sandbox allow-scripts; default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; script-src 'unsafe-inline' https:; font-src https: data:", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}
