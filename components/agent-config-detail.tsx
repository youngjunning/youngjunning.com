// Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044
'use client';

import { useState, type ReactNode } from 'react';
import { RUBRIC, evaluationIsCurrent } from '@/lib/agent-config-policy.mjs';
import type { AgentConfig, ConfigEvaluation } from '@/lib/agent-config-types';
import type { ConfigView } from '@/lib/use-agent-config-library';

function DimensionContent({ dimension }: { dimension: ConfigEvaluation['dimensions'][number] }) {
  return <div className="agent-config-dimension-content"><p>{dimension.reason}</p>
    <div className="agent-config-suggestion"><b>改进建议</b><p>{dimension.suggestion}</p></div>
    {dimension.evidence.map((evidence, index) => <blockquote key={index}><small>{evidence.source === 'global' ? '全局配置依据' : '配置原文依据'}</small><p>{evidence.quote}</p></blockquote>)}
  </div>;
}

function Evaluation({ evaluation, entry, configs, theme, index }: { evaluation: ConfigEvaluation; entry: AgentConfig; configs: AgentConfig[]; theme: string; index: number }) {
  const [openDimension, setOpenDimension] = useState<string | null>(null);
  const current = evaluationIsCurrent(entry, evaluation, configs);
  return <section className="agent-config-evaluation" aria-label={index === 0 ? '最近评测' : '历史评测'}>
    <div className="agent-config-score-summary"><div className="agent-config-score"><span>{index === 0 ? '最近评测' : '历史评测'}</span><strong>{evaluation.total}<small> / 100</small></strong><span className={`agent-config-status${current ? ' current' : ''}`}>{current ? '对应当前配置' : '历史版本，需重新评测'}</span></div><div><h3>评测结论</h3><p>{evaluation.summary}</p></div></div>
    <dl className="agent-config-dimension-overview">{evaluation.dimensions.map(dimension => <div key={dimension.id}><dt>{RUBRIC.find(item => item.id === dimension.id)?.label ?? dimension.id}</dt><dd>{dimension.score}<small> / 20</small></dd></div>)}</dl>
    <div className="agent-config-section-heading"><h3>逐项依据与建议</h3><span>展开查看原文引用</span></div>
    <div className="agent-config-dimensions">{evaluation.dimensions.map((dimension, dimensionIndex) => {
      const label = RUBRIC.find(item => item.id === dimension.id)?.label ?? dimension.id;
      if (theme === 'statechart') return <details className="agent-config-dimension" key={dimension.id}><summary><span>{label}</span><b>{dimension.score} / 20</b></summary><DimensionContent dimension={dimension} /></details>;
      const open = openDimension === dimension.id;
      const id = `${entry.id}-evaluation-${index}-${dimension.id}`;
      return <section key={dimension.id} className={`ac044-it${open ? ' open' : ''}`}><h4><button type="button" className="ac044-q" id={`${id}-heading`} aria-expanded={open} aria-controls={id} onClick={() => setOpenDimension(open ? null : dimension.id)} onKeyDown={event => {
        const next = event.key === 'ArrowDown' ? (dimensionIndex + 1) % evaluation.dimensions.length : event.key === 'ArrowUp' ? (dimensionIndex + evaluation.dimensions.length - 1) % evaluation.dimensions.length : event.key === 'Home' ? 0 : event.key === 'End' ? evaluation.dimensions.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); document.getElementById(`${entry.id}-evaluation-${index}-${evaluation.dimensions[next].id}-heading`)?.focus();
      }}><span className="ac044-n">{String(dimensionIndex + 1).padStart(2, '0')}</span><span className="ac044-t">{label}</span><span className="agent-config-dimension-score">{dimension.score} / 20</span><span className="ac044-pm" aria-hidden="true" /></button></h4><div className="ac044-body" id={id} role="region" aria-labelledby={`${id}-heading`} inert={!open}><div><div className="ac044-a"><DimensionContent dimension={dimension} /></div></div></div></section>;
    })}</div>
    <p className="agent-config-evaluation-meta">{evaluation.model} · {evaluation.evaluatedAt.replace('T', ' ').slice(0, 19)} UTC · 量表 {evaluation.rubricVersion}<br />配置 {evaluation.hash.slice(0, 12)}{evaluation.parentHash && ` · 全局 ${evaluation.parentHash.slice(0, 12)}`}</p>
  </section>;
}

