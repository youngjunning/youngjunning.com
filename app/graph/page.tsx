import Link from 'next/link';
import {getContent} from '@/lib/content';
import {favoriteGraph} from '@/lib/favorite-tracking.mjs';
export const metadata={title:'收藏关联图谱'};
export default async function Graph({searchParams}:{searchParams:Promise<{favorite?:string}>}){
 const {favorite}=await searchParams, graph=favoriteGraph(getContent().favorites);
 const nodes=graph.nodes.filter(n=>!favorite||n.id==='favorite:'+favorite||graph.edges.some(e=>(e.source==='favorite:'+favorite&&e.target===n.id)||(e.target==='favorite:'+favorite&&e.source===n.id)));
 return <><header className="page-head"><span className="eyebrow">RESOURCE CONNECTIONS</span><h1>收藏关联图谱</h1><p>区分有证据的项目使用与主题标签；收藏本身不表示选用。</p><Link href="/graph">查看全部关联</Link> · <Link href="/favorites">返回收藏</Link></header><section className="page-body">{nodes.map(n=><article className="resource" id={n.id} key={n.id}><small>{n.type==='favorite'?'收藏':n.type==='project'?'使用项目':'主题'}</small><h2>{n.url?<Link href={n.url}>{n.label}</Link>:n.label}</h2>{graph.edges.filter(e=>e.source===n.id||e.target===n.id).map((e,i)=>{const other=graph.nodes.find(x=>x.id===(e.source===n.id?e.target:e.source))!;return <p key={i}><a href={'/graph#'+other.id}>{other.label}</a> · {e.type==='uses'?'项目使用':'主题相关'}<br/>{e.purpose} {e.evidence}</p>})}</article>)}</section></>;
}
