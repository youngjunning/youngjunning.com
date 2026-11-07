import { getFavoriteStore } from '@/lib/favorites';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return getFavoriteStore().favorites.map(({ id }) => ({ id })); }
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const favorite = getFavoriteStore().favorites.find(item => item.id === id);
  return favorite ? Response.json({ favorite }) : Response.json({ error: 'Favorite not found' }, { status: 404 });
}
