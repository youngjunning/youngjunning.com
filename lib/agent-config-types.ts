export type ConfigRevision = { hash: string; content: string; savedAt: string };
export type ConfigEvaluation = { hash: string; parentHash: string | null; model: string; rubricVersion: string; evaluatedAt: string; summary: string; total: number; dimensions: { id: string; score: number; reason: string; suggestion: string; evidence: { source: string; quote: string }[] }[] };
export type AgentConfig = { id: string; title: string; scope: 'global' | 'project'; project: string | null; parentId: string | null; audience: 'internal' | 'public'; sourceLabel: string; revisions: ConfigRevision[]; evaluations: ConfigEvaluation[] };
export type AgentConfigStore = { version: number; configs: AgentConfig[] };
