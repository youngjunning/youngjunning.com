import { siteProfile } from '@/lib/site-profile.mjs';
import { getSiteTheme } from '@/lib/site-theme';
import { StatechartExcerpts } from '@/components/statechart/pages';
import Shell from '@/components/shell';
import CurationAccordion from '@/components/lucian/curation-accordion';
import { getExcerpts } from '@/lib/curation';

export const metadata = { title: '对话精选' };
export default async function ExcerptsPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartExcerpts />;
  const items = getExcerpts();
  return <Shell active="excerpts"><div className="curation-page"><section className="page-intro curation-intro"><div className="curation-intro-inner"><div className="eyebrow">CONVERSATIONS / 02</div><h1>对话精选<span> / 值得重读的片段</span></h1><p>留下问题、回答和判断变化的上下文，回看时仍能分清是谁说的。</p></div></section>
    <div className="curation-layout"><aside className="curation-aside"><span className="curation-kicker">片段档案</span><strong>{items.length.toString().padStart(2, '0')}</strong><p>段值得重读的对话</p><div className="curation-aside-rule" /><p>原话与摘要分开标注；AI 的回答不自动成为{siteProfile.name}的观点。</p></aside><section className="curation-main" aria-label="对话精选"><div className="curation-section-heading"><span className="curation-kicker">精选片段</span><span>点击条目展开完整上下文</span></div>
    <CurationAccordion empty="还没有适合分享的精选片段。只有来源和受众都核对过的内容才会出现在这里。" panels={items.map(item => ({ id: item.id, title: item.title, meta: `${item.selection === 'explicit' ? '本人精选' : '会话发现'} · ${item.format === 'verbatim' ? '原话' : '摘要'} · ${item.date || '日期未详'}`, preview: item.messages.find(message => message.role === 'user')?.text || item.context, body: <>
      <p>{item.context}</p>{item.messages.map((message, index) => <div className="curation-message" key={index}><strong>{message.role === 'user' ? siteProfile.name : 'AI'}</strong><p>{message.text}</p></div>)}
      <p>保留理由：{item.reason}</p><p>来源：{item.source.url ? <a href={item.source.url}>{item.source.label} ↗</a> : item.source.label}</p>
    </> }))} /></section></div></div>
  </Shell>;
}
