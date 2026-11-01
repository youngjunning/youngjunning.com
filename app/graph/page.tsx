import Link from 'next/link';
import { buildPublicSnapshot } from '@/lib/content-store.mjs';
export const metadata = { title: '资料关联图谱' };
type GraphData = { nodes: { id: string; type: string; label: string; url?: string }[]; edges: { source: string; target: string; type: string; purpose?: string; evidence: { basis?: string; line?: number } }[] };
export default async function Graph({ searchParams }: { searchParams: Promise<{ favorite?: string; article?: string }> }) {
  const { favorite, article } = await searchParams;
  const graph: GraphData = buildPublicSnapshot().graph;
  const focus = favorite ? 'favorite:' + favorite : article;
  const nodes = graph.nodes.filter(node => !focus || node.id === focus || graph.edges.some(edge => (edge.source === focus && edge.target === node.id) || (edge.target === focus && edge.source === node.id)));
  const labels: Record<string, string> = { document: '文章', topic: '分类', favorite: '收藏', project: '使用项目', tag: '标签' };
  const relations: Record<string, string> = { references: '正文引用', belongs_to: '主题归属', uses: '项目使用', tagged: '标签相关' };
  return <><header className="page-head"><span className="eyebrow">CONNECTIONS WITH EVIDENCE</span><h1>资料关联图谱。</h1><p>文章引用、分类、收藏与有证据的项目使用分别展示。有关联不代表本人认可、因果或观点变化。</p><Link href="/graph">查看全部关联</Link> · <Link href="/blog">浏览文章</Link> · <Link href="/favorites">返回收藏</Link></header><section className="page-body">{nodes.map(node => <article className="resource" id={node.id} key={node.id}><small>{labels[node.type] || node.type}</small><h2>{node.url ? <Link href={node.url}>{node.label}</Link> : node.label}</h2>{graph.edges.filter(edge => edge.source === node.id || edge.target === node.id).map((edge, i) => { const other = graph.nodes.find(item => item.id === (edge.source === node.id ? edge.target : edge.source)); return other && <p key={i}><Link href={'/graph#' + other.id}>{other.label}</Link> · {relations[edge.type] || edge.type}<br />{edge.purpose} {edge.evidence.basis || (edge.evidence.line ? '正文第 ' + edge.evidence.line + ' 行' : '')}</p>; })}</article>)}</section></>;
}
