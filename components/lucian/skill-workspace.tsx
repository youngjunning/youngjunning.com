// Lucian UX/UI Prompt #014 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#014
// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
// Lucian UX/UI Prompt #050 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#050
// Lucian UX/UI Prompt #273 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#273
'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import ContentSearch from './content-search';
import GraphTopicSelect from './graph-topic-select';
import { buildSkillWorkspace, searchAndSortSkills } from '@/lib/skill-catalog.mjs';
import type { CatalogSkill, CatalogSkillRow, CatalogProjectRow } from '@/lib/skill-catalog-types';
import type { SkillUsageStore } from '@/lib/skill-usage-types';
import './lucian-050.css';
import './skill-workspace.css';

type View = 'library' | 'activity' | 'projects';
type Row = CatalogSkillRow | CatalogProjectRow;
const viewNames: Record<View, string> = { library: '技能库', activity: '使用统计', projects: '项目分布' };
const kindNames: Record<string, string> = { git: 'Git 仓库', directory: '目录线索', unknown: '未识别归属' };
const number = (value: number) => value.toLocaleString('zh-CN');
const isSkill = (row: Row): row is CatalogSkillRow => 'projectIds' in row;
const rowId = (view: View, id: string) => `skill-row-${view}-${encodeURIComponent(id)}`;

