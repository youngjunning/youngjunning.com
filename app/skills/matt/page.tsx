import { presentSkillCatalog } from '@/lib/site-skill-catalog';
import { getSiteTheme } from '@/lib/site-theme';
import { StatechartSkills } from '@/components/statechart/pages';
import type { Metadata } from 'next';
import Shell from '@/components/shell';
import SkillCatalog from '@/components/lucian/skill-workspace';
import catalog from '@/content/matt-skills.json';

export const metadata: Metadata = { title: 'Matt Pocock · 技能体系的基石', description: 'Matt Pocock 技能专区：引入状态、安装范围、项目使用约定与历史安装记录。' };

export default async function MattSkillsPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartSkills skills={presentSkillCatalog(catalog.skills)} updatedAt={catalog.updatedAt} matt />;
  return <Shell active="skills"><SkillCatalog skills={presentSkillCatalog(catalog.skills)} updatedAt={catalog.updatedAt} matt /></Shell>;
}
