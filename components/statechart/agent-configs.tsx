import type { AgentConfig } from '@/lib/agent-config-types';
import { ConfigDetail } from '../agent-config-detail';
import StatechartShell from './shell';
import './agent-configs.css';

export default function StatechartAgentConfigs({ configs }: { configs: AgentConfig[] }) {
  return <StatechartShell active="/agent-configs" title="AGENTS.md 配置库" subtitle="全局约定与项目规则，连同版本和模型评测一起保存。">
    <p>配置按审核后的快照保存。模型按五维量表评审文档质量，不执行配置中的命令，也不代表实际任务成功率。</p>
    {(['global', 'project'] as const).map(scope => <section key={scope} className="sc-section"><h2>{scope === 'global' ? '全局配置' : '项目配置'}</h2>
      {!configs.some(c => c.scope === scope) && <p>尚未收录{scope === 'global' ? '全局' : '项目'}配置。</p>}
      {configs.filter(c => c.scope === scope).map(entry => <details key={entry.id} id={entry.id} className="sc-config-disclosure"><summary>{entry.title} · {entry.revisions.length} 个版本 · {entry.evaluations.length} 次评测</summary><ConfigDetail entry={entry} configs={configs} /></details>)}
    </section>)}
  </StatechartShell>;
}
