import { getContent } from '@/lib/content';

export const metadata = { title: '对话精选' };
export default function Excerpts() {
  const items = getContent().excerpts;
  return <><header className="page-head"><span className="eyebrow">CONVERSATIONS TO REVISIT</span><h1>对话精选。</h1><p>值得重读的短片段，保留说话者、选择理由和可回看的公开来源。AI 的回答不自动成为我的观点。</p></header>
    <section className="page-body"><div className="curation-list">{items.map(item => <article className="curation-card" id={item.id} key={item.id}><div className="curation-meta">{item.selection === 'explicit' ? '本人精选' : '会话发现'} · {item.format === 'verbatim' ? '原话' : '摘要'} · {item.date || '日期未详'}</div><h2>{item.title}</h2><p>{item.context}</p>
      <div className="curation-messages">{item.messages.map((message, index) => <div className="curation-message" key={index}><strong>{message.role === 'user' ? '俊宁' : 'AI'}</strong><p>{message.text}</p></div>)}</div>
      <p>保留理由：{item.reason}</p><small>来源：<a href={item.source.url!}>{item.source.label} ↗</a></small>
    </article>)}{!items.length && <div className="empty">还没有适合公开的精选片段。<br />只有来源和受众都核对过的内容才会出现在这里。</div>}</div></section></>;
}
