import type { Metadata } from 'next';
import Link from 'next/link';
import resume from '@/content/resume.json';
import Shell from '@/components/shell';
import StatechartShell from '@/components/statechart/shell';
import { getSiteTheme } from '@/lib/site-theme';
import './hard-skills.css';

export const metadata: Metadata = {
  title: '硬实力',
  description: '俊宁的技术领域与子能力，依据公开简历和项目经历整理。',
  alternates: { canonical: '/hard-skills' },
};

function SkillAreas() {
  return <section className="hard-skills" aria-label="技术领域与子能力">
    <p className="hard-skills-lead">按技术领域组织能力，具体方法放在所属领域下。这里不设置能力等级；项目经历说明实际工作范围。</p>
    <div className="hard-skills-list">{resume.skills.map((skill, index) => <article key={skill.title} className="hard-skills-area">
      <div className="hard-skills-area-head"><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{skill.title}</h2><p>{skill.text}</p></div></div>
      {'children' in skill && skill.children?.length ? <ul className="hard-skills-children">{skill.children.map(child => <li key={child.title}><h3>{child.title}</h3><p>{child.text}</p></li>)}</ul> : null}
    </article>)}</div>
    <p className="hard-skills-source">工作范围见<Link href="/resume#projects">简历中的项目经历 ↗</Link>。</p>
  </section>;
}

export default async function HardSkillsPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartShell
    active="/hard-skills"
    title="硬实力"
    subtitle="技术领域在上，具体能力在下。"
  ><SkillAreas /></StatechartShell>;

  return <Shell active="hard-skills">
    <section className="page-intro"><div className="eyebrow">ENGINEERING / CAPABILITIES</div><h1>硬实力<span> / 从领域到具体能力</span></h1><p>把 Browser Agent、AI 浏览器和全栈开发中的工作范围放在同一张能力地图里。</p></section>
    <SkillAreas />
  </Shell>;
}
