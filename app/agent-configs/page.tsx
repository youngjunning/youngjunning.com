import type { Metadata } from 'next';
import { agentConfigStore } from '@/lib/agent-config-server';
import { getSiteTheme } from '@/lib/site-theme';
import Shell from '@/components/shell';
import AgentConfigs from '@/components/lucian/agent-configs';
import StatechartAgentConfigs from '@/components/statechart/agent-configs';
import '@/components/agent-config-detail.css';

export const metadata: Metadata = { title: 'AGENTS.md 配置库', description: '全局与项目 Agent 配置、原文版本和有依据的模型评测。' };
export default async function AgentConfigsPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartAgentConfigs configs={agentConfigStore.configs} />;
  return <Shell active="agent-configs"><AgentConfigs configs={agentConfigStore.configs} /></Shell>;
}
