import Link from 'next/link';
import { MattCatalog } from '@/components/matt-catalog';
import catalog from '@/content/matt-skills.json';
export const metadata = { title: 'Matt Pocock · 技能体系的基石', description: 'Matt Pocock 技能的引入状态、全局安装范围与脱敏项目使用约定。' };
export default function MattSkills() {
  return <><header className="page-head"><span className="eyebrow">STANDING ON THE SHOULDERS OF GIANTS</span><h1>Matt Pocock</h1><p>我的技能体系的基石。这里记录哪些技能已经引入、哪些尚未引入，以及它们与项目的关系。</p><p><Link href="/skills">← 全部 Skills</Link> · <a href="https://github.com/mattpocock/skills" target="_blank" rel="noreferrer">上游技能库 ↗</a></p></header><section className="page-body"><p>已引入 36 项 · 历史保留 1 项 · 未引入 3 项。已引入的技能统一全局维护。</p><p>项目名称已泛化。历史安装、使用约定与实际调用分别记录，不从安装状态推断使用频率或熟练程度。</p><small>清单核验：{catalog.updatedAt} · 上游版本 {catalog.upstreamCommit.slice(0, 7)}</small><MattCatalog skills={catalog.skills} /></section></>;
}
