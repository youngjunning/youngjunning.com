import { getRecord, getRecords } from '@/lib/records';
export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return getRecords().map(({ id }) => ({ id })); }
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const record = getRecord((await params).id);
  return record ? Response.json({ record }) : Response.json({ error: 'Record not found' }, { status: 404 });
}
