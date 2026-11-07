import { agentConfigStore } from '@/lib/agent-config-server';
import { evaluationIsCurrent } from '@/lib/agent-configs.mjs';

export function GET() {
  return Response.json({ version: 1, configs: agentConfigStore.configs.map(entry => ({
    id: entry.id, title: entry.title, scope: entry.scope, project: entry.project, parentId: entry.parentId,
    hash: entry.revisions[0].hash, savedAt: entry.revisions[0].savedAt,
    revisionCount: entry.revisions.length, evaluationCount: entry.evaluations.length,
    evaluationCurrent: evaluationIsCurrent(entry, entry.evaluations[0], agentConfigStore.configs),
    url: `/agent-configs#${entry.id}`, detailUrl: `/api/agent-configs/${entry.id}`,
  })) });
}
