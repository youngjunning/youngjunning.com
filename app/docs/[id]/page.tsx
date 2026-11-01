import { permanentRedirect } from 'next/navigation';
export default async function Document({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; permanentRedirect('/blog/' + id); }
