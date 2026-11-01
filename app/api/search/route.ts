import { getContent } from '@/lib/content';
export function GET() {
  return Response.json(getContent().posts.map(post => ({ id: post.id, text: post.body.replace(/<[^>]*>/g, ' ').toLowerCase() })));
}
