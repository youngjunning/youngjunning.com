import Link from 'next/link';
import { getConversationKnowledge } from '@/lib/twin-server';
export const metadata = { title: '工程资料' };
export default function Engineering() {
  const sources = getConversationKnowledge().entries.filter(source => source.kind === 'code');
  return <><header className="page-head"><span className="eyebrow">REVIEWED ENGINEERING EVIDENCE</span><h1>工程资料。</h1><p>仅展示经审阅的公开仓库固定版本摘录。代码事实不证明运行、部署、个人贡献或主观判断。</p><Link href="/wiki">查看 Wiki ↗</Link></header><section className="page-body">{!sources.length && <p className="empty">暂无获准公开的工程摘录。内部仓库原文与证据不会随模块迁入公开站。</p>}{sources.map(source => <article className="resource" key={source.id}><h2><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></h2><small>固定版本 {source.commit?.slice(0, 12)} · 行 {source.lineStart}–{source.lineEnd}</small><pre><code>{source.text}</code></pre></article>)}</section></>;
}
