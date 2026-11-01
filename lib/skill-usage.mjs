const metric = 'verified_skill_read_turns';
const kinds = new Set(['git', 'directory', 'unknown']);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const sum = rows => rows.reduce((total, row) => total + row.triggerCount, 0);
function check(value, message) { if (!value) throw new Error('Invalid skill usage: ' + message); }
function label(value) { return typeof value === 'string' && value.length > 0 && value.length <= 180 && !/[\/\\\u0000-\u001f]|:\/\//.test(value); }
function keys(value, allowed) { check(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key)), 'unexpected fields'); }

export function validateSkillUsage(store) {
  keys(store, ['version', 'updatedAt', 'metric', 'totals', 'coverage', 'skills', 'projects']);
  check(store.version === 1 && store.metric === metric, 'version or metric');
  check(typeof store.updatedAt === 'string' && Number.isFinite(Date.parse(store.updatedAt)), 'updatedAt');
  keys(store.totals, ['triggerCount', 'skillCount', 'projectCount', 'directoryGroupCount', 'unattributedTriggers', 'ambiguousTriggers', 'pendingBackfillObservations']);
  check(Object.values(store.totals).every(integer), 'totals');
  keys(store.coverage, ['fileCount', 'firstSeen', 'lastSeen']);
  check(integer(store.coverage.fileCount), 'file count');
  for (const date of [store.coverage.firstSeen, store.coverage.lastSeen]) check(date === null || (typeof date === 'string' && Number.isFinite(Date.parse(date))), 'date');
  check(Array.isArray(store.skills) && Array.isArray(store.projects), 'arrays');
  const projects = new Map();
  for (const project of store.projects) {
    keys(project, ['id', 'name', 'kind', 'triggerCount']);
    check(/^(?:git|directory):[a-f0-9]{16}$|^unknown$/.test(project.id) && !projects.has(project.id), 'project ID');
    check(label(project.name) && kinds.has(project.kind) && project.id.split(':')[0] === project.kind && integer(project.triggerCount), 'project');
    projects.set(project.id, { ...project, count: 0 });
  }
  const names = new Set();
  for (const skill of store.skills) {
    keys(skill, ['name', 'triggerCount', 'projects']);
    check(label(skill.name) && /^[\w:.-]+$/.test(skill.name) && !names.has(skill.name) && integer(skill.triggerCount) && Array.isArray(skill.projects), 'skill');
    names.add(skill.name);
    const seen = new Set();
    for (const item of skill.projects) {
      keys(item, ['projectId', 'triggerCount']);
      const project = projects.get(item.projectId);
      check(project && !seen.has(item.projectId) && integer(item.triggerCount), 'skill project reference');
      seen.add(item.projectId);
      project.count += item.triggerCount;
    }
    check(sum(skill.projects) === skill.triggerCount, 'skill cross total');
  }
  check([...projects.values()].every(p => p.count === p.triggerCount), 'project cross total');
  check(sum(store.skills) === store.totals.triggerCount && sum(store.projects) === store.totals.triggerCount, 'global cross total');
  check(store.skills.length === store.totals.skillCount && store.projects.filter(p => p.kind === 'git').length === store.totals.projectCount && store.projects.filter(p => p.kind === 'directory').length === store.totals.directoryGroupCount, 'group counts');
  check(sum(store.projects.filter(p => p.kind !== 'git')) === store.totals.unattributedTriggers && store.totals.ambiguousTriggers <= store.totals.unattributedTriggers, 'unattributed counts');
  return store;
}

