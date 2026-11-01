import Link from 'next/link';
import { getConversationKnowledge } from '@/lib/twin-server';
export const metadata = { title: '知识 Wiki' };
export default function Wiki() {
  const index = getConversationKnowledge(), pages = index.wiki?.pages || index.engineeringPages || [];
  const sources = new Map(index.entries.map(source => [source.id, source]));
  return <><header className="page-head"><span className="eyebrow">SYNTHESIS WITH SOURCES</span><h1>知识 Wiki。</h1><p>根据公开原文整理并审核的归纳；引用仍回到原始资料。归纳不代表本人原话或新增经历。</p><Link href="/engineering">查看工程资料 ↗</Link></header><section className="page-body">{!pages.length && <p className="empty">暂无通过审核的综合页。仍可直接阅读文章和个人记录，或从对话中检索原文。</p>}{pages.map(page => <article className="resource" id={page.id} key={page.id}><h2>{page.title}</h2><small>覆盖 {page.coverage.sampledSources}/{page.coverage.totalSources} 份来源 · 模型归纳</small>{page.paragraphs.map(paragraph => <section key={paragraph.id}><p>{paragraph.text}</p>{paragraph.evidence.map((ref, i) => { const source = sources.get(ref.sourceId); return source && <details key={i}><summary>查看原文：<Link href={source.url}>{source.title}</Link></summary><blockquote>{ref.quote}</blockquote></details>; })}</section>)}</article>)}</section></>;
}
