import type { SkillUsageProject } from './skill-usage-types';

export type CatalogSkill = {
  name: string; group: string; category: string; summary: string;
  source: string; sourceUrl: string; scope: string; projects?: string; usage?: string;
};
export type CatalogSkillRow = {
  id: string; name: string; category: string; installed: boolean;
  triggerCount: number; projectIds: string[]; searchText: string; catalog?: CatalogSkill;
};
export type CatalogProjectRow = SkillUsageProject & { skillNames: string[]; searchText: string };