export function ConfigDetail({ entry, configs, view, tabs, theme = 'classic' }: { entry: AgentConfig; configs: AgentConfig[]; view: ConfigView; tabs: ReactNode; theme?: 'classic' | 'statechart' }) {
  const latest = entry.revisions[0];
  const parent = configs.find(config => config.id === entry.parentId);
  return <article className="agent-config-detail" aria-label={entry.title}>
    <header className="agent-config-detail-heading"><div><span className="agent-config-eyebrow">{entry.scope === 'global' ? '全局配置 / GLOBAL' : '项目配置 / PROJECT'}</span><h2>{entry.title}</h2><p>{entry.sourceLabel}</p></div><a className="agent-config-download" href={`/api/agent-configs/${entry.id}?format=markdown`}>下载 AGENTS.md <span aria-hidden="true">↗</span></a></header>
    <dl className="agent-config-facts"><div><dt>快照保存</dt><dd>{latest.savedAt.slice(0, 10)}</dd></div><div><dt>原文长度</dt><dd>{latest.content.length.toLocaleString('zh-CN')} 字符</dd></div><div><dt>版本</dt><dd>{entry.revisions.length} 个快照</dd></div></dl>
    <p className="agent-config-relation">{parent ? <>关联全局配置：<a href={`#${parent.id}`}>{parent.title} ↗</a><span> · 评测同时检查两份配置的冲突</span></> : entry.scope === 'global' ? '跨项目任务的默认约定，可与项目规则配合阅读。' : '独立项目配置，尚未关联全局规则。'}</p>
    {tabs}
    <div id="config-detail-panel" className="agent-config-panel" role="tabpanel" aria-labelledby={`config-view-${view}`} tabIndex={0}>
      {view === 'source' && <section><div className="agent-config-section-heading"><h3>当前快照</h3><span>AGENTS.md · 只读</span></div><pre className="agent-config-source" tabIndex={0} aria-label={`${entry.title}原文`}>{latest.content}</pre><p className="agent-config-hash">SHA-256 <code>{latest.hash}</code></p></section>}
      {view === 'evaluation' && <section><p className="agent-config-evaluation-notice">五个维度，每项 20 分。评测反映文档静态质量，不代表实际任务成功率；原文中的命令不会被执行。</p>{!entry.evaluations.length && <div className="agent-config-notice"><h3>尚未评测</h3><p>维护端完成评测并保存后，这里会展示总分、各维度依据与改进建议。</p></div>}{entry.evaluations.map((evaluation, index) => <Evaluation key={`${evaluation.evaluatedAt}-${index}`} evaluation={evaluation} entry={entry} configs={configs} theme={theme} index={index} />)}</section>}
      {view === 'history' && <section><div className="agent-config-section-heading"><h3>版本记录</h3><span>共 {entry.revisions.length} 个快照 · 最新在前</span></div><ol className="agent-config-versions">{entry.revisions.map((revision, index) => <li key={revision.hash}><span className="agent-config-version-marker" aria-hidden="true" /><div><div className="agent-config-version-heading"><h4>{index === 0 ? '当前版本' : '历史版本'}</h4><time dateTime={revision.savedAt}>{revision.savedAt.replace('T', ' ').slice(0, 19)} UTC</time></div><code>{revision.hash.slice(0, 12)}</code><span className="agent-config-version-size"> · {revision.content.length.toLocaleString('zh-CN')} 字符</span><a href={`/api/agent-configs/${entry.id}?format=markdown&version=${revision.hash}`}>下载此版本 ↗</a></div></li>)}</ol></section>}
    </div>
  </article>;
}
