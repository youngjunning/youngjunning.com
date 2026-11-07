// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
// Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044
'use client';
import { useEffect, useRef, useState } from 'react';
import type { AgentConfig } from '@/lib/agent-config-types';
import { ConfigDetail } from '../agent-config-detail';
import './lucian-039.css';
import './agent-configs.css';

const tabs = [{ id: 'all', label: '全部配置' }, { id: 'global', label: '全局' }, { id: 'project', label: '项目' }];
export default function AgentConfigs({ configs }: { configs: AgentConfig[] }) {
  const [scope, setScope] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const tablist = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const rows = configs.filter(c => scope === 'all' || c.scope === scope);
  useEffect(() => {
    const move = () => {
      const selected = tablist.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!selected || !pill.current) return;
      pill.current.style.setProperty('--x', `${selected.offsetLeft}px`);
      pill.current.style.setProperty('--w', `${selected.offsetWidth}px`);
    };
    move(); const observer = new ResizeObserver(move);
    if (tablist.current) observer.observe(tablist.current);
    return () => observer.disconnect();
  }, [scope]);
  useEffect(() => {
    const navigate = () => {
      const id = window.location.hash.slice(1);
      if (configs.some(c => c.id === id)) { setScope('all'); setOpen(id); requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' })); }
    };
    navigate(); window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, [configs]);
  return <section className="ux agent-configs">
    <header><span className="agent-config-eyebrow">AGENT INSTRUCTIONS</span><h1>AGENTS.md 配置库</h1><p>全局约定与项目规则，连同版本和模型评测一起保存。</p></header>
    <div className="u039-tabs" ref={tablist} role="tablist" aria-label="配置范围"><span className="u039-pill" ref={pill} aria-hidden="true" />{tabs.map((tab, i) => <button key={tab.id} type="button" id={`config-tab-${tab.id}`} className="u039-tab" role="tab" aria-selected={scope === tab.id} aria-controls="config-panel" tabIndex={scope === tab.id ? 0 : -1} onClick={() => { setScope(tab.id); setOpen(null); }} onKeyDown={event => {
      const index = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (index < 0) return; event.preventDefault(); setScope(tabs[index].id); setOpen(null); tablist.current?.querySelectorAll('button')[index]?.focus();
    }}>{tab.label} · {configs.filter(c => tab.id === 'all' || c.scope === tab.id).length}</button>)}</div>
    <div id="config-panel" role="tabpanel" aria-labelledby={`config-tab-${scope}`} tabIndex={0} className="agent-config-list">
      {!rows.length && <p className="agent-config-empty">这里还没有{scope === 'global' ? '全局' : scope === 'project' ? '项目' : ''}配置。导入经受众审核的 AGENTS.md 后，会在这里显示原文、版本与评测。</p>}
      {rows.map((entry, i) => <article id={entry.id} key={entry.id} className={`ac044-it${open === entry.id ? ' open' : ''}`}>
        <h2><button className="ac044-q" type="button" aria-expanded={open === entry.id} aria-controls={`${entry.id}-body`} id={`${entry.id}-heading`} onClick={() => setOpen(open === entry.id ? null : entry.id)} onKeyDown={event => {
          const next = event.key === 'ArrowDown' ? (i + 1) % rows.length : event.key === 'ArrowUp' ? (i + rows.length - 1) % rows.length : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : -1;
          if (next < 0) return; event.preventDefault(); document.getElementById(`${rows[next].id}-heading`)?.focus();
        }}><span className="ac044-n">{entry.scope === 'global' ? '全局' : '项目'}</span><span className="ac044-t">{entry.title}<small>{entry.project ?? '跨项目默认规则'} · {entry.revisions.length} 个版本 · {entry.evaluations.length} 次评测</small></span><span className="ac044-pm" aria-hidden="true" /></button></h2>
        <div className="ac044-body" role="region" id={`${entry.id}-body`} aria-labelledby={`${entry.id}-heading`} inert={open !== entry.id}><div><div className="ac044-a">{open === entry.id && <ConfigDetail entry={entry} configs={configs} />}</div></div></div>
      </article>)}
    </div>
    <p className="agent-config-footnote">配置按审核后的快照保存，不自动修改电脑上的原文件。评测由维护端运行，浏览页面不会消耗模型额度。</p>
  </section>;
}