function Arrow({ direction = 'right' }: { direction?: 'right' | 'up' | 'down' }) {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d={direction === 'up' ? 'M4 10l4-4 4 4' : direction === 'down' ? 'M4 6l4 4 4-4' : 'M6 4l4 4-4 4'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export default function SkillWorkspace({ skills, updatedAt, matt = false, usage }: { skills: CatalogSkill[]; updatedAt: string; matt?: boolean; usage?: SkillUsageStore }) {
  const data = useMemo(() => buildSkillWorkspace(skills, usage), [skills, usage]);
  const views: View[] = usage ? ['library', 'activity', 'projects'] : ['library'];
  const [view, setView] = useState<View>('library');
  const [queries, setQueries] = useState<Record<View, string>>({ library: '', activity: '', projects: '' });
  const [filters, setFilters] = useState<Record<View, string>>({ library: 'all', activity: 'all', projects: 'git' });
  const [orders, setOrders] = useState<Record<View, string>>({ library: 'name', activity: 'count', projects: 'count' });
  const [selection, setSelection] = useState<string | null>(null);
  const [focusedRows, setFocusedRows] = useState<Record<View, string | null>>({ library: null, activity: null, projects: null });
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [showLowUsage, setShowLowUsage] = useState(false);
  const tabs = useRef<HTMLDivElement>(null), tabPill = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLElement>(null), panelTitle = useRef<HTMLHeadingElement>(null), panelBody = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null), direction = useRef(1), restoreFocus = useRef<string | null>(null);
  const query = queries[view], filter = filters[view];
  const source: Row[] = data[view];
  const searched = searchAndSortSkills(source, query, orders[view]);
  const normalVisible = view === 'projects' || !usage || showLowUsage ? searched : searched.filter(row => row.triggerCount >= 10);
  const visible = filter === 'low-usage' ? searched : normalVisible;
  const categoryNames = [...new Set(data.library.map(skill => skill.category))].filter(name => name !== '个人维护').sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const filterOptions = view === 'library'
    ? [{ id: 'all', label: '全部技能' }, { id: 'self-global', label: '自己维护 · 全局' }, { id: 'self-project', label: '自己维护 · 项目' }, ...categoryNames.map(id => ({ id, label: id })), ...(usage ? [{ id: 'low-usage', label: '低频技能' }] : [])]
    : view === 'activity' ? [{ id: 'all', label: '全部记录' }, { id: 'installed', label: '当前清单' }, { id: 'historical', label: '历史技能' }]
    : [{ id: 'all', label: '全部归属' }, { id: 'git', label: 'Git 仓库' }, { id: 'directory', label: '目录线索' }, { id: 'unknown', label: '未识别归属' }];
  function matches(row: Row, value: string) {
    if (value === 'all') return true;
    if (!isSkill(row)) return row.kind === value;
    if (view === 'library') {
      if (value === 'low-usage') return row.triggerCount < 10;
      if (value === 'self-global' || value === 'self-project') return row.catalog?.group === 'self' && row.catalog.scope.split(' / ').includes(value === 'self-global' ? '全局' : '项目');
      return row.category === value;
    }
    return value === 'installed' ? Boolean(row.catalog) : !row.catalog;
  }
  const rows = visible.filter(row => matches(row, filter));
  const tabStop = rows.some(row => row.id === focusedRows[view]) ? focusedRows[view] : rows[0]?.id;
  const selectedIndex = rows.findIndex(row => row.id === selection);
  const selected = rows[selectedIndex];
  const open = Boolean(selected);
  const skill = selected && isSkill(selected) ? selected : undefined;
  const project = selected && !isSkill(selected) ? selected : undefined;
  const activeFilter = filterOptions.find(option => option.id === filter)?.label ?? viewNames[view];
  const linkedProjects = skill ? (usage?.skills.find(item => item.name === skill.name)?.projects ?? []).map(item => ({ ...data.projects.find(project => project.id === item.projectId)!, count: item.triggerCount })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) : [];
  const linkedSkills = project ? (usage?.skills ?? []).flatMap(item => {
    const observation = item.projects.find(group => group.projectId === project.id);
    return observation ? [{ name: item.name, count: observation.triggerCount, current: data.library.some(skill => skill.name === item.name) }] : [];
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) : [];
  const duplicateProjectNames = new Set(data.projects.filter(project => data.projects.some(other => other.id !== project.id && other.name === project.name)).map(project => project.name));
  const projectLabel = (project: CatalogProjectRow) => `${project.name}${duplicateProjectNames.has(project.name) ? ` · ${project.id.slice(-4)}` : ''}`;

  useEffect(() => {
    function position() {
      for (const [root, pill, attribute] of [[tabs.current, tabPill.current, 'aria-selected']] as const) {
        const active = root?.querySelector<HTMLElement>(`[${attribute}="true"]`);
        if (!root || !pill || !active) continue;
        for (const [key, value] of Object.entries({ x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight })) pill.style.setProperty(`--${key}`, `${value}px`);
      }
    }
    const observer = new ResizeObserver(position);
    if (tabs.current) observer.observe(tabs.current);
    position();
    return () => observer.disconnect();
  }, [view, filter, query, skills]);

  useEffect(() => {
    if (!selection) return;
    const row = document.getElementById(rowId(view, selection));
    const region = list.current;
    if (row && region) {
      if (row.offsetTop < region.scrollTop) region.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > region.scrollTop + region.clientHeight) region.scrollTop = row.offsetTop + row.offsetHeight - region.clientHeight;
    }
    panelTitle.current?.focus({ preventScroll: true });
    panelBody.current?.scrollTo({ top: 0 });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = panelBody.current?.animate([{ transform: `translateY(${direction.current * 40}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, easing: 'cubic-bezier(.3,1.1,.4,1)' });
    return () => animation?.cancel();
  }, [view, selection]);

  useEffect(() => {
    if (!open) {
      if (restoreFocus.current) document.getElementById(restoreFocus.current)?.focus({ preventScroll: true });
      restoreFocus.current = null;
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function choose(id: string, move = 1) { direction.current = move; setCopied('idle'); setSelection(id); }
  function close() { restoreFocus.current = rowId(view, selection ?? ''); setSelection(null); }
  function changeView(next: View) { setSelection(null); setView(next); }
  function openProject(id: string) { setView('projects'); setQueries(state => ({ ...state, projects: '' })); setFilters(state => ({ ...state, projects: data.projects.find(project => project.id === id)?.kind ?? 'all' })); choose(id); }
  function openSkill(name: string) {
    const next = data.library.some(skill => skill.name === name) ? 'library' : 'activity';
    if ((data[next].find(row => row.name === name)?.triggerCount ?? 0) < 10) setShowLowUsage(true);
    setView(next); setQueries(state => ({ ...state, [next]: '' })); setFilters(state => ({ ...state, [next]: 'all' })); choose(name);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, selector: string) {
    if (event.nativeEvent.isComposing) return;
    const buttons = Array.from(event.currentTarget.parentElement?.closest(selector)?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const index = buttons.indexOf(event.currentTarget);
    const next = ['ArrowDown', 'ArrowRight'].includes(event.key) ? (index + 1) % buttons.length : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); buttons[next]?.focus();
  }
  function onPanelKey(event: KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if ((event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k') && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault(); const step = event.key.toLowerCase() === 'j' ? 1 : -1;
      if (rows[selectedIndex + step]) choose(rows[selectedIndex + step].id, step);
    } else if (event.key === 'Tab') {
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? []);
      const current = controls.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && current <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && (current === controls.length - 1 || current === -1)) { event.preventDefault(); controls[0]?.focus(); }
    } else if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || event.key === '/') event.preventDefault();
  }
  async function copyName() {
    if (!skill) return;
    try { await navigator.clipboard.writeText(`$${skill.name}`); setCopied('done'); }
    catch { setCopied('failed'); }
  }

  return <div className={`skill-catalog ux ${open ? 'is-open' : ''}`}>
    <div className="skill-workspace-surface" inert={open}>
      <header className="skill-intro">
        <div><p className="eyebrow">THE AGENT TOOLKIT</p><h1>{matt ? 'Matt Pocock' : 'Skills'}<span>{matt ? '引入与使用依据' : '技能工作台'}</span></h1><p>{matt ? '按任务查找上游技能，核对引入状态与项目使用依据。' : '找到合适的技能，查看用途、来源和实际触发项目。'}</p></div>
        <div className="skill-intro-meta"><a href={matt ? '/skills' : '/skills/matt'}>{matt ? '← 返回全部 Skills' : 'Matt Pocock 专区 ↗'}</a>{matt && <a href="https://github.com/mattpocock/skills" target="_blank" rel="noreferrer">上游仓库 ↗</a>}<span>清单更新于 <time dateTime={updatedAt}>{updatedAt}</time></span></div>
      </header>
      <div className="skill-view-bar">
        <div className="u039-tabs" role="tablist" aria-label="技能工作台视图" ref={tabs}><span className="u039-pill" aria-hidden="true" ref={tabPill} />{views.map(item => <button key={item} id={`skill-tab-${item}`} className="u039-tab" type="button" role="tab" aria-selected={view === item} aria-controls="skill-workspace-panel" tabIndex={view === item ? 0 : -1} onClick={() => changeView(item)} onKeyDown={event => {
          const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : step ? (views.indexOf(view) + step + views.length) % views.length : -1;
          if (index < 0) return; event.preventDefault(); changeView(views[index]); tabs.current?.querySelectorAll<HTMLButtonElement>('.u039-tab')[index]?.focus();
        }}>{viewNames[item]}<span>{item === 'projects' ? `${number(usage!.totals.projectCount)} 仓库` : number(!usage || showLowUsage ? data[item].length : data[item].filter(row => row.triggerCount >= 10).length)}</span></button>)}</div>
        <p>{view === 'library' ? matt ? `${data.library.filter(skill => skill.installed).length} 个已引入（含历史） · ${data.library.filter(skill => !skill.installed).length} 个未引入` : `${skills.length} 个条目 · ${skills.filter(skill => skill.group === 'self').length} 个自己维护` : view === 'activity' ? `${number(usage!.totals.triggerCount)} 次可核验触发 · 同轮同技能去重` : `${usage!.totals.projectCount} 个仓库 · ${usage!.totals.directoryGroupCount} 项目录线索`}</p>
      </div>

      <section id="skill-workspace-panel" role="tabpanel" aria-labelledby={`skill-tab-${view}`} className="skill-workspace">
        <div className="skill-results">
          <div className="skill-tools"><ContentSearch label={view === 'projects' ? '搜索项目或技能' : '搜索技能、用途或项目'} accessibleLabel="搜索技能工作台" placeholder={view === 'projects' ? '项目名称、技能名称…' : '技能名称、用途、来源、项目…'} query={query} onChange={value => { setQueries(state => ({ ...state, [view]: value })); setSelection(null); list.current?.scrollTo({ top: 0 }); }} resultCount={rows.length} /><GraphTopicSelect label={view === 'library' ? '分类筛选' : view === 'activity' ? '清单筛选' : '归属筛选'} showCounts={false} value={filter} onChange={value => { setFilters(state => ({ ...state, [view]: value })); setSelection(null); list.current?.scrollTo({ top: 0 }); }} options={filterOptions.map(option => ({ ...option, count: 0 }))} /><GraphTopicSelect label="排序" showCounts={false} value={orders[view]} onChange={value => { setOrders(state => ({ ...state, [view]: value })); list.current?.scrollTo({ top: 0 }); }} options={[{ id: 'name', label: '按名称', count: 0 }, ...(usage ? [{ id: 'count', label: '按触发次数', count: 0 }, { id: 'groups', label: view === 'projects' ? '按技能数量' : '按归属数量', count: 0 }] : [])]} /></div>
          {usage && view !== 'projects' && filter !== 'low-usage' && <label className="skill-low-usage u014-row"><input className="u014-in" type="checkbox" checked={showLowUsage} onChange={event => { setShowLowUsage(event.target.checked); setSelection(null); list.current?.scrollTo({ top: 0 }); }} /><span className="u014-box" aria-hidden="true"><svg viewBox="0 0 26 26"><path d="M7.5 13.5l3.8 3.8 7.4-8" /></svg></span><span className="u014-t">显示触发少于 10 次的技能</span></label>}
          <div className="skill-list-frame u273"><div className="skill-list-heading"><h2>{activeFilter}<span>{rows.length}</span></h2><span aria-live="polite">{query ? `匹配 ${rows.length} 条` : '点选查看详情'}</span></div><div className="skill-column-head" aria-hidden="true"><span>{view === 'projects' ? '项目 / 归属' : '技能 / 用途'}</span>{usage && <><span>触发次数</span><span>{view === 'projects' ? '技能' : '归属'}</span></>}</div>
            <ol className="u273-ls skill-rows" aria-label={`${viewNames[view]}结果`} ref={list}>{rows.map(row => <li key={row.id}><button id={rowId(view, row.id)} className={`u273-rw ${selection === row.id ? 'is-on' : ''}`} type="button" tabIndex={row.id === tabStop ? 0 : -1} aria-label={`查看${isSkill(row) ? '技能' : '项目'} ${isSkill(row) ? row.name : projectLabel(row)}`} aria-haspopup="dialog" aria-current={selection === row.id ? 'true' : undefined} onFocus={() => setFocusedRows(state => ({ ...state, [view]: row.id }))} onClick={() => choose(row.id)} onKeyDown={event => navigate(event, '.skill-rows')}><span className={`u273-av ${isSkill(row) && row.catalog?.group === 'self' ? 'is-self' : ''}`} aria-hidden="true">{isSkill(row) ? row.name.slice(0, 1).toUpperCase() : row.kind === 'git' ? 'G' : row.kind === 'directory' ? 'D' : '?'}</span><div className="skill-row-copy"><b>{isSkill(row) ? row.name : projectLabel(row)}{isSkill(row) && !row.catalog && <em>历史</em>}{matt && isSkill(row) && !row.installed && <em>未引入</em>}</b><small>{isSkill(row) ? row.catalog?.summary ?? '当前安装清单未收录，保留历史触发记录。' : kindNames[row.kind] ?? row.kind}</small></div>{usage && <><span className={`skill-row-count ${!row.triggerCount ? 'is-zero' : ''}`}>{row.triggerCount ? number(row.triggerCount) : '—'}</span><span className="skill-row-groups">{isSkill(row) ? row.projectIds.length : row.skillNames.length}</span></>}<Arrow /></button></li>)}</ol>
            {rows.length === 0 && <div className="skill-empty"><h3>没有匹配的{view === 'projects' ? '项目' : '技能'}</h3><p>{view !== 'projects' && usage && !showLowUsage && filter !== 'low-usage' ? '可以查看低频技能，或清空关键词和分类。' : '可以清空关键词和分类，再重新查找。'}</p><button className="u050-btn" type="button" onClick={() => { setQueries(state => ({ ...state, [view]: '' })); setFilters(state => ({ ...state, [view]: 'all' })); if (view !== 'projects') setShowLowUsage(true); }}>重置筛选 <span aria-hidden="true">↗</span></button></div>}
          </div>
          <p className="skill-results-note">{!usage ? '点选条目查看安装范围和项目使用依据；未引入不代表从未使用。' : view === 'library' ? '“—”表示暂无可核验触发。复制技能名称后，可在支持的 Agent 中引用。' : '次数只说明已观察到的技能加载，不代表执行成功或熟练程度。'}{usage && <> · 统计更新于 <time dateTime={usage.updatedAt}>{usage.updatedAt.slice(0, 10)}</time></>}</p>
        </div>
      </section>
    </div>

    <div className="u273-ov skill-detail-overlay" aria-hidden="true" onClick={close} />
    <aside className="u273-pn skill-detail" ref={panel} role="dialog" aria-modal={open ? true : undefined} aria-labelledby="skill-detail-title" aria-hidden={!open} inert={!open} onKeyDown={onPanelKey}>
      <div className="u273-tb"><button type="button" aria-label="上一个条目" disabled={selectedIndex <= 0} onClick={() => choose(rows[selectedIndex - 1].id, -1)}><Arrow direction="up" /></button><button type="button" aria-label="下一个条目" disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1} onClick={() => choose(rows[selectedIndex + 1].id)}><Arrow direction="down" /></button><span>{selected ? `${selectedIndex + 1} / ${rows.length} · J / K 切换` : ''}</span><button type="button" aria-label="关闭详情" onClick={close}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button></div>
      <div className="u273-bd" ref={panelBody}>{selected && <div className="u273-pg">
        <p className="skill-detail-eyebrow">{skill ? skill.catalog ? skill.category === '个人维护' ? `自己维护 · ${skill.catalog.scope}` : skill.category : '历史技能' : kindNames[project!.kind] ?? project!.kind}</p><h2 id="skill-detail-title" tabIndex={-1} ref={panelTitle}>{skill?.name ?? projectLabel(project!)}</h2>
        <p className="skill-detail-summary">{skill ? skill.catalog?.summary ?? '这个名称保留有历史触发记录，当前安装清单未收录。' : `${linkedSkills.length} 个技能在这项归属下留下可核验加载记录。`}</p>
        {skill && <div className="skill-detail-actions"><button className="u050-btn" type="button" onClick={copyName}>{copied === 'done' ? '已复制 ✓' : '复制 $技能名'}<span aria-hidden="true">↗</span></button>{skill.catalog?.sourceUrl && <a className="u050-btn skill-source-link" href={skill.catalog.sourceUrl} target="_blank" rel="noreferrer" aria-label={`查看 ${skill.name} 来源（新窗口）`}>查看来源 <span aria-hidden="true">↗</span></a>}<span className="skill-copy-status" role="status">{copied === 'done' ? `已复制 $${skill.name}` : copied === 'failed' ? '复制失败，请手动选择技能名称。' : ''}</span></div>}
        {usage && <dl className="u273-kv"><div><dt>可核验触发</dt><dd>{number(selected.triggerCount)}<small>次</small></dd></div><div><dt>{skill ? '项目与目录归属' : '触发技能'}</dt><dd>{skill ? linkedProjects.length : linkedSkills.length}<small>项</small></dd></div></dl>}
        {skill?.catalog && <dl className="skill-detail-meta"><div><dt>维护来源</dt><dd>{skill.catalog.source}</dd></div><div><dt>安装范围</dt><dd>{skill.catalog.scope}</dd></div>{skill.catalog.usage && <div><dt>项目使用依据</dt><dd>{skill.catalog.usage}</dd></div>}{skill.catalog.projects && <div><dt>历史项目安装</dt><dd>{skill.catalog.projects}</dd></div>}{!skill.catalog.sourceUrl && <div><dt>来源入口</dt><dd>{skill.catalog.group === 'self' ? '本地维护资料' : '来源链接待核验'}</dd></div>}</dl>}
        {usage && <section className="skill-detail-distribution"><h3>{skill ? '触发项目与目录' : '触发技能'}<span>{skill ? linkedProjects.length : linkedSkills.length}</span></h3><p>按本项触发次数排序，点选可继续查看。</p><ol>{skill ? linkedProjects.map(item => <li key={item.id}><button className="u273-rw" type="button" onClick={() => openProject(item.id)} aria-label={`查看项目 ${projectLabel(item)}`}><div><b>{projectLabel(item)}</b><small>{kindNames[item.kind] ?? item.kind}</small></div><em>{number(item.count)} 次</em><Arrow /></button></li>) : linkedSkills.map(item => <li key={item.name}><button className="u273-rw" type="button" onClick={() => openSkill(item.name)} aria-label={`查看技能 ${item.name}`}><div><b>{item.name}</b><small>{item.current ? '当前清单' : '历史技能'}</small></div><em>{number(item.count)} 次</em><Arrow /></button></li>)}</ol>{skill && linkedProjects.length === 0 && <p className="skill-detail-no-data">暂无可核验触发记录，安装状态不作为触发依据。</p>}</section>}
        {usage && <p className="skill-detail-footnote">同轮同技能最多计一次，排除副本与维护读取。目录线索不等同于已确认的 Git 仓库；历史技能不代表当前仍安装。</p>}
        {matt && <a className="skill-upstream" href="https://github.com/mattpocock/skills" target="_blank" rel="noreferrer">查看 Matt Pocock 上游仓库 ↗</a>}
      </div>}</div>
    </aside>
  </div>;
}
