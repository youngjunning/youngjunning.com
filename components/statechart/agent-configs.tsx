'use client';

import { useRef } from 'react';
import type { AgentConfig } from '@/lib/agent-config-types';
import { configViews, useAgentConfigLibrary } from '@/lib/use-agent-config-library';
import { evaluationIsCurrent } from '@/lib/agent-config-policy.mjs';
import { ConfigDetail } from '../agent-config-detail';
import StatechartShell from './shell';
import './agent-configs.css';

export default function StatechartAgentConfigs({ configs }: { configs: AgentConfig[] }) {
  const { selected, view, setView } = useAgentConfigLibrary(configs);
  const tabs = useRef<HTMLDivElement>(null);
  return <StatechartShell active="/agent-configs" title="AGENTS.md 配置库" subtitle="读规则、看评测，回到每一次配置的原文。">
    <div className="sc-config-workspace">
      <nav className="sc-config-catalog" aria-label="配置目录">
        <div className="sc-config-catalog-heading"><h2>配置目录</h2><span>{configs.length} 份配置</span></div>
        {(['global', 'project'] as const).map(scope => <section key={scope} className="sc-config-group">
          <h3>{scope === 'global' ? '全局规则' : '项目规则'}<span>{configs.filter(entry => entry.scope === scope).length}</span></h3>
          {configs.filter(entry => entry.scope === scope).map(entry => <a key={entry.id} id={entry.id} href={`#${entry.id}`} aria-current={selected?.id === entry.id ? 'true' : undefined}><b>{entry.title}</b><small>{entry.project ?? '跨项目默认约定'}</small><small>{entry.revisions.length} 个版本 · {entry.evaluations[0] ? `${evaluationIsCurrent(entry, entry.evaluations[0], configs) ? '最近评测' : '历史评测'} ${entry.evaluations[0].total}/100` : '尚未评测'}</small><span aria-hidden="true">→</span></a>)}
          {!configs.some(entry => entry.scope === scope) && <p>尚未收录{scope === 'global' ? '全局' : '项目'}配置</p>}
        </section>)}
        <p className="sc-config-catalog-note">全局规则提供默认约定，项目规则补充具体边界。</p>
      </nav>
      {selected ? <ConfigDetail key={selected.id} entry={selected} configs={configs} theme="statechart" view={view} tabs={<div className="sc-config-tabs" ref={tabs} role="tablist" aria-label="配置详情">{configViews.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`config-view-${tab.id}`} aria-selected={view === tab.id} aria-controls="config-detail-panel" tabIndex={view === tab.id ? 0 : -1} onClick={() => setView(tab.id)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % configViews.length : event.key === 'ArrowLeft' ? (index + configViews.length - 1) % configViews.length : event.key === 'Home' ? 0 : event.key === 'End' ? configViews.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); setView(configViews[next].id); tabs.current?.querySelectorAll('button')[next]?.focus();
      }}>{tab.label}</button>)}</div>} /> : <div className="sc-config-empty"><h2>还没有配置快照</h2><p>收录经审核的 AGENTS.md 后，可在这里阅读原文、评测与版本记录。</p></div>}
    </div>
    <p className="sc-config-footnote">这里只展示审核后的快照；下载不会修改本机配置。模型评测在维护端运行，浏览页面不会消耗模型额度。</p>
  </StatechartShell>;
}
