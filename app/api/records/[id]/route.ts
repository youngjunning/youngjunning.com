import { getContent } from '@/lib/content';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const item = getContent().records.find(item => item.id === id); return item ? Response.json(item) : Response.json({ error: '记录不存在' }, { status: 404 }); }
