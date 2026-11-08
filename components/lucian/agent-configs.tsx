// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
// Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044
'use client';

import type { AgentConfig } from '@/lib/agent-config-types';
import { useAgentConfigLibrary } from '@/lib/use-agent-config-library';
import { evaluationIsCurrent } from '@/lib/agent-config-policy.mjs';
import { ConfigDetail } from '../agent-config-detail';
import ConfigTabs from './config-tabs';
import './agent-configs.css';

export default function AgentConfigs({ configs }: { configs: AgentConfig[] }) {
  const { selected, view, setView } = useAgentConfigLibrary(configs);
  return <section className="ux agent-configs">
    <header className="agent-config-page-heading"><span className="agent-config-eyebrow">AGENT INSTRUCTIONS</span><h1>AGENTS.md 配置库</h1><p>读规则、看评测，回到每一次配置的原文。</p></header>
    <div className="agent-config-workspace">
      <nav className="agent-config-catalog" aria-label="配置目录">
        <div className="agent-config-catalog-heading"><h2>配置目录</h2><span>{configs.length} 份配置</span></div>
        {(['global', 'project'] as const).map(scope => <section key={scope} className="agent-config-group">
          <h3>{scope === 'global' ? '全局规则' : '项目规则'}<span>{configs.filter(entry => entry.scope === scope).length}</span></h3>
          {configs.filter(entry => entry.scope === scope).map(entry => <a key={entry.id} id={entry.id} className="agent-config-catalog-item u039-row" href={`#${entry.id}`} aria-current={selected?.id === entry.id ? 'true' : undefined}>
            <span className="agent-config-file" aria-hidden="true">{scope === 'global' ? 'G' : 'P'}</span><span><b>{entry.title}</b><small>{entry.project ?? '跨项目默认约定'}</small><small>{entry.revisions.length} 个版本 · {entry.evaluations[0] ? `${evaluationIsCurrent(entry, entry.evaluations[0], configs) ? '最近评测' : '历史评测'} ${entry.evaluations[0].total}/100` : '尚未评测'}</small></span><span aria-hidden="true">→</span>
          </a>)}
          {!configs.some(entry => entry.scope === scope) && <p className="agent-config-group-empty">尚未收录{scope === 'global' ? '全局' : '项目'}配置</p>}
        </section>)}
        <p className="agent-config-catalog-note">全局规则提供默认约定，项目规则补充具体边界。选择一份配置开始阅读。</p>
      </nav>
      {selected ? <ConfigDetail key={selected.id} entry={selected} configs={configs} view={view} tabs={<ConfigTabs view={view} onChange={setView} />} /> : <div className="agent-config-empty"><h2>还没有配置快照</h2><p>收录经审核的 AGENTS.md 后，可在这里阅读原文、评测与版本记录。</p></div>}
    </div>
    <p className="agent-config-footnote">这里只展示审核后的快照；下载不会修改本机配置。模型评测在维护端运行，浏览页面不会消耗模型额度。</p>
  </section>;
}
