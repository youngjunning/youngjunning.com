// Lucian UX/UI Prompt #211 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#211
import Link from 'next/link';
import './lucian-211.css';
export default function KnowledgePortal({ articles, topics, references }: { articles: number; topics: number; references: number }) {
  return <section className="ux u211 knowledge-portal"><span className="u211-bm" aria-hidden="true" /><span className="u211-tg">文章与引用，连接经历与判断</span><h2 className="u211-h">观点有来处，<br /><span className="u211-gr">经验有联系。</span></h2><p className="u211-p">{articles} 篇文章 · {topics} 种主题 · {references} 条真实引用</p><div className="u211-row"><Link className="u211-bt" href="/blog"><span className="u211-in"><span>阅读手记</span><svg className="u211-ar" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span></Link><Link href="/graph" className="u211-gh">探索引用图谱 ↗</Link></div></section>;
}
