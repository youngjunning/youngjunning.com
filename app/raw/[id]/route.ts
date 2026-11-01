import fs from 'node:fs';
import path from 'node:path';
import { getContent } from '@/lib/content';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = getContent().posts.find(item => item.id === id);
  if (!article) return new Response('Not found', { status: 404 });
  return new Response(fs.readFileSync(path.join(process.cwd(), 'content/posts', article.file), 'utf8'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });
}