function mergeProjects(store, merges) {
  const projects = new Map(store.projects.map(project => [project.id, project]));
  const aliases = new Map();
  const targets = new Set(merges.map(merge => merge.targetId));
  for (const { targetId, sourceIds } of merges) {
    check(Array.isArray(sourceIds), 'merge source IDs');
    for (const id of sourceIds) {
      check(!targets.has(id) && !aliases.has(id), 'overlapping project merges');
      aliases.set(id, targetId);
      if (!projects.has(id)) continue;
      check(projects.get(id).kind === 'directory' && projects.get(targetId)?.kind === 'git', 'merge requires a directory clue and an existing Git target');
    }
  }
  for (const skill of store.skills) {
    const counts = new Map();
    for (const { projectId, triggerCount } of skill.projects) {
      const id = aliases.get(projectId) ?? projectId;
      counts.set(id, (counts.get(id) ?? 0) + triggerCount);
    }
    skill.projects = [...counts].map(([projectId, triggerCount]) => ({ projectId, triggerCount }));
  }
  for (const [id, targetId] of aliases) {
    if (!projects.has(id)) continue;
    projects.get(targetId).triggerCount += projects.get(id).triggerCount;
    projects.delete(id);
  }
  store.projects = [...projects.values()].sort((a, b) => b.triggerCount - a.triggerCount || a.id.localeCompare(b.id));
  store.totals.projectCount = store.projects.filter(p => p.kind === 'git').length;
  store.totals.directoryGroupCount = store.projects.filter(p => p.kind === 'directory').length;
  store.totals.unattributedTriggers = sum(store.projects.filter(p => p.kind !== 'git'));
  return store;
}

function excludeProjects(store, excludedProjectIds) {
  check(Array.isArray(excludedProjectIds) && excludedProjectIds.every(id => typeof id === 'string' && /^git:[a-f0-9]{16}$/.test(id)) && new Set(excludedProjectIds).size === excludedProjectIds.length, 'excluded Git project IDs');
  if (!excludedProjectIds.length) return store;
  const excluded = new Set(excludedProjectIds);
  store.projects = store.projects.filter(project => !excluded.has(project.id));
  store.skills = store.skills.flatMap(skill => {
    const projects = skill.projects.filter(project => !excluded.has(project.projectId));
    const triggerCount = sum(projects);
    return triggerCount ? [{ ...skill, projects, triggerCount }] : [];
  });
  store.totals.triggerCount = sum(store.skills);
  store.totals.skillCount = store.skills.length;
  store.totals.projectCount = store.projects.filter(project => project.kind === 'git').length;
  return store;
}

export function projectSkillUsage(source, previous = null, now = new Date().toISOString(), merges = [], excludedProjectIds = []) {
  check(source.metric === metric && source.scan?.scanComplete === true && Array.isArray(source.scan.errors) && source.scan.errors.length === 0, 'successful current scan required');
  const attribution = source.projectAttribution;
  const skills = source.skills.map(s => ({ name: s.name, triggerCount: s.triggerCount,
    projects: s.projects.map(p => ({ projectId: p.projectId, triggerCount: p.triggerCount })) }));
  const starts = source.skills.map(s => s.firstSeen).filter(Boolean).sort();
  const ends = source.skills.map(s => s.lastSeen).filter(Boolean).sort();
  const store = { version: 1, updatedAt: now, metric,
    totals: { triggerCount: source.triggerCount, skillCount: source.skillCount, projectCount: attribution.projectCount,
      directoryGroupCount: attribution.directoryGroupCount, unattributedTriggers: attribution.unattributedTriggers,
      ambiguousTriggers: attribution.ambiguousTriggers, pendingBackfillObservations: attribution.pendingBackfillObservations },
    coverage: { fileCount: source.files, firstSeen: starts[0] ?? null, lastSeen: ends.at(-1) ?? null },
    skills, projects: attribution.projects.map(p => ({ id: p.id, name: p.name, kind: p.kind, triggerCount: p.triggerCount })) };
  validateSkillUsage(store);
  if (merges.length) validateSkillUsage(mergeProjects(store, merges));
  validateSkillUsage(excludeProjects(store, excludedProjectIds));
  if (previous) {
    validateSkillUsage(previous);
    if (JSON.stringify({ ...store, updatedAt: null }) === JSON.stringify({ ...previous, updatedAt: null })) return previous;
    check(Date.parse(now) >= Date.parse(previous.updatedAt), 'stale scan cannot replace a newer snapshot');
  }
  return store;
}
