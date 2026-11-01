import Link from 'next/link';
import catalog from '@/content/skills.json';
import { buildPublicSnapshot } from '@/lib/content-store.mjs';
import { SkillUsage } from '@/components/skill-usage';
export const metadata = { title: 'Skills · 技能体系' };
export default function Skills() {
  const { usage } = buildPublicSnapshot();
  return <><header className="page-head"><span className="eyebrow">TOOLS FOR THINKING AND BUILDING</span><h1>技能体系。</h1><p>自己维护的技能与引入的开源技能，保留用途与来源。</p></header><section className="page-body"><SkillUsage usage={usage} /><article className="resource"><small>FOUNDATION / 技能体系的基石</small><h2><Link href="/skills/matt">Matt Pocock 专区 ↗</Link></h2><p>查看已引入、未引入和历史保留的技能，以及脱敏后的项目关系与使用约定。</p></article>{catalog.skills.map(s => <article className="resource" key={s.id} style={{ overflowWrap: 'anywhere' }}><small>{s.group === 'self' ? '自己维护' : '引入技能'}</small><h2>{s.name}</h2><p>{s.summary}</p>{s.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noreferrer">公开来源 ↗</a>}</article>)}</section></>;
}
