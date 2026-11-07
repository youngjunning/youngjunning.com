import type { CatalogSkill } from './skill-catalog-types';

export function presentSkillCatalog(items: unknown[]): CatalogSkill[] {
  return items.map(value => {
    const item = value as Record<string, unknown>;
    const text = (key: string) => typeof item[key] === 'string' ? item[key] as string : '';
    const group = text('group') || 'adopted';
    return {
      name: text('name'), summary: text('summary'), group,
      category: text('category') || (group === 'self' ? '个人维护' : '社区引入'),
      scope: text('scope') || '未登记安装范围',
      source: text('source') || text('sourceUrl') || '原始来源未登记',
      sourceUrl: text('sourceUrl'),
      projects: Array.isArray(item.projects) ? item.projects.filter(value => typeof value === 'string').join('；') : text('projects'),
      usage: text('usage'),
    };
  });
}
