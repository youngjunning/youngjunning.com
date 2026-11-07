'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Graph } from '@/lib/types';

const labels = { references: '原文引用', uses: '项目使用', tagged: '主题或标签相关', belongs_to: '栏目归属', related: '显式关联', explains: '概念说明' };
export default function PaperGraph({ graph, initialDoc }: { graph: Graph; initialDoc?: string }) {
  const [selected, setSelected] = useState(graph.nodes.some(node => node.id === initialDoc) ? initialDoc! : graph.nodes.find(node => node.type === 'document')?.id || '');
  const [query, setQuery] = useState('');
  const [relation, setRelation] = useState('all');
  const [page, setPage] = useState(0);
  const nodes = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph.nodes]);
  const center = nodes.get(selected);
  const edges = graph.edges.filter(edge => (edge.source === selected || edge.target === selected) && (relation === 'all' || edge.type === relation));
  const visible = edges.slice(page * 8, page * 8 + 8);
  const href = (id: string) => nodes.get(id)?.url || (nodes.get(id)?.type === 'document' ? `/docs/${id}` : undefined);
  function choose(id: string) { setSelected(id); setPage(0); const url = new URL(location.href); url.searchParams.set('doc', id); history.replaceState(null, '', url); }
  return <div className="sc-graph-layout"><aside className="sc-node-index"><label>找一个起点<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="文章、收藏、项目、标签" /></label><p>{graph.nodes.filter(node => node.label.toLowerCase().includes(query.toLowerCase())).length} 个节点</p><div>{graph.nodes.filter(node => node.label.toLowerCase().includes(query.toLowerCase())).map(node => <button type="button" key={node.id} aria-pressed={selected === node.id} onClick={() => choose(node.id)}>{node.label}<small>{node.type}</small></button>)}</div></aside>
    <section className="sc-relations"><div className="sc-tabs"><label>连线依据 <select value={relation} onChange={event => { setRelation(event.target.value); setPage(0); }}><option value="all">全部关系</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="sc-connection-map"><svg viewBox="0 0 700 560" role="img" aria-label="以所选节点为中心的关联地图"><g fill="none" stroke="#933323" strokeWidth="1.5">{visible.map((edge, i) => { const angle = (i / Math.max(visible.length, 1) * 2 * Math.PI) - Math.PI / 2; return <path key={i} strokeDasharray={edge.type === 'tagged' ? '6 5' : edge.type === 'belongs_to' ? '2 5' : undefined} d={`M350 280 Q${350 + Math.cos(angle + .25) * 100} ${280 + Math.sin(angle + .25) * 100} ${350 + Math.cos(angle) * 235} ${280 + Math.sin(angle) * 210}`} />; })}</g><foreignObject x="270" y="238" width="160" height="84"><div className="sc-map-center">{center?.label || '请选择节点'}</div></foreignObject>{visible.map((edge, i) => { const id = edge.source === selected ? edge.target : edge.source; const angle = i / Math.max(visible.length, 1) * 2 * Math.PI - Math.PI / 2; return <foreignObject key={i} x={350 + Math.cos(angle) * 235 - 75} y={280 + Math.sin(angle) * 210 - 38} width="150" height="76"><button className="sc-map-node" type="button" onClick={() => choose(id)} title={nodes.get(id)?.label}>{nodes.get(id)?.label}<small>{labels[edge.type]}</small></button></foreignObject>; })}</svg></div>
    <h2>{center?.label}</h2>{href(selected) && <Link className="sc-button" href={href(selected)!}>打开当前资料 ↗</Link>}<p className="sc-result">共 {edges.length} 条关系，当前显示 {visible.length} 条。标签与主题连线不表示采用或因果。</p><div className="sc-paging"><button disabled={!page} onClick={() => setPage(page - 1)}>← 上一组</button><span>{page + 1} / {Math.max(1, Math.ceil(edges.length / 8))}</span><button disabled={(page + 1) * 8 >= edges.length} onClick={() => setPage(page + 1)}>下一组 →</button></div>
    <ol className="sc-edge-list">{visible.map((edge, i) => { const other = edge.source === selected ? edge.target : edge.source; return <li key={i}><b>{labels[edge.type]} · {edge.source === selected ? '指向' : '来自'} </b><button onClick={() => choose(other)}>{nodes.get(other)?.label}</button><p>{edge.evidence.basis || edge.evidence.sourcePath}{edge.evidence.line ? ` · 第 ${edge.evidence.line} 行` : ''}</p></li>; })}</ol></section></div>;
}
