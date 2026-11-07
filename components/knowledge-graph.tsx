// Lucian UX/UI Prompt #273 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#273
'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import Shell from './shell';
import GraphTopicSelect from './lucian/graph-topic-select';
import SpringGraph from './lucian/spring-graph';
import { GraphSearch, GraphLinkSwitch } from './lucian/graph-controls';
import type { Catalog, Graph } from '@/lib/types';
import './lucian/graph-workspace.css';

export default function KnowledgeGraph({ catalog, graph, initialDoc }: { catalog: Catalog; graph: Graph; initialDoc?: string }) {
  const [selected, setSelected] = useState(initialDoc || '');
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');
  const [showTopics, setShowTopics] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [viewVersion, setViewVersion] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(!!initialDoc);
  const [fullscreen, setFullscreen] = useState(false);
  const [direction, setDirection] = useState(1);
  const detailsId = useId();
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const fullscreenTrigger = useRef<HTMLButtonElement>(null);
  const detailsScroll = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);

  useEffect(() => { detailsScroll.current?.scrollTo(0, 0); }, [selected]);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    const trigger = fullscreenTrigger.current;
    document.body.style.overflow = 'hidden';
    const surrounding = Array.from(workspaceRef.current?.closest('.site-shell')?.querySelectorAll<HTMLElement>('.site-header, .page-footer') || []);
    const previousInert = surrounding.map((element) => element.inert);
    surrounding.forEach((element) => { element.inert = true; });
    // Keep keyboard focus inside the expanded canvas, including when entered by touch.
    workspaceRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
      surrounding.forEach((element, index) => { element.inert = previousInert[index]; });
      trigger?.focus({ preventScroll: true });
    };
  }, [fullscreen]);
  const visible = graph.nodes.filter((node) => (topic === 'all' || node.topic === topic) && (node.type === 'topic' || !query || node.label.toLowerCase().includes(query.toLowerCase())));
  const ids = new Set(visible.map((node) => node.id));
  const refs = graph.edges.filter((edge) => edge.type === 'references');
  function selectDocument(id: string) {
    const target = graph.nodes.find((item) => item.id === id);
    if (target && topic !== 'all' && target.topic !== topic) setTopic('all');
    if (target && query && !target.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())) setQuery('');
    setSelected(id);
    if (id) setDetailsOpen(true);
    if (id && detailsScroll.current?.contains(document.activeElement)) {
      detailsScroll.current.focus({ preventScroll: true });
    }
  }
  const browsable = visible.filter((node) => node.type !== 'topic');
  const selectedIndex = browsable.findIndex((node) => node.id === selected);
  function navigate(offset: number) {
    const next = browsable[selectedIndex + offset];
    if (!next) return;
    setDirection(offset);
    selectDocument(next.id);
  }
  function closeDetails() {
    setDetailsOpen(false);
    detailsTrigger.current?.focus({ preventScroll: true });
  }
  function onWorkspaceKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('[role="listbox"]') || (event.key !== 'Escape' && target.closest('input, textarea, select'))) return;
    if (event.defaultPrevented && !(event.key === 'Escape' && target instanceof HTMLCanvasElement)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (detailsOpen) closeDetails();
      else setFullscreen(false);
    } else if (detailsOpen && ['j', 'k'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      navigate(event.key.toLowerCase() === 'j' ? 1 : -1);
    }
  }
  const doc = catalog.documents.find((item) => item.id === selected);
  const resource = graph.nodes.find(n=>n.id===selected && n.type!== "document" && n.type!=="topic");
  const connections = refs.filter((edge) => edge.source === selected || edge.target === selected);
  const resourceConnections = graph.edges.filter(edge => edge.type !== 'belongs_to' && edge.type !== 'references' && (edge.source === selected || edge.target === selected));
  function relatedResources() {
    return resourceConnections.map((edge) => {
      const other = graph.nodes.find(node => node.id === (edge.source === selected ? edge.target : edge.source));
      if (!other) return null;
      return <button className="connection-item" key={`${edge.source}:${edge.target}:${edge.type}`} onClick={() => selectDocument(other.id)}><small>{edge.type === 'uses' ? '项目使用' : edge.type === 'explains' ? '概念说明' : edge.type === 'related' ? '显式关联' : '主题或标签相关'} · {edge.evidence.basis}</small><span>{other.label}</span></button>;
    });
  }
  return <Shell active="graph"><section ref={workspaceRef} tabIndex={-1} aria-label="知识星图画布" onKeyDown={onWorkspaceKeyDown} className={`ux u273 graph-workspace ${detailsOpen ? 'is-open' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}>
    <div className="graph-stage" onPointerDown={(event) => { if (event.target instanceof HTMLCanvasElement) setDetailsOpen(false); }}>
      <SpringGraph key={viewVersion} graph={graph} topics={graph.topics} topic={topic} query={query} selected={selected} showTopics={showTopics} zoom={zoom} onSelect={selectDocument} onTopic={(value) => { setTopic(topic === value ? 'all' : value); setSelected(''); }} />
    </div>
    <div className="graph-canvas-heading"><div className="eyebrow">EXPLORE THE CONNECTIONS</div><h1>知识星图<span>看见记录之间的联系</span></h1><div className="graph-counters">{visible.filter((node) => node.type === 'document').length} 篇文档 · {visible.filter(n=>n.type==="favorite").length} 项收藏 <span>·</span> {refs.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).length} 条引用</div></div>
    <div className="graph-toolbar" aria-label="图谱筛选"><GraphTopicSelect options={[{ id: 'all', label: '全部主题', count: catalog.documents.length }, ...graph.topics.map((item) => ({ id: item.id, label: item.label, color: item.color, count: catalog.documents.filter((doc) => doc.topic === item.id).length }))]} value={topic} onChange={(value) => { setTopic(value); setSelected(''); }} /><GraphSearch value={query} onChange={(value) => { setQuery(value); setSelected(''); }} /><GraphLinkSwitch value={showTopics} onChange={setShowTopics} /></div>
    <div className="u273-tb graph-panel-toggle"><button ref={detailsTrigger} type="button" aria-label={detailsOpen ? '收起节点详情' : '展开节点详情'} aria-controls={detailsId} aria-expanded={detailsOpen} onClick={() => detailsOpen ? closeDetails() : setDetailsOpen(true)}><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2" y="3" width="14" height="12" rx="2" /><path d="M11 3v12" /></svg><b>节点详情</b></button></div>
    <div className="u273-tb graph-canvas-actions" aria-label="画布操作"><button type="button" aria-label="缩小图谱" disabled={zoom <= 0.4} onClick={() => setZoom((value) => Math.max(0.4, Number((value - 0.2).toFixed(1))))}>−</button><span className="graph-zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span><button type="button" aria-label="放大图谱" disabled={zoom >= 2.5} onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.2).toFixed(1))))}>＋</button><button type="button" aria-label="重置图谱视图" onClick={() => { setZoom(1); setViewVersion((value) => value + 1); }}>↺</button><i aria-hidden="true" /><button ref={fullscreenTrigger} type="button" className="graph-fullscreen-toggle" aria-label={fullscreen ? '退出全屏' : '全屏探索'} aria-pressed={fullscreen} onClick={() => setFullscreen((value) => !value)}><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={fullscreen ? 'M2 6h4V2m6 0v4h4M2 12h4v4m6 0v-4h4' : 'M6 2H2v4m10-4h4v4M2 12v4h4m6 0h4v-4'} /></svg><b>{fullscreen ? '退出全屏' : '全屏探索'}</b></button></div>
    {browsable.length === 0 && <div className="graph-no-results" role="status">没有匹配的节点，试试其他关键词或主题。</div>}
    <aside id={detailsId} className="u273-pn graph-details" aria-label="节点详情" aria-hidden={!detailsOpen} inert={!detailsOpen}>
      <div className="u273-tb graph-details-toolbar"><button type="button" aria-label="上一个节点" disabled={selectedIndex <= 0} onClick={() => navigate(-1)}>↑</button><button type="button" aria-label="下一个节点" disabled={selectedIndex < 0 || selectedIndex >= browsable.length - 1} onClick={() => navigate(1)}>↓</button><span>{selectedIndex >= 0 ? `${selectedIndex + 1} / ${browsable.length}` : '节点详情'}</span><button type="button" aria-label="收起详情面板" onClick={closeDetails}><svg viewBox="0 0 11 11" aria-hidden="true"><path d="M2.5 2.5l6 6M8.5 2.5l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button></div>
      <div ref={detailsScroll} tabIndex={-1} className="u273-bd graph-details-scroll"><div className="u273-pg graph-detail-page" key={selected} data-direction={direction}><div className="eyebrow">DOCUMENT CONTEXT</div>{doc ? <><span className="category-tag">{catalog.topics.find((item) => item.id === doc.topic)?.label}</span><h2>{doc.title}</h2><p>{doc.summary}</p><Link className="primary-button" href={doc.url}>阅读文档 ↗</Link><h3>引用与反向引用 <span>{connections.length}</span></h3>{connections.length ? connections.map((edge) => {
        const outgoing = edge.source === doc.id;
        const other = catalog.documents.find((item) => item.id === (outgoing ? edge.target : edge.source))!;
        return <button className="connection-item" key={edge.source + edge.target} onClick={() => selectDocument(other.id)}><small>{outgoing ? '引用了' : '被引用于'} · 第 {edge.evidence.line} 行</small><span>{other.title}</span></button>;
      }) : <p className="muted">暂无显式引用，可从同主题文档继续探索。</p>}{resourceConnections.length > 0 && <><h3>关联标签与项目 <span>{resourceConnections.length}</span></h3>{relatedResources()}</>}<p className="graph-evidence">分类依据：文章主题元数据。引用来自实际链接；共享标签仅表示相关，不证明使用。</p></> : resource ? <><h2>{resource.label}</h2><p>共享标签连接相关文章与收藏；项目使用单独保留证据，标签连线不表示选用。</p>{resource.url && <Link href={resource.url}>打开来源或收藏</Link>}<h3>关联文章、收藏与项目 <span>{resourceConnections.length}</span></h3>{relatedResources()}</> : <><h2>从一个节点开始</h2><p>小圆点包含文档、收藏、主题标签与使用项目。点击节点查看关系及依据。</p><h3>试着探索</h3>{catalog.documents.filter((item) => (topic === 'all' || item.topic === topic) && (!query || item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()))).slice(0, 6).map((item) => <button className="connection-item" key={item.id} onClick={() => selectDocument(item.id)}><span>{item.title}</span><small>查看上下文 ↗</small></button>)}</>}</div></div></aside>
    </section></Shell>;
}
