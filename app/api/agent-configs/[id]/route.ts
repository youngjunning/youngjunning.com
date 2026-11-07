import { agentConfigStore } from '@/lib/agent-config-server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const entry = agentConfigStore.configs.find(item => item.id === id);
  if (!entry) return Response.json({ error: '配置不存在' }, { status: 404 });
  const url = new URL(request.url);
  if (url.searchParams.get('format') === 'markdown') {
    const revisionHash = url.searchParams.get('version');
    const revision = revisionHash ? entry.revisions.find(r => r.hash === revisionHash) : entry.revisions[0];
    if (!revision) return Response.json({ error: '版本不存在' }, { status: 404 });
    return new Response(revision.content, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${entry.id}-AGENTS.md"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });
  }
  return Response.json(entry);
}
