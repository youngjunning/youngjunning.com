/** @typedef {import('./skill-catalog-types').CatalogSkill} CatalogSkill */
/** @typedef {import('./skill-catalog-types').CatalogSkillRow} SkillRow */
/** @typedef {import('./skill-catalog-types').CatalogProjectRow} ProjectRow */
/** @typedef {import('./skill-usage-types').SkillUsageStore} Usage */

export const normalizeSkillSearch = value => value.normalize('NFKC').toLocaleLowerCase('zh-CN').trim();

/** Join by stable IDs: project names may repeat. Installation and observed usage
 * are independent; absent observations never imply execution or adoption.
 * @param {CatalogSkill[]} catalog
 * @param {Usage | undefined} usage
 * @returns {{library: SkillRow[], activity: SkillRow[], projects: ProjectRow[]}}
 */
export function buildSkillWorkspace(catalog, usage) {
  const catalogByName = new Map(catalog.map(skill => [skill.name, skill]));
  const observations = new Map(usage?.skills.map(skill => [skill.name, skill]) ?? []);
  const projects = new Map(usage?.projects.map(project => [project.id, project]) ?? []);
  function row(name) {
    const skill = catalogByName.get(name), observation = observations.get(name);
    const projectIds = observation?.projects.map(project => project.projectId) ?? [];
    return {
      id: name, name, catalog: skill, category: skill ? skill.group === 'self' ? '个人维护' : skill.category : '历史技能',
      installed: Boolean(skill && Boolean(skill.scope) && !['未引入', '未安装', '未登记安装范围'].includes(skill.scope)), triggerCount: observation?.triggerCount ?? 0, projectIds,
      searchText: normalizeSkillSearch([name, skill?.summary, skill?.source, skill?.category, skill?.scope,
        skill?.projects, skill?.usage, skill?.group === 'self' ? '自己维护' : '',
        ...projectIds.map(id => projects.get(id)?.name)].filter(Boolean).join(' ')),
    };
  }
  return {
    library: catalog.map(skill => row(skill.name)),
    activity: (usage?.skills ?? []).map(skill => row(skill.name)),
    projects: (usage?.projects ?? []).map(project => {
      const skillNames = (usage?.skills ?? []).filter(skill => skill.projects.some(item => item.projectId === project.id)).map(skill => skill.name);
      return { ...project, skillNames, searchText: normalizeSkillSearch([project.name, ...skillNames].join(' ')) };
    }),
  };
}

/** Sorting copies input so switching views cannot reorder another view.
 * @template {SkillRow | ProjectRow} T
 * @param {T[]} rows
 * @param {string} query
 * @param {string} order
 * @returns {T[]}
 */
export function searchAndSortSkills(rows, query, order) {
  const terms = normalizeSkillSearch(query).split(/\s+/).filter(Boolean);
  return rows.filter(row => terms.every(term => row.searchText.includes(term))).sort((a, b) => {
    const groups = row => 'projectIds' in row ? row.projectIds.length : row.skillNames.length;
    const primary = order === 'count' ? b.triggerCount - a.triggerCount : order === 'groups' ? groups(b) - groups(a) : 0;
    return primary || a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id);
  });
}
