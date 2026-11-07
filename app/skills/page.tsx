import { presentSkillCatalog } from '@/lib/site-skill-catalog';
import { siteProfile } from '@/lib/site-profile.mjs';
import { getSiteTheme } from '@/lib/site-theme';
import { StatechartSkills } from '@/components/statechart/pages';
import type { Metadata } from 'next';
import Shell from '@/components/shell';
import SkillCatalog from '@/components/lucian/skill-workspace';
import catalog from '@/content/skills.json';
import usage from '@/content/skill-usage.json';
import { validateSkillUsage } from '@/lib/skill-usage.mjs';

export const metadata: Metadata = {
  title: 'Skills',
  description: `${siteProfile.name}的 Agent Skills 清单：自己维护的工作流，以及引入的社区技能。`,
};

export default async function SkillsPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartSkills skills={presentSkillCatalog(catalog.skills)} updatedAt={catalog.updatedAt} />;
  return <Shell active="skills">
    <SkillCatalog skills={presentSkillCatalog(catalog.skills)} updatedAt={catalog.updatedAt} usage={validateSkillUsage(usage)} />
  </Shell>;
}
